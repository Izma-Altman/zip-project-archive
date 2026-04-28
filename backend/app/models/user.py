from uuid import uuid4
from app.extensions import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False)
    department = db.Column(db.String(50))
    projects = db.relationship("Project",backref="uploader",lazy=True)


    def __repr__(self):
        return f"<User {self.email}>"
