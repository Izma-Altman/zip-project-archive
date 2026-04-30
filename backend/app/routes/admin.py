import pandas as pd
import re
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.roles import role_required
from app.models.project import Project
from app.models.user import User
from app.extensions import db
from uuid import uuid4
from io import BytesIO

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

@admin_bp.route("/download-template/<template_type>", methods=["GET"])
def download_template(template_type):
    output = BytesIO()
    
    if template_type == "projects":
        df = pd.DataFrame(columns=["title", "student_email", "student_name", "project_type", "year", "sem"])
        filename = "Project_Upload_Template.xlsx"
    elif template_type == "faculty":
        df = pd.DataFrame(columns=["name", "email"])
        filename = "Faculty_Upload_Template.xlsx"
    else:
        return {"error": "Invalid template type"}, 400

    df.to_excel(output, index=False, engine='openpyxl') 
    output.seek(0)
    
    return send_file(
        output, 
        download_name=filename, 
        as_attachment=True, 
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@admin_bp.route("/users", methods=["GET"])
@role_required("ADMIN")
def list_users():
    current_admin_id = get_jwt_identity()
    
    # 2. Fetch everyone who is an ADMIN or FACULTY, EXCEPT the current user
    users = User.query.filter(
        User.role.in_(["ADMIN", "FACULTY"]),
        User.id != current_admin_id
    ).all()
    
    return jsonify([
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "department": u.department # Added department so the table looks nice!
        }
        for u in users
    ])

@admin_bp.route("/users/<user_id>/role", methods=["PUT"])
@role_required("ADMIN")
def update_user_role(user_id):
    data = request.get_json()
    new_role = data.get("role")

    if new_role not in ["ADMIN", "FACULTY", "STUDENT"]:
        return {"error": "Invalid role"}, 400

    user = User.query.get(user_id)
    if not user:
        return {"error": "User not found"}, 404

    user.role = new_role
    db.session.commit()

    return {"message": "Role updated successfully"}

@admin_bp.route("/upload-approved-projects", methods=["POST"])
@role_required("ADMIN", "FACULTY") # ✅ Cleaned using decorator
def upload_approved_projects():
    file = request.files.get("excel")
    if not file:
        return {"error": "Excel file required"}, 400

    try:
        df = pd.read_excel(file)
    except Exception as e:
        return {"error": f"Invalid Excel file: {str(e)}"}, 400

    required_columns = {"title", "student_email", "student_name", "year", "sem", "project_type"}
    if not required_columns.issubset(df.columns):
        return {
            "error": "Excel must contain 'title', 'student_email', 'student_name', 'year', 'sem', and 'project_type' columns"
        }, 400

    added = 0
    skipped = 0

    from app.models.detail import Details

    for index, row in df.iterrows():
        excel_row = index + 2

        if pd.isna(row.get("title")) or pd.isna(row.get("student_email")) or pd.isna(row.get("student_name")) or pd.isna(row.get("year")) or pd.isna(row.get("sem")):
            return {"error": f"Upload Failed: Row {excel_row} is missing data. All fields except Project Type are compulsory."}, 400

        title = str(row["title"]).strip()
        student_email = str(row["student_email"]).strip().lower()
        student_name = str(row["student_name"]).strip().title()
        
        project_type_raw = str(row.get("project_type", "Unknown")).strip()
        if project_type_raw.lower() == 'nan':
            project_type = "Unknown"
        else:
            project_type = re.sub(r'(?i)\s*project\s*$', '', project_type_raw).strip()
        
        if not title or not student_email or not student_name or title == 'nan' or student_email == 'nan' or student_name == 'nan':
            return {"error": f"Upload Failed: Row {excel_row} has empty text fields. All fields are compulsory."}, 400

        try:
            year = int(row["year"])
            sem = int(row["sem"])
        except ValueError:
            return {"error": f"Upload Failed: Row {excel_row} has invalid numbers for Year or Sem."}, 400

        existing = db.session.query(Project).join(Details, Project.id == Details.id).filter(
            Project.title == title,
            Project.uploaded_by == student_email,
            Details.year == year,
            Details.sem == sem
        ).first()

        if existing:
            skipped += 1
            continue
            
        student = User.query.filter_by(email=student_email).first()
        if not student:
            student = User(
                id=str(uuid4()),
                name=student_name,
                email=student_email,
                role="STUDENT",
                department="CSE"
            )
            db.session.add(student)
            db.session.flush() 

        project = Project(
            id=str(uuid4()),
            title=title,
            uploaded_by=student.email,
            project_type=project_type 
        )
        db.session.add(project)
        db.session.flush() 

        details = Details(
            id=project.id,
            year=year,
            sem=sem
        )
        db.session.add(details)
        
        added += 1

    db.session.commit()
    return {"message": f"Successfully processed. Added: {added}, Skipped (Duplicates): {skipped}"}, 200

@admin_bp.route("/upload-faculty", methods=["POST"])
@role_required("ADMIN") # ✅ Cleaned using decorator
def upload_faculty_list():
    # Identify the exact admin currently doing the upload
    current_admin_id = get_jwt_identity()

    file = request.files.get("excel")
    if not file:
        return {"error": "Excel file required"}, 400

    try:
        df = pd.read_excel(file)
    except Exception as e:
        return {"error": f"Invalid Excel file: {str(e)}"}, 400

    required_columns = {"name", "email"} 
    if not required_columns.issubset(df.columns):
        return {
            "error": f"Excel must contain these columns: {', '.join(required_columns)}"
        }, 400

    added = 0
    skipped = 0

    for _, row in df.iterrows():
        name = str(row["name"]).strip()
        email = str(row["email"]).strip().lower()
        department = "CSE"

        if not name or not email or name == 'nan' or email == 'nan':
            continue

        existing_user = User.query.filter_by(email=email).first()
        
        if existing_user:
            # ✅ STRICT SELF-DEMOTION LOCK: Will not convert the uploading Admin to Faculty
            if existing_user.id == current_admin_id:
                skipped += 1
                continue

            # ✅ Will successfully convert ANY OTHER user (including other Admins) to Faculty
            if existing_user.role != "FACULTY":
                existing_user.role = "FACULTY"
                existing_user.department = department
                added += 1
            else:
                skipped += 1
            continue

        # If user does not exist at all, create a new Faculty member
        faculty = User(
            id=str(uuid4()),
            name=name,
            email=email,
            role="FACULTY",
            department=department
        )
        db.session.add(faculty)
        added += 1

    db.session.commit()
    return {"message": f"Successfully processed. Added/Updated: {added}, Skipped: {skipped}"}, 200