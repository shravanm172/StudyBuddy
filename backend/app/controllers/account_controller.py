from flask import Blueprint, jsonify, request, g
from datetime import datetime
from app.firebase_auth import firebase_auth_required
from app.repositories.user_repo import UserRepo

bp = Blueprint("account", __name__, url_prefix="/api/account")


@bp.get("/profile")
@firebase_auth_required
def get_profile():
    data = UserRepo.get_user(g.firebase_uid)
    if not data:
        return jsonify({"error": "User not found"}), 404

    # Convert date_of_birth to ISO string for JSON
    dob = data.get("date_of_birth")
    if dob is not None:
        data["date_of_birth"] = dob.isoformat()

    return jsonify(data), 200


@bp.put("/profile")
@firebase_auth_required
def update_profile():
    payload = request.get_json() or {}

    dob_str = payload.get("date_of_birth")
    grade = payload.get("grade")
    gender = payload.get("gender")
    courses = payload.get("courses", [])

    # BASIC VALIDATION
    if not dob_str or not grade or not gender:
        return jsonify({"error": "date_of_birth, grade, and gender are required"}), 400

    # Enforce business rule: must be enrolled in at least 2 courses
    cleaned_courses = [
        c for c in courses if isinstance(c, str) and c.strip() != ""
    ]
    if len(cleaned_courses) < 2:
        return jsonify({
            "error": "You must be enrolled in at least two courses to use StudyBuddy."
        }), 400

    # Parse DOB
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date_of_birth format, expected YYYY-MM-DD"}), 400

    profile = {
        "date_of_birth": dob,
        "grade": grade,
        "gender": gender,
    }

    try:
        # Reuse upsert method; email comes from token
        UserRepo.create_user_with_profile(
            uid=g.firebase_uid,
            email=g.firebase_email,
            profile=profile,
            courses=cleaned_courses,
        )
        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to update profile"}), 500
