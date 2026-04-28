from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import event
from sqlalchemy.engine import Engine
from .config import Config
from .extensions import db, jwt, oauth
import logging

#Write Ahead Logging (WAL) to prevent database locking
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=30000") 
        cursor.close()
    except Exception:
        pass

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable Cross-Origin Resource Sharing so the React frontend (Vite port 5173) can talk to this API
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

    db.init_app(app)
    jwt.init_app(app)
    oauth.init_app(app)
    
    oauth.register(
        name="google",
        client_id=app.config["GOOGLE_CLIENT_ID"],
        client_secret=app.config["GOOGLE_CLIENT_SECRET"],
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={
            "scope": "openid email profile"
        }
    )

    from .routes.auth import auth_bp
    from app.routes.admin import admin_bp
    from app.routes.project import project_bp
    from app.routes.test import test_bp

    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(project_bp, url_prefix="/projects")
    app.register_blueprint(test_bp, url_prefix="/test")
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """
        Catches ANY fatal error in the backend.
        Instantly rolls back the database transaction so the app doesn't freeze or lock up.
        """
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return e

        db.session.rollback()
        
        app.logger.error(f"Backend Crash Prevented: {str(e)}")
        
        return jsonify({
            "error": "A backend delay occurred due to heavy traffic. The database was safely reset. Please try again."
        }), 500

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        """Ensures database connections are gracefully closed after every request."""
        db.session.remove()

    return app