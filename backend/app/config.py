import os
from datetime import timedelta

class Config:
    JWT_SECRET_KEY = "dev-secret-key-123"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1) 
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = "sqlite:///zip.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
    ALLOWED_DOMAIN = os.environ.get("ALLOWED_DOMAIN")

    ROLE_ADMIN = "ADMIN"
    ROLE_FACULTY = "FACULTY"
    ROLE_STUDENT = "STUDENT"

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "..", "uploads", "projects")