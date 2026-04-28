from uuid import uuid4
from app.extensions import db

class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    title = db.Column(db.String(200), nullable=False)
    abstract = db.Column(db.Text, nullable=True)
    report = db.Column(db.String(300), nullable=True)
    code = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    title_embedding = db.Column(db.JSON, nullable=True)     
    abstract_embedding = db.Column(db.JSON, nullable=True)  
    project_type = db.Column(db.String(50), nullable=True)

    uploaded_by = db.Column(
        db.String(120),
        db.ForeignKey("users.email"),
        nullable=False
    )
    
    def __repr__(self):
        return f"<Project {self.title}>"