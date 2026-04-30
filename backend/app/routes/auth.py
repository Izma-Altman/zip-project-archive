from flask import Blueprint, url_for, redirect, jsonify, current_app, request
from app.extensions import oauth, db
from app.models.user import User
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login")
def login():
    # Cleaned out the override logic entirely
    redirect_uri = url_for("auth.callback", _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route("/callback")
def callback():
    try:
        token = oauth.google.authorize_access_token()
        resp = oauth.google.get("https://www.googleapis.com/oauth2/v3/userinfo")
        user_info = resp.json()

        email = user_info.get("email")
        name = user_info.get("name")

        allowed_domain = current_app.config.get("ALLOWED_DOMAIN")
        if allowed_domain:
            domain_list = [d.strip() for d in allowed_domain.split(",")]
            if email.split("@")[1] not in domain_list:
                return redirect("https://project-achive.vercel.app/?reason=unauthorized_domain")

        user = User.query.filter_by(email=email).first()
        if not user:
            # Everyone defaults to STUDENT now securely
            user = User(
                name=name, email=email,
                role="STUDENT",
                department="CSE"
            )
            db.session.add(user)
                
        db.session.commit()

        # Generate the token
        access_token = create_access_token(identity=user.id)
        
        frontend_url = "https://project-achive.vercel.app"
        return redirect(f"{frontend_url}/?token={access_token}")

    except Exception as e:
        print(f"OAuth Error: {e}")
        return redirect("https://project-achive.vercel.app/?reason=login_failed")