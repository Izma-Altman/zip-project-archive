from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from authlib.integrations.flask_client import OAuth

db = SQLAlchemy()
jwt = JWTManager()
oauth = OAuth()
