# app/controllers/group_request_controller.py
from flask import Blueprint, request, jsonify
from app.repositories.group_request_repo import GroupRequestRepo

bp = Blueprint("group_requests", __name__, url_prefix="/api/group-requests")


@bp.route("/", methods=["POST", "OPTIONS"])
def create_join_request():
    """Create a join request for a group"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print("📝 === CREATE GROUP JOIN REQUEST ===")
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        requester_uid = decoded.get("uid")
        print(f"✅ Token verified! Requester UID: {requester_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    # Get request data
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No request data provided"}), 400
        
        group_id = data.get("group_id")
        message = data.get("message", "")
        
        if not group_id:
            return jsonify({"error": "group_id is required"}), 400
            
        print(f"📝 User {requester_uid} requesting to join group {group_id}")
        print(f"📝 Message: {message}")
        
    except Exception as e:
        print(f"❌ Error parsing request data: {e}")
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Create the join request
        result = GroupRequestRepo.create_join_request(requester_uid, group_id, message)
        
        if result["success"]:
            print(f"✅ {result['message']}")
            return jsonify({
                "success": True,
                "message": result["message"],
                "auto_accepted": result.get("auto_accepted", False),
                "request": result.get("request")
            }), 200
        else:
            print(f"❌ Join request failed: {result['error']}")
            return jsonify({
                "success": False,
                "error": result["error"]
            }), 400
            
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/group/<int:group_id>/", methods=["GET", "OPTIONS"])
def get_group_pending_requests(group_id):
    """Get all pending join requests for a group (admin only)"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print(f"📋 === GET PENDING REQUESTS FOR GROUP {group_id} ===")
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        admin_uid = decoded.get("uid")
        print(f"✅ Token verified! Admin UID: {admin_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        # Verify admin permissions
        from app.repositories.group_repo import GroupRepo
        if not GroupRepo.is_admin(group_id, admin_uid):
            return jsonify({"error": "Only group admins can view join requests"}), 403
        
        # Get pending requests
        requests = GroupRequestRepo.get_pending_requests_for_group(group_id)
        
        print(f"✅ Found {len(requests)} pending requests for group {group_id}")
        return jsonify({
            "requests": requests
        }), 200
        
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:request_id>/respond/", methods=["POST", "OPTIONS"])
def respond_to_request(request_id):
    """Admin responds to a join request (accept/reject)"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print(f"✅❌ === RESPOND TO REQUEST {request_id} ===")
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        admin_uid = decoded.get("uid")
        print(f"✅ Token verified! Admin UID: {admin_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    # Get request data
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No request data provided"}), 400
        
        accept = data.get("accept")
        if accept is None:
            return jsonify({"error": "accept field is required (true/false)"}), 400
            
        print(f"✅❌ Admin {admin_uid} {'accepting' if accept else 'rejecting'} request {request_id}")
        
    except Exception as e:
        print(f"❌ Error parsing request data: {e}")
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Respond to the request
        result = GroupRequestRepo.respond_to_request(request_id, admin_uid, accept)
        
        if result["success"]:
            print(f"✅ {result['message']}")
            return jsonify({
                "success": True,
                "message": result["message"]
            }), 200
        else:
            print(f"❌ Response failed: {result['error']}")
            return jsonify({
                "success": False,
                "error": result["error"]
            }), 400
            
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/my-requests/", methods=["GET", "OPTIONS"])
def get_my_pending_requests():
    """Get all pending requests sent by the current user"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print("📋 === GET MY PENDING REQUESTS ===")
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        user_uid = decoded.get("uid")
        print(f"✅ Token verified! User UID: {user_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        # Get user's pending requests
        requests = GroupRequestRepo.get_user_pending_requests(user_uid)
        
        print(f"✅ Found {len(requests)} pending requests for user {user_uid}")
        return jsonify({
            "requests": requests
        }), 200
        
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500