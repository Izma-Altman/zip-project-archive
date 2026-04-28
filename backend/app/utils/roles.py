from functools import wraps
from flask import abort
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.models.user import User

def role_required(*allowed_roles):
    # Custom decorator for Role-Based Access Control (RBAC).
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user:
                abort(401, description="User not found")

            if user.role not in allowed_roles:
                abort(403, description="Forbidden: insufficient role")

            return fn(*args, **kwargs)
        return wrapper
    return decorator
