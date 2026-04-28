from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User

test_bp = Blueprint("test", __name__)

@test_bp.route("/protected")
@jwt_required()
def protected():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    return jsonify({
        "message": "JWT works!",
        "user_id": user_id,
        "email": user.email,
        "role": user.role,
        "name": user.name
    })
