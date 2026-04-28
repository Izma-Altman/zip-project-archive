from flask import Blueprint, url_for, redirect, jsonify, current_app
from app.extensions import oauth, db
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity,create_access_token

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login")
def login():
    redirect_uri = url_for("auth.callback", _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route("/callback")
def callback():
    try:
        token = oauth.google.authorize_access_token()

        resp = oauth.google.get(
            "https://www.googleapis.com/oauth2/v3/userinfo"
        )
        user_info = resp.json()

        email = user_info.get("email")
        name = user_info.get("name")

        frontend_url = "http://localhost:5173"

        allowed_domain = current_app.config.get("ALLOWED_DOMAIN")
        if allowed_domain and not email.endswith(allowed_domain):
            return redirect(f"{frontend_url}/oauth/error?reason=unauthorized_domain")

        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(
                name=name,
                email=email,
                role="STUDENT",
                department="CSE"
            )
            db.session.add(user)
            db.session.commit()

        access_token = create_access_token(identity=user.id)

        return redirect(f"{frontend_url}/oauth/success?token={access_token}")
    
    except Exception as e:
        return redirect("http://localhost:5173/oauth/error?reason=login_failed")