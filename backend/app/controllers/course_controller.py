# app/controllers/course_controller.py
from flask import Blueprint, request, jsonify
from app.models.user import Course

# Create Blueprint
bp = Blueprint('courses', __name__, url_prefix='/api/courses')

@bp.route("/", methods=["GET", "OPTIONS"])
def get_courses():
    """Get all available courses"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print("📚 === GET ALL COURSES ===")
    
    # Get and verify Firebase token (optional for courses)
    auth_header = request.headers.get("Authorization", "")
    print(f"🔑 Auth header present: {bool(auth_header)}")
    
    if not auth_header.startswith("Bearer "):
        print("❌ Invalid authorization header format")
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    print(f"🎫 Extracted token length: {len(token)}")
    
    try:
        from firebase_admin import auth as firebase_auth
        print("🔍 Verifying Firebase token...")
        decoded = firebase_auth.verify_id_token(token)
        user_uid = decoded.get("uid")
        print(f"✅ Token verified! User UID: {user_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        print("📚 Getting all courses...")
        courses = Course.query.all()
        
        course_list = [
            {
                "course_id": course.course_id,
                "title": course.title
            }
            for course in courses
        ]
        
        print(f"✅ Found {len(course_list)} courses")
        return jsonify({
            "courses": course_list
        }), 200
        
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500