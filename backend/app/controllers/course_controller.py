"""
Course Controller
Handles course-related endpoints.

Routes:
GET /api/courses/available/ - List all courses to choose from (public)
GET /api/courses/           - List all courses of user (authenticated)
"""

from flask import Blueprint, request, jsonify
from app.models.user import Course

bp = Blueprint('courses', __name__, url_prefix='/api/courses')

@bp.route("/available/", methods=["GET", "OPTIONS"])
def get_available_courses():
    """Public endpoint to fetch all courses to choose from"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    try:
        courses = Course.query.all()
        
        course_list = [
            {
                "course_id": course.course_id,
                "title": course.title
            }
            for course in courses
        ]
        
        return jsonify({"courses": course_list}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/", methods=["GET", "OPTIONS"])
def get_courses():
    """Get all courses of user - requires authentication."""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    auth_header = request.headers.get("Authorization", "")
    
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        user_uid = decoded.get("uid")
    except Exception as e:
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        courses = Course.query.all()
        
        course_list = [
            {
                "course_id": course.course_id,
                "title": course.title
            }
            for course in courses
        ]
        
        return jsonify({"courses": course_list}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500