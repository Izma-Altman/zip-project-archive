from datetime import datetime
from app.extensions import db

class Details(db.Model):
    __tablename__ = "details"

    id = db.Column(
        db.String(36),
        db.ForeignKey("projects.id"),
        primary_key=True
    )
    year = db.Column(db.Integer, nullable=False) 
    sem = db.Column(db.Integer, nullable=False)
    tech = db.Column(db.Text, nullable=True)
    upvotes = db.Column(db.Integer, default=0)
    views = db.Column(db.Integer, default=0)
    project = db.relationship("Project", backref=db.backref("details", uselist=False))

    def __repr__(self):
        return f"<Details {self.id}>"
    

class Upvote(db.Model):
    __tablename__ = "upvotes"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    __table_args__ = (db.UniqueConstraint('user_id', 'project_id', name='_user_project_uc'),)

class Collaborator(db.Model):
    __tablename__ = "collaborators"
    id = db.Column(db.String(36), primary_key=True)
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    user_email = db.Column(db.String(120), nullable=False)

class ActionLog(db.Model):
    __tablename__ = "action_logs"
    id = db.Column(db.String(36), primary_key=True)
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    user_email = db.Column(db.String(120), nullable=False)
    action = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)