# app/controllers/group_controller.py
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
    
    print("🔗 === GET SHARED GROUP MEMBERSHIPS RECEIVED ===")
    
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
        user_uid = decoded.get("uid")
        print(f"✅ Token verified! User UID: {user_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        print(f"🔍 Getting shared memberships for user {user_uid}...")
        
        # Get all groups the user is a member of
        user_groups = GroupRepo.get_user_groups(user_uid)
        print(f"📋 User is in {len(user_groups)} groups")
        
        # For each group, get all other members
        shared_memberships = {}  # uid -> True if they share any groups
        
        for group in user_groups:
            group_members = GroupRepo.get_group_members(group['id'])
            print(f"👥 Group {group['id']} has {len(group_members)} members")
            
            # Add all other members to shared memberships
            for member in group_members:
                if member['user_uid'] != user_uid:  # Don't include self
                    shared_memberships[member['user_uid']] = True
        
        # Convert to list of UIDs
        shared_user_uids = list(shared_memberships.keys())
        
        print(f"✅ Found {len(shared_user_uids)} users with shared group memberships")
        return jsonify({
            "shared_memberships": shared_user_uids
        }), 200
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:group_id>/", methods=["GET", "OPTIONS"])
def get_group_details(group_id):
    """Get detailed information about a specific group including members"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print(f"📋 === GET GROUP DETAILS {group_id} RECEIVED ===")
    
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
        user_uid = decoded.get("uid")
        print(f"✅ Token verified! User UID: {user_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        print(f"🔍 Getting group details for group {group_id}...")
        
        # Check if user is a member of this group
        if not GroupRepo.is_member(group_id, user_uid):
            print(f"❌ User {user_uid} is not a member of group {group_id}")
            return jsonify({"error": "You are not a member of this group"}), 403
        
        # Get group details
        group_data = GroupRepo.get_group(group_id)
        if not group_data:
            print(f"❌ Group {group_id} not found")
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
        
        print(f"✅ Found group with {len(enriched_members)} members")
        return jsonify({
            "group": group_data
        }), 200
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/user-groups/", methods=["GET", "OPTIONS"])
def get_user_groups():
    """Get all groups that the current user belongs to"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print("📋 === GET USER GROUPS RECEIVED ===")
    
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
        user_uid = decoded.get("uid")
        print(f"✅ Token verified! User UID: {user_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    try:
        print(f"📋 Getting groups for user {user_uid}...")
        user_groups = GroupRepo.get_user_groups(user_uid)
        
        print(f"✅ Found {len(user_groups)} groups")
        return jsonify({
            "groups": user_groups
        }), 200
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500