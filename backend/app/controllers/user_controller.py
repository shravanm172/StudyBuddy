from flask import Blueprint, request, jsonify, g
from flask_cors import cross_origin
from datetime import datetime
from app.repositories.user_repo import UserRepo
from app.firebase_auth import firebase_auth_required
from app.models.user import Gender, Grade

bp = Blueprint("user", __name__, url_prefix="/api/users")


@bp.route("/", methods=["POST", "OPTIONS"])
def create_user():
    """Create a new user - extracts UID from Firebase token for verification"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
        
    print("🔥 === USER CREATION REQUEST RECEIVED ===")
    
    # Log request headers
    print("📋 Request headers:")
    for key, value in request.headers:
        if key.lower() == 'authorization':
            print(f"  {key}: Bearer {value[7:27]}..." if len(value) > 27 else f"  {key}: {value}")
        else:
            print(f"  {key}: {value}")
    
    # Log request data
    data = request.get_json()
    print("📦 Request JSON data:", data)
    
    # Get and verify Firebase token 
    auth_header = request.headers.get("Authorization", "")
    print(f"🔑 Auth header present: {bool(auth_header)}")
    
    if not auth_header.startswith("Bearer "):
        print("❌ Invalid authorization header format")
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    print(f"🎫 Extracted token length: {len(token)}")
    
    try:
        # Import here to avoid circular imports
        from firebase_admin import auth as firebase_auth
        print("🔍 Verifying Firebase token...")
        decoded = firebase_auth.verify_id_token(token)
        firebase_uid = decoded.get("uid")
        firebase_email = decoded.get("email")
        print(f"✅ Token verified! Firebase UID: {firebase_uid}, Email: {firebase_email}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    uid = data.get("uid")
    username = data.get("username")
    email = data.get("email")
    print(f"📋 Payload UID: {uid}, Username: {username}, Email: {email}")

    # Verify the provided UID matches the Firebase token
    if uid != firebase_uid:
        print(f"❌ UID mismatch! Payload: {uid}, Firebase: {firebase_uid}")
        return jsonify({"error": "UID mismatch with Firebase token"}), 400

    dob_str = data.get("date_of_birth")
    grade = data.get("grade")
    gender = data.get("gender")
    courses = data.get("courses", [])
    print(f"📝 Profile data - DOB: {dob_str}, Grade: {grade}, Gender: {gender}, Courses: {courses}")

    # Validation
    if not uid or not email or not username:
        print("❌ Missing UID, email, or username")
        return jsonify({"error": "Missing UID, email, or username"}), 400
    if not dob_str:
        print("❌ Missing date_of_birth")
        return jsonify({"error": "Missing date_of_birth"}), 400
    if not grade or not gender:
        print("❌ Missing grade or gender")
        return jsonify({"error": "Missing grade or gender"}), 400
    if not courses:
        print("❌ Missing courses")
        return jsonify({"error": "At least one course required"}), 400

    # Validate enums
    try:
        grade_enum = Grade(grade)
        gender_enum = Gender(gender)
        print(f"✅ Enum validation passed - Grade: {grade_enum}, Gender: {gender_enum}")
    except ValueError as e:
        print(f"❌ Invalid enum value: {e}")
        valid_grades = [g.value for g in Grade]
        valid_genders = [g.value for g in Gender]
        return jsonify({
            "error": f"Invalid enum value: {str(e)}",
            "valid_grades": valid_grades,
            "valid_genders": valid_genders
        }), 400

    # Check if username is already taken
    if UserRepo.is_username_taken(username, exclude_uid=uid):
        print(f"❌ Username '{username}' is already taken")
        return jsonify({"error": f"Username '{username}' is already taken"}), 409

    # parse YYYY-MM-DD -> date
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        print(f"📅 Parsed date of birth: {dob}")
    except ValueError as e:
        print(f"❌ Invalid date format: {e}")
        return jsonify({"error": "Invalid date_of_birth format, expected YYYY-MM-DD"}), 400

    profile = {
        "date_of_birth": dob,
        "grade": grade,  # Will be converted to enum in repo
        "gender": gender,  # Will be converted to enum in repo
    }
    print(f"👤 Creating profile: {profile}")

    try:
        print("💾 Calling UserRepo.create_user_with_profile...")
        UserRepo.create_user_with_profile(uid, username, email, profile, courses)
        print("✅ User created successfully!")
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/me/", methods=["GET", "OPTIONS"])
def get_me():
    """Get current user's profile data"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print("🔍 === GET /me REQUEST RECEIVED ===")
    
    # Get and verify Firebase token 
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
        firebase_uid = decoded.get("uid")
        firebase_email = decoded.get("email")
        print(f"✅ Token verified! Firebase UID: {firebase_uid}, Email: {firebase_email}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401
    
    try:
        # Get user profile data from database
        user_data = UserRepo.get_user(firebase_uid)
        if user_data:
            print(f"✅ User profile found: {user_data}")
            return jsonify(user_data), 200
        else:
            print(f"❌ No profile found for UID: {firebase_uid}")
            return jsonify({"error": "User profile not found"}), 404
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/enums/", methods=["GET", "OPTIONS"])
def get_enums():
    """Get valid enum values for grade and gender"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    try:
        return jsonify({
            "grades": [{"value": grade.value, "label": grade.value.replace("_", " ").title()} for grade in Grade],
            "genders": [{"value": gender.value, "label": gender.value.replace("_", " ").title()} for gender in Gender]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/check-username/<username>", methods=["GET", "OPTIONS"])
def check_username(username):
    """Check if username is available"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    try:
        is_taken = UserRepo.is_username_taken(username)
        return jsonify({
            "username": username,
            "available": not is_taken,
            "taken": is_taken
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/", methods=["PUT", "OPTIONS"])
def update_user():
    """Update user profile including username"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print("🔄 === USER UPDATE REQUEST RECEIVED ===")
    
    # Get and verify Firebase token 
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
        firebase_uid = decoded.get("uid")
        firebase_email = decoded.get("email")
        print(f"✅ Token verified! Firebase UID: {firebase_uid}, Email: {firebase_email}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    # Get request data
    data = request.get_json()
    print("📦 Update request JSON data:", data)
    
    username = data.get("username")
    dob_str = data.get("date_of_birth")
    grade = data.get("grade")
    gender = data.get("gender")
    courses = data.get("courses", [])
    print(f"📝 Update data - Username: {username}, DOB: {dob_str}, Grade: {grade}, Gender: {gender}, Courses: {courses}")

    # Validation
    if not username or not dob_str or not grade or not gender:
        print("❌ Missing required fields")
        return jsonify({"error": "Missing required fields: username, date_of_birth, grade, gender"}), 400
    if not courses:
        print("❌ Missing courses")
        return jsonify({"error": "At least one course required"}), 400

    # Validate enums
    try:
        grade_enum = Grade(grade)
        gender_enum = Gender(gender)
        print(f"✅ Enum validation passed - Grade: {grade_enum}, Gender: {gender_enum}")
    except ValueError as e:
        print(f"❌ Invalid enum value: {e}")
        valid_grades = [g.value for g in Grade]
        valid_genders = [g.value for g in Gender]
        return jsonify({
            "error": f"Invalid enum value: {str(e)}",
            "valid_grades": valid_grades,
            "valid_genders": valid_genders
        }), 400

    # Check if username is already taken by another user
    if UserRepo.is_username_taken(username, exclude_uid=firebase_uid):
        print(f"❌ Username '{username}' is already taken by another user")
        return jsonify({"error": f"Username '{username}' is already taken"}), 409

    # Parse date
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        print(f"📅 Parsed date of birth: {dob}")
    except ValueError as e:
        print(f"❌ Invalid date format: {e}")
        return jsonify({"error": "Invalid date_of_birth format, expected YYYY-MM-DD"}), 400

    profile = {
        "date_of_birth": dob,
        "grade": grade,  # Will be converted to enum in repo
        "gender": gender,  # Will be converted to enum in repo
    }
    print(f"👤 Updating profile: {profile}")

    try:
        print("💾 Calling UserRepo.create_user_with_profile for update...")
        UserRepo.create_user_with_profile(firebase_uid, username, firebase_email, profile, courses)
        print("✅ User updated successfully!")
        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/all/", methods=["GET", "OPTIONS"])
def get_all_users():
    """Get all users for people feed (excluding current user)"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print("👥 === GET ALL USERS REQUEST RECEIVED ===")
    
    # Get and verify Firebase token 
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
        firebase_uid = decoded.get("uid")
        print(f"✅ Token verified! Firebase UID: {firebase_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401
    
    try:
        # Get all users except the current user
        all_users = UserRepo.get_all_users(exclude_uid=firebase_uid)
        print(f"✅ Found {len(all_users)} users")
        return jsonify({"users": all_users}), 200
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500
