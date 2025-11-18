from flask import Blueprint, request, jsonify
from app.repositories.user_repo import UserRepo

bp = Blueprint("user", __name__)

@bp.route("/api/users", methods=["POST"])
def create_user():
    data = request.get_json()
    uid = data.get("uid")
    email = data.get("email")
    profile = {
        "age": data.get("age"),
        "grade": data.get("grade"),
        "school": data.get("school"),
        "gender": data.get("gender")
    }
    courses = data.get("courses", [])

    if not uid or not email:
        return jsonify({"error": "Missing UID or email"}), 400
    if not courses:
        return jsonify({"error": "At least one course required"}), 400

    try:
        UserRepo.create_user_with_profile(uid, email, profile, courses)
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
