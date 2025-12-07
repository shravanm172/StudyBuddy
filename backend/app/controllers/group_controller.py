"""
Group Controller
Handles study group operations and management

Routes:
GET     /api/groups/shared-memberships/             - Get users who share group memberships with current user for study buddy suggestions
GET     /api/groups/<id>/                           - Get group details including members
GET     /api/groups/user-groups/                    - Get all groups current user belongs to
POST    /api/groups/<id>/kick/                      - Remove a member from group (admin only)
POST    /api/groups/<id>/courses/                   - Add a course to group (admin only)
DELETE  /api/groups/<id>/courses/<course_id>/       - Remove a course from group (admin only)
PUT     /api/groups/<id>/visibility/                - Toggle group visibility (admin only)
PUT     /api/groups/<id>/info/                      - Update group name and description (admin only)
GET     /api/groups/feed/                           - Get personalized group feed for current user
GET     /api/groups/debug/all-visible/              - Debug endpoint to see all visible groups
GET     /api/groups/<id>/chat/access/               - Verify user has access to group chat
"""

from flask import Blueprint, request, jsonify
from app.repositories.group_repo import GroupRepo
from app.repositories.user_repo import UserRepo
from app.models.group import GroupRole, GroupPrivacy

bp = Blueprint("group", __name__, url_prefix="/api/groups")


@bp.route("/shared-memberships/", methods=["GET", "OPTIONS"])
def get_shared_memberships():
    """Get users that the current user shares group memberships with"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
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
        # Get all groups the user is a member of
        user_groups = GroupRepo.get_user_groups(user_uid)
        
        # For each group, collect all other members
        shared_memberships = {}  # uid -> True if they share any groups
        
        for group in user_groups:
            group_members = GroupRepo.get_group_members(group['id'])
            
            # Add all other members to shared memberships
            for member in group_members:
                if member['user_uid'] != user_uid:  # Don't include self
                    shared_memberships[member['user_uid']] = True
        
        # Convert to list of UIDs
        shared_user_uids = list(shared_memberships.keys())
        
        return jsonify({"shared_memberships": shared_user_uids}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:group_id>/", methods=["GET", "OPTIONS"])
def get_group_details(group_id):
    """Get detailed information about a specific group including members"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        user_uid = decoded.get("uid")
        print(f"Token verified. User UID: {user_uid}")
    except Exception as e:
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        # Check if user is a member of this group
        if not GroupRepo.is_member(group_id, user_uid):
            return jsonify({"error": "You are not a member of this group"}), 403
        
        # Get group details
        group_data = GroupRepo.get_group(group_id)
        if not group_data:
            return jsonify({"error": "Group not found"}), 404
        
        # Get group members with user details
        members = GroupRepo.get_group_members(group_id)
        enriched_members = []
        
        for member in members:
            user_data = UserRepo.get_user(member['user_uid'])
            enriched_member = {
                "user_uid": member['user_uid'],
                "username": user_data['username'] if user_data else "Unknown",
                "role": member['role'],
                "joined_at": member['joined_at']
            }
            enriched_members.append(enriched_member)
        
        # Add enriched members to group data
        group_data['members'] = enriched_members
        
        # Add user's role in this group
        user_member = next((m for m in members if m['user_uid'] == user_uid), None)
        group_data['user_role'] = user_member['role'] if user_member else None
        
        return jsonify({"group": group_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        return jsonify({"error": str(e)}), 500


@bp.route("/user-groups/", methods=["GET", "OPTIONS"])
def get_user_groups():
    """Get all groups that the current user belongs to"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
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
        user_groups = GroupRepo.get_user_groups(user_uid)
        return jsonify({"groups": user_groups}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:group_id>/kick/", methods=["POST", "OPTIONS"])
def kick_member(group_id):
    """Admin kicks/removes a member from the group"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        admin_uid = decoded.get("uid")
    except Exception as e:
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    # Get request data
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No request data provided"}), 400
        
        member_to_kick_uid = data.get("member_uid")
        if not member_to_kick_uid:
            return jsonify({"error": "member_uid is required"}), 400
    except Exception as e:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Perform the kick using GroupRepo
        result = GroupRepo.kick_member(group_id, admin_uid, member_to_kick_uid)
        
        if result["success"]:
            return jsonify({"success": True, "message": result["message"]}), 200
        else:
            return jsonify({"success": False, "error": result["error"]}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:group_id>/courses/", methods=["POST", "OPTIONS"])
def add_course_to_group(group_id):
    """Admin adds a course to the group's study list"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        admin_uid = decoded.get("uid")
        print(f"Token verified. Admin UID: {admin_uid}")
    except Exception as e:
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    # Get request data
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No request data provided"}), 400
        
        course_id = data.get("course_id")
        if not course_id:
            return jsonify({"error": "course_id is required"}), 400
    except Exception as e:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Verify the user is an admin of this group
        admin_member = GroupRepo.get_group_members(group_id)
        is_admin = any(m['user_uid'] == admin_uid and m['role'] == 'admin' for m in admin_member)
        
        if not is_admin:
            return jsonify({"error": "You must be an admin to manage group courses"}), 403
        
        # Add the course
        success = GroupRepo.add_course_to_group(group_id, course_id)
        
        if success:
            return jsonify({"success": True, "message": "Course added to group successfully"}), 200
        else:
            return jsonify({"success": False, "error": "Failed to add course to group"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:group_id>/courses/<course_id>/", methods=["DELETE", "OPTIONS"])
def remove_course_from_group(group_id, course_id):
    """Admin removes a course from the group's study list"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        admin_uid = decoded.get("uid")
    except Exception as e:
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        # Verify the user is an admin of this group
        admin_member = GroupRepo.get_group_members(group_id)
        is_admin = any(m['user_uid'] == admin_uid and m['role'] == 'admin' for m in admin_member)
        
        if not is_admin:
            return jsonify({"error": "You must be an admin to manage group courses"}), 403
        
        # Remove the course
        success = GroupRepo.remove_course_from_group(group_id, course_id)
        
        if success:
            return jsonify({"success": True, "message": "Course removed from group successfully"}), 200
        else:
            return jsonify({"success": False, "error": "Failed to remove course from group"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:group_id>/visibility/", methods=["PUT", "OPTIONS"])
def toggle_group_visibility(group_id):
    """Admin toggles group visibility (with course validation)"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        admin_uid = decoded.get("uid")
        print(f"Token verified. Admin UID: {admin_uid}")
    except Exception as e:
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    # Get request data
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No request data provided"}), 400
        
        is_visible = data.get("is_visible")
        if is_visible is None:
            return jsonify({"error": "is_visible is required"}), 400
    except Exception as e:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Verify the user is an admin of this group
        admin_member = GroupRepo.get_group_members(group_id)
        is_admin = any(m['user_uid'] == admin_uid and m['role'] == 'admin' for m in admin_member)
        
        if not is_admin:
            return jsonify({"error": "You must be an admin to change group visibility"}), 403
        
        # Update the group visibility with validation
        result = GroupRepo.update_group_info(group_id, is_visible=is_visible)
        
        if result["success"]:
            return jsonify({"success": True, "message": result["message"]}), 200
        else:
            return jsonify({"success": False, "error": result["error"]}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:group_id>/info/", methods=["PUT", "OPTIONS"])
def update_group_info(group_id):
    """Admin updates group information (name, description, etc.)"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        admin_uid = decoded.get("uid")
        print(f"Token verified. Admin UID: {admin_uid}")
    except Exception as e:
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    # Get request data
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No request data provided"}), 400
        
        # Extract updateable fields
        name = data.get("name")
        description = data.get("description")
        
        # Validate at least one field is provided
        if name is None and description is None:
            return jsonify({"error": "At least one field (name or description) must be provided"}), 400
        
        # Validate name if provided
        if name is not None:
            name = name.strip()
            if not name:
                return jsonify({"error": "Group name cannot be empty"}), 400
            if len(name) > 100:
                return jsonify({"error": "Group name must be 100 characters or less"}), 400
        
        # Validate description if provided  
        if description is not None:
            description = description.strip()
            if len(description) > 500:
                return jsonify({"error": "Group description must be 500 characters or less"}), 400
    except Exception as e:
        return jsonify({"error": "Invalid request data"}), 400

    try:
        # Verify the user is an admin of this group
        admin_members = GroupRepo.get_group_members(group_id)
        is_admin = any(m['user_uid'] == admin_uid and m['role'] == 'admin' for m in admin_members)
        
        if not is_admin:
            return jsonify({"error": "You must be an admin to update group information"}), 403
        
        # Update the group information
        result = GroupRepo.update_group_info(group_id, name=name, description=description)
        
        if result["success"]:
            return jsonify({"success": True, "message": result["message"]}), 200
        else:
            return jsonify({"success": False, "error": result["error"]}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/feed/", methods=["GET", "OPTIONS"])
def get_group_feed():
    """Get recommended groups for the user based on similar courses studied"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        user_uid = decoded.get("uid")
        print(f"Token verified. User UID: {user_uid}")
    except Exception as e:
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        result = GroupRepo.get_recommended_groups_for_user(user_uid)
        
        # Extract data from the new format
        user_courses = result.get("user_courses", [])
        groups = result.get("groups", [])
        
        return jsonify({"user_courses": user_courses, "groups": groups}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/debug/all-visible/", methods=["GET", "OPTIONS"])
def debug_all_visible_groups():
    """Debug endpoint to see all visible groups in the system"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    try:
        from app.models.group import Group
        
        visible_groups = Group.query.filter_by(is_visible=True).all()
        
        groups_data = []
        for group in visible_groups:
            groups_data.append({
                'id': group.id,
                'name': group.name,
                'is_visible': group.is_visible,
                'privacy': group.privacy.value,
                'course_count': len(group.courses),
                'member_count': len(group.members),
                'courses': [c.course_id for c in group.courses],
                'created_at': group.created_at.isoformat()
            })
        
        return jsonify({
            "success": True,
            "visible_groups": groups_data,
            "total_visible": len(groups_data)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:group_id>/chat/access/", methods=["GET", "OPTIONS"])
def check_chat_access(group_id):
    """Check if the current user has access to this group's chat"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    # Get and verify Firebase token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        user_uid = decoded.get("uid")
        print(f"Token verified. User UID: {user_uid}")
    except Exception as e:
        return jsonify({"error": "Invalid or expired Firebase token"}), 401
    
    try:
        # Check if user is group member
        from app.models.group import GroupMember
        
        member = GroupMember.query.filter_by(
            group_id=group_id,
            user_uid=user_uid
        ).first()
        
        if member:
            return jsonify({
                "has_access": True,
                "role": member.role.value,
                "message": "Chat access granted"
            }), 200
        else:
            return jsonify({
                "has_access": False,
                "message": "You must be a group member to access the chat"
            }), 403
    except Exception as e:
        return jsonify({"error": "Failed to check chat access"}), 500