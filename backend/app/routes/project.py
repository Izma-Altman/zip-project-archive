import os
import re
import json
import shutil
from datetime import datetime
from flask import request, current_app, Blueprint, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
import numpy as np
from sqlalchemy.orm.attributes import flag_modified
from app.utils.roles import role_required
from app.models.project import Project
from app.models.detail import Details, Upvote, Collaborator, ActionLog 
from app.utils.similarity_checker import extract_text_from_pdf, get_embedding
from app.models.user import User
from app.extensions import db
from uuid import uuid4

project_bp = Blueprint("projects", __name__, url_prefix="/projects")

def log_project_action(project_id, email, action_text):
    log = ActionLog(id=str(uuid4()), project_id=project_id, user_email=email, action=action_text)
    db.session.add(log)

@project_bp.route("/my-projects", methods=["GET"])
@jwt_required()
def get_my_projects():
    user = User.query.get(get_jwt_identity())
    
    owned_projects = Project.query.filter(Project.uploaded_by == user.email).all()
    collab_projects = Project.query.join(Collaborator).filter(Collaborator.user_email == user.email).all()
    all_projects = {p.id: p for p in owned_projects + collab_projects}.values()
    
    result = []
    for p in all_projects:
        d = Details.query.get(p.id)
        collabs = [c.user_email for c in Collaborator.query.filter_by(project_id=p.id).all()]
        logs = ActionLog.query.filter_by(project_id=p.id).order_by(ActionLog.timestamp.desc()).all()
        log_data = [{"email": l.user_email, "action": l.action, "timestamp": l.timestamp.isoformat()} for l in logs]
        
        tech_flat = ""
        raw_tech = d.tech if d and d.tech else "{}"
        if d and d.tech:
            try:
                parsed = json.loads(d.tech)
                tech_flat = ", ".join([v for v in parsed.values() if isinstance(v, str) and v.strip()])
            except:
                tech_flat = d.tech
        
        result.append({
            "id": p.id, "title": p.title, "project_type": p.project_type,
            "owner": p.uploaded_by, "is_owner": p.uploaded_by == user.email, 
            "tech": tech_flat, "raw_tech": raw_tech,
            "upvotes": d.upvotes if d and d.upvotes else 0, "views": d.views if d and d.views else 0,
            "collaborators": collabs, "logs": log_data,
            "has_abstract": bool(p.abstract), "has_report": bool(p.report), "has_code": bool(p.code)
        })
    return jsonify(result), 200

@project_bp.route("/<project_id>/view", methods=["POST"])
@jwt_required()
def record_view(project_id):
    details = Details.query.get(project_id)
    if not details:
        details = Details(id=project_id, year=0, sem=0, upvotes=0, views=1)
        db.session.add(details)
    else:
        if details.views is None: details.views = 0
        details.views += 1
    db.session.commit()
    return jsonify({"views": details.views}), 200

@project_bp.route("/<project_id>/collaborator", methods=["POST", "DELETE"])
@jwt_required()
def manage_collaborator(project_id):
    user = User.query.get(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    if project.uploaded_by != user.email: return {"error": "Only the project owner can manage teammates"}, 403
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    if not email or email == project.uploaded_by: return {"error": "Invalid email"}, 400
    collab = Collaborator.query.filter_by(project_id=project_id, user_email=email).first()

    if request.method == "POST":
        if collab: return {"error": "Teammate already added"}, 400
        new_collab = Collaborator(id=str(uuid4()), project_id=project_id, user_email=email)
        db.session.add(new_collab)
        log_project_action(project_id, user.email, f"Added teammate: {email}")
        msg = "Teammate added successfully!"
    elif request.method == "DELETE":
        if not collab: return {"error": "Teammate not found"}, 404
        db.session.delete(collab)
        log_project_action(project_id, user.email, f"Removed teammate: {email}")
        msg = "Teammate removed successfully!"

    db.session.commit()
    return {"message": msg}, 200

@project_bp.route("/search", methods=["GET"])
@jwt_required()

def search_projects():
    # Grab filters from the URL query string (e.g., ?tech=react&year=2024)
    user = User.query.get(get_jwt_identity())
    title_query = request.args.get("title", "")
    type_filter = request.args.get("type", "")
    global_query = request.args.get("q", "")
    tech_filter = request.args.get("tech", "")
    year_filter = request.args.get("year", "")
    sem_filter = request.args.get("sem", "")
    
    # Pre-fetch user upvotes so we know which projects to highlight as "liked" in the UI
    user_upvotes = [u.project_id for u in Upvote.query.filter_by(user_id=user.id).all()]

    # Base query: Join Projects table with Details table
    query_obj = db.session.query(Project, Details).outerjoin(Details, Project.id == Details.id)
    
    # Apply filters conditionally to the query object
    if tech_filter: query_obj = query_obj.filter(Details.tech.ilike(f"%{tech_filter}%"))
    if year_filter: query_obj = query_obj.filter(Details.year == int(year_filter))
    if sem_filter: query_obj = query_obj.filter(Details.sem == int(sem_filter))
    if type_filter and type_filter not in ["All Types", "None"]: query_obj = query_obj.filter(Project.project_type == type_filter)
    
    # Execute query and order by highest upvotes
    if title_query:
        projects = query_obj.filter(Project.title.ilike(f"%{title_query}%")).order_by(db.func.coalesce(Details.upvotes, 0).desc()).all()
    elif global_query or tech_filter or year_filter or sem_filter or (type_filter and type_filter != "None"):
        if global_query: query_obj = query_obj.filter(Project.title.ilike(f"%{global_query}%"))
        query_obj = query_obj.order_by(db.func.coalesce(Details.upvotes, 0).desc())
        projects = query_obj.all()
    else:
        return jsonify([])
        
    results = []
    for p, d in projects:
        tech_flat = ""
        if d and d.tech:
            try:
                parsed = json.loads(d.tech)
                tech_flat = ", ".join([v for v in parsed.values() if isinstance(v, str) and v.strip()])
            except:
                tech_flat = d.tech
                
        results.append({
            "id": p.id, "title": p.title, "project_type": p.project_type, "uploaded_by": p.uploaded_by,
            "year": d.year if d else "N/A", "sem": d.sem if d else "N/A", "tech": tech_flat,
            "raw_tech": d.tech if d and d.tech else "{}", 
            "upvotes": d.upvotes if d and d.upvotes else 0, "views": d.views if d and d.views else 0,
            "is_upvoted": p.id in user_upvotes, "has_abstract": bool(p.abstract),
            "has_report": bool(p.report), "has_code": bool(p.code)
        })
    return jsonify(results), 200

@project_bp.route("/<project_id>/upvote", methods=["POST"])
@jwt_required()
def upvote_project(project_id):
    user = User.query.get(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    details = Details.query.get(project.id)
    
    data = request.get_json(silent=True) or {}
    action = data.get("action", "add")
    
    if not details:
        details = Details(id=project.id, year=0, sem=0, upvotes=0, views=0)
        db.session.add(details)
    if details.upvotes is None: details.upvotes = 0

    existing_upvote = Upvote.query.filter_by(user_id=user.id, project_id=project.id).first()
        
    if action == "remove" and existing_upvote:
        db.session.delete(existing_upvote)
        details.upvotes = max(0, details.upvotes - 1)
    elif action == "add" and not existing_upvote:
        new_upvote = Upvote(user_id=user.id, project_id=project.id)
        db.session.add(new_upvote)
        details.upvotes += 1
            
    db.session.commit()
    return jsonify({"message": "Upvote updated!", "upvotes": details.upvotes}), 200

@project_bp.route("/trends", methods=["GET"])
@jwt_required()
def get_trends():
    details = db.session.query(Details).join(Project, Project.id == Details.id).all()
    CORE_CATS = ["Frontend", "Backend", "Database", "Mobile App", "Cloud & DevOps", "AI Models"]
    LEGACY_CATEGORIES = {
        "Mobile App": ["flutter", "dart", "react native", "kotlin", "swift", "android", "ios", "xamarin"],
        "Frontend": ["react", "vue", "angular", "html", "css", "javascript", "tailwind", "bootstrap", "next", "svelte", "typescript", "ts", "ui", "frontend"],
        "Database": ["sql", "mysql", "mongodb", "postgres", "sqlite", "oracle", "redis", "firebase", "supabase", "mariadb", "db", "cassandra"],
        "Cloud & DevOps": ["aws", "docker", "kubernetes", "azure", "gcp", "vercel", "git", "heroku", "ci/cd", "cloud", "linux", "nginx"],
        "AI Models": ["tensorflow", "pytorch", "keras", "openai", "chatgpt", "gemini", "llama", "huggingface", "scikit-learn", "yolo", "cnn", "nlp", "ai", "ml"],
        "Backend": ["node", "express", "python", "django", "flask", "java", "spring", "php", "c#", ".net", "ruby", "go", "fastapi", "laravel", "backend", "api", "c++"]
    }
    
    def get_legacy_category(tech_name):
        t = tech_name.lower().strip()
        t = t.replace('.js', '').replace('js', '') if (t.endswith('js') and t not in ['js', 'javascript']) else t
        for cat, keywords in LEGACY_CATEGORIES.items():
            if t in keywords: return cat
        for cat, keywords in LEGACY_CATEGORIES.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', t): return cat
        for cat, keywords in LEGACY_CATEGORIES.items():
            for kw in keywords:
                if kw in t:
                    if kw == 'java' and 'javascript' in t: continue
                    if kw == 'react' and 'react native' in t: continue
                    return cat
        return "Other / Miscellaneous"

    trends_by_year = {}
    overall_counts = {}
    
    for d in details:
        if not d.tech or d.tech == "{}": continue
        year = str(d.year) if d.year else "Unknown"
        
        if year not in trends_by_year: 
            trends_by_year[year] = {cat: {} for cat in CORE_CATS}
            trends_by_year[year]["Other / Miscellaneous"] = {}
            
        try:
            parsed_tech = json.loads(d.tech)
            for cat, techs_str in parsed_tech.items():
                if not techs_str or not techs_str.strip(): continue
                mapped_cat = cat
                if cat == "MobileApp": mapped_cat = "Mobile App"
                elif cat == "Cloud": mapped_cat = "Cloud & DevOps"
                elif cat == "AIModels": mapped_cat = "AI Models"
                elif cat not in CORE_CATS: mapped_cat = "Other / Miscellaneous"
                
                raw_techs = re.split(r'[,;/|]', techs_str)
                unique_techs = list(set([t.strip().title() for t in raw_techs if t.strip()]))
                for t in unique_techs:
                    trends_by_year[year][mapped_cat][t] = trends_by_year[year][mapped_cat].get(t, 0) + 1
                    overall_counts[t] = overall_counts.get(t, 0) + 1
        except Exception:
            raw_techs = re.split(r'[,;/|]', d.tech)
            unique_techs = list(set([t.strip().title() for t in raw_techs if t.strip()]))
            for t in unique_techs:
                cat = get_legacy_category(t)
                if cat not in trends_by_year[year]: trends_by_year[year][cat] = {}
                trends_by_year[year][cat][t] = trends_by_year[year][cat].get(t, 0) + 1
                overall_counts[t] = overall_counts.get(t, 0) + 1

    overall_categories = {cat: {} for cat in CORE_CATS}
    overall_categories["Other / Miscellaneous"] = {}
    
    for year, cat_data in trends_by_year.items():
        for cat, techs in cat_data.items():
            for t, count in techs.items():
                overall_categories[cat][t] = overall_categories[cat].get(t, 0) + count

    formatted_overall = {cat: [] for cat in CORE_CATS}
    for cat, tech_counts in overall_categories.items():
        sorted_techs = [{"name": k, "count": v} for k, v in sorted(tech_counts.items(), key=lambda item: item[1], reverse=True)]
        if cat in formatted_overall: formatted_overall[cat] = sorted_techs
        elif sorted_techs: formatted_overall[cat] = sorted_techs

    formatted_trends = []
    for year in sorted(trends_by_year.keys(), reverse=True):
        year_data = {"year": year, "categories": {cat: [] for cat in CORE_CATS}}
        has_any_data = False
        for cat, tech_counts in trends_by_year[year].items():
            sorted_techs = [{"name": k, "count": v} for k, v in sorted(tech_counts.items(), key=lambda item: item[1], reverse=True)]
            if cat in year_data["categories"]:
                year_data["categories"][cat] = sorted_techs
                if sorted_techs: has_any_data = True
            elif sorted_techs:
                year_data["categories"][cat] = sorted_techs
                has_any_data = True
        if has_any_data: formatted_trends.append(year_data)

    top_overall = sorted(overall_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    return jsonify({"total_projects": len(details), "top_overall": [{"name": k, "count": v} for k, v in top_overall], "yearly_trends": formatted_trends, "overall_categories": formatted_overall}), 200

@project_bp.route("/<project_id>/file/<file_type>", methods=["GET"])
@jwt_required()
def get_project_file(project_id, file_type):
    project = Project.query.get_or_404(project_id)
    if file_type == "abstract": path = project.abstract
    elif file_type == "report": path = project.report
    elif file_type == "code": path = project.code
    else: return {"error": "Invalid file type"}, 400
    if not path or not os.path.exists(path): return {"error": "File not found"}, 404
    return send_file(path, as_attachment=(file_type=="code"))

@project_bp.route("/admin-upload", methods=["POST"])
@role_required("ADMIN", "FACULTY")
def admin_smart_upload():
    user = User.query.get(get_jwt_identity())
    
    project_id = request.form.get("project_id")
    title = request.form.get("title")
    tech = request.form.get("tech") 
    year = request.form.get("year")
    sem = request.form.get("sem")
    student_email = request.form.get("student_email")
    
    project_type_raw = request.form.get("project_type")
    if project_type_raw: project_type = re.sub(r'(?i)\s*project\s*$', '', project_type_raw).strip()
    else: project_type = "Unknown"

    if not title: return {"error": "Title is required"}, 400

    if project_id and project_id != "NEW":
        project = Project.query.get_or_404(project_id)
        project.title = title  
        if project_type and project_type != "Unknown": project.project_type = project_type
            
        if student_email and student_email.strip().lower() != project.uploaded_by:
            new_email = student_email.strip().lower()
            student = User.query.filter_by(email=new_email).first()
            if not student:
                student = User(id=str(uuid4()), name=new_email.split('@')[0].title(), email=new_email, role="STUDENT", department="CSE")
                db.session.add(student)
                db.session.flush()
            project.uploaded_by = student.email
        log_project_action(project.id, user.email, "Admin updated project details")
    else:
        if not student_email: return {"error": "Student Email is required for new projects"}, 400
        student = User.query.filter_by(email=student_email).first()
        if not student:
            student = User(id=str(uuid4()), name=student_email.split('@')[0].title(), email=student_email, role="STUDENT", department="CSE")
            db.session.add(student)
            db.session.flush()

        project = Project(id=str(uuid4()), title=title, uploaded_by=student.email, project_type=project_type)
        db.session.add(project)
        db.session.flush()
        log_project_action(project.id, user.email, "Admin created new project")

    details = Details.query.get(project.id)
    if not details:
        details = Details(id=project.id, year=int(year) if year else 0, sem=int(sem) if sem else 0, tech=tech, upvotes=0, views=0)
        db.session.add(details)
    else:
        if year: details.year = int(year)
        if sem: details.sem = int(sem)
        if tech: 
            details.tech = tech
            log_project_action(project.id, user.email, "Admin updated Tech Stack")

    db.session.commit()

    abstract = request.files.get("abstract")
    report = request.files.get("report")
    code = request.files.get("code")

    if abstract or report or code:
        project_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], project.id)
        os.makedirs(project_dir, exist_ok=True)

        if report:
            report_path = os.path.join(project_dir, "report.pdf")
            report.save(report_path)
            project.report = report_path
            log_project_action(project.id, user.email, "Admin uploaded Report")
            
        if code:
            code_path = os.path.join(project_dir, "code.zip")
            code.save(code_path)
            project.code = code_path
            log_project_action(project.id, user.email, "Admin uploaded Source Code")

        if abstract:
            abstract_path = os.path.join(project_dir, "abstract.pdf")
            abstract.save(abstract_path)
            project.abstract = abstract_path
            log_project_action(project.id, user.email, "Admin uploaded Abstract")
            
            if not project.title_embedding:
                title_emb = get_embedding(project.title)
                if title_emb is not None:
                    project.title_embedding = title_emb.tolist()
                    flag_modified(project, "title_embedding") 
            
            extracted_text = extract_text_from_pdf(abstract_path)
            if extracted_text:
                abs_emb = get_embedding(extracted_text)
                if abs_emb is not None:
                    project.abstract_embedding = abs_emb.tolist()
                    flag_modified(project, "abstract_embedding") 

        db.session.commit()

    return {"message": "Project data saved successfully!", "project_id": project.id}, 200

@project_bp.route("/<project_id>", methods=["DELETE"])
@role_required("ADMIN", "FACULTY")
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    project_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], project.id)
    if os.path.exists(project_dir): shutil.rmtree(project_dir)
        
    Upvote.query.filter_by(project_id=project.id).delete()
    ActionLog.query.filter_by(project_id=project.id).delete()
    Collaborator.query.filter_by(project_id=project.id).delete()
    Details.query.filter_by(id=project.id).delete()
    
    db.session.delete(project)
    db.session.commit()
    return {"message": "Project completely deleted"}, 200

@project_bp.route("/<project_id>/upload", methods=["POST"])
@jwt_required()
def upload_project_data(project_id):
    user = User.query.get(get_jwt_identity())
    project = Project.query.get_or_404(project_id)

    is_owner = project.uploaded_by == user.email
    is_collab = Collaborator.query.filter_by(project_id=project.id, user_email=user.email).first() is not None
    
    if user.role == "STUDENT" and not (is_owner or is_collab):
        return {"error": "You do not have permission to edit this project"}, 403

    abstract = request.files.get("abstract")
    report = request.files.get("report")
    code = request.files.get("code")
    tech = request.form.get("tech") 

    if not any([abstract, report, code, tech]): 
        return {"error": "At least one file or a tech stack must be provided"}, 400

    actions_taken = []
        
    if tech:
        details = Details.query.get(project.id)
        if details: 
            details.tech = tech
            actions_taken.append("Tech Stack")

    db.session.commit()

    if abstract or report or code:
        project_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], project.id)
        os.makedirs(project_dir, exist_ok=True)

        if report:
            report_path = os.path.join(project_dir, "report.pdf")
            report.save(report_path)
            project.report = report_path
            actions_taken.append("Report")
            
        if code:
            code_path = os.path.join(project_dir, "code.zip")
            code.save(code_path)
            project.code = code_path
            actions_taken.append("Source Code")

        if abstract:
            abstract_path = os.path.join(project_dir, "abstract.pdf")
            abstract.save(abstract_path)
            project.abstract = abstract_path
            actions_taken.append("Abstract")
            
            if not project.title_embedding:
                title_emb = get_embedding(project.title)
                if title_emb is not None:
                    project.title_embedding = title_emb.tolist()
                    flag_modified(project, "title_embedding") 
            
            extracted_text = extract_text_from_pdf(abstract_path)
            if extracted_text:
                abs_emb = get_embedding(extracted_text)
                if abs_emb is not None:
                    project.abstract_embedding = abs_emb.tolist()
                    flag_modified(project, "abstract_embedding") 
                    
    if actions_taken:
        log_project_action(project.id, user.email, f"Uploaded/Updated: {', '.join(actions_taken)}")

    db.session.commit()

    return {"message": "Project data uploaded successfully", "project_id": project.id}

@project_bp.route("/<project_id>/similarity", methods=["GET"])
@jwt_required()
def check_similarity(project_id):
    user = User.query.get(get_jwt_identity())
    target = Project.query.get_or_404(project_id)
    if not target.abstract_embedding or not target.title_embedding: return {"error": "This project has not generated AI embeddings yet. Re-upload the abstract to generate them."}, 400
        
    others = Project.query.filter(Project.id != project_id, Project.abstract_embedding.isnot(None), Project.title_embedding.isnot(None)).all()
    if not others: return jsonify([]) 
        
    target_title_emb = np.array(target.title_embedding)
    target_abs_emb = np.array(target.abstract_embedding)
    
    results = []
    for p in others:
        p_title_emb = np.array(p.title_embedding)
        p_abs_emb = np.array(p.abstract_embedding)
        title_sim = max(0.0, min(1.0, float(np.dot(target_title_emb, p_title_emb))))
        abs_sim = max(0.0, min(1.0, float(np.dot(target_abs_emb, p_abs_emb))))
        final_score = (title_sim * 0.3) + (abs_sim * 0.7) # Weighted score: The abstract text matters more (70%) than just the title (30%)
        if final_score > 0.55: # Only return matches that are somewhat significant (>55% similarity)
            results.append({
                "id": p.id, "title": p.title, "student": p.uploaded_by,
                "overall_match": round(final_score * 100, 1),
                "title_match": round(title_sim * 100, 1), "abstract_match": round(abs_sim * 100, 1)
            })
        
    results.sort(key=lambda x: x["overall_match"], reverse=True)
    return jsonify(results[:10]), 200