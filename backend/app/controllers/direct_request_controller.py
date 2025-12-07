"""
Direct Request Controller
Handles direct study buddy requests between users.

Routes:
POST    /api/requests/                      - Send a new direct request to another user
GET     /api/requests/incoming/             - Get all incoming direct requests for user
GET     /api/requests/outgoing/             - Get all outgoing direct requests for user
PUT     /api/requests/<id>/accept/          - Accept an incoming direct request and create private study group
PUT     /api/requests/<id>/reject/          - Reject an incoming direct request
DELETE  /api/requests/<id>/                 - Delete a direct request (sender or receiver)
"""

from flask import Blueprint, request, jsonify
from app.repositories.direct_request_repo import DirectRequestRepo
from app.repositories.user_repo import UserRepo
from app.repositories.group_repo import GroupRepo
from app.models.direct_request import RequestStatus
from app.models.group import GroupPrivacy
from app.firebase_auth import firebase_auth_required

bp = Blueprint("direct_request", __name__, url_prefix="/api/requests")


@bp.route("/", methods=["POST", "OPTIONS"])
def send_request():
    """Send a new direct request to another user"""
    
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
        sender_uid = decoded.get("uid")
        print(f"Token verified. Sender UID: {sender_uid}")
    except Exception as e:
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    # Get request data
    data = request.get_json()
    receiver_uid = data.get("receiver_uid")
    message = data.get("message", "")

    # Validation
    if not receiver_uid:
        return jsonify({"error": "Missing receiver_uid"}), 400

    # Verify receiver exists
    receiver = UserRepo.get_user(receiver_uid)
    if not receiver:
        return jsonify({"error": "Receiver user not found"}), 404

    try:
        direct_request = DirectRequestRepo.create_request(sender_uid, receiver_uid, message)
        print("Direct Request sent successfully!")
        
        return jsonify({
            "message": "Request sent successfully",
            "request": {
                "id": direct_request.id,
                "receiver_uid": direct_request.receiver_uid,
                "receiver_username": receiver["username"],
                "message": direct_request.message,
                "status": direct_request.status.value,
                "created_at": direct_request.created_at.isoformat()
            }
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/incoming/", methods=["GET", "OPTIONS"])
def get_incoming_requests():
    """Get user's incoming direct requests"""
    
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
        # optional status filter from query params
        status_param = request.args.get("status")
        status_filter = None
        if status_param:
            try:
                status_filter = RequestStatus(status_param)
            except ValueError:
                return jsonify({"error": f"Invalid status: {status_param}"}), 400

        incoming_requests = DirectRequestRepo.get_user_incoming_requests(user_uid, status_filter)
        
        # add sender details to each request
        enriched_requests = []
        for req in incoming_requests:
            sender = UserRepo.get_user(req.sender_uid)
            enriched_requests.append({
                "id": req.id,
                "sender_uid": req.sender_uid,
                "sender_username": sender["username"] if sender else "Unknown",
                "message": req.message,
                "status": req.status.value,
                "created_at": req.created_at.isoformat(),
                "updated_at": req.updated_at.isoformat()
            })
        
        return jsonify({"requests": enriched_requests}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/outgoing/", methods=["GET", "OPTIONS"])
def get_outgoing_requests():
    """Get user's outgoing direct requests"""
    
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
        # optional status filter from query params
        status_param = request.args.get("status")
        status_filter = None
        if status_param:
            try:
                status_filter = RequestStatus(status_param)
            except ValueError:
                return jsonify({"error": f"Invalid status: {status_param}"}), 400

        outgoing_requests = DirectRequestRepo.get_user_outgoing_requests(user_uid, status_filter)
        
        # add receiver details to each request
        enriched_requests = []
        for req in outgoing_requests:
            receiver = UserRepo.get_user(req.receiver_uid)
            enriched_requests.append({
                "id": req.id,
                "receiver_uid": req.receiver_uid,
                "receiver_username": receiver["username"] if receiver else "Unknown",
                "message": req.message,
                "status": req.status.value,
                "created_at": req.created_at.isoformat(),
                "updated_at": req.updated_at.isoformat()
            })
        
        return jsonify({"requests": enriched_requests}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:request_id>/accept/", methods=["PUT", "OPTIONS"])
def accept_request(request_id):
    """Accept an incoming direct request and create a private study group"""
    
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
        updated_request = DirectRequestRepo.update_request_status(
            request_id, 
            RequestStatus.ACCEPTED, 
            user_uid=user_uid
        )
        
        if not updated_request:
            return jsonify({"error": "Request not found"}), 404
        
        # Get sender and receiver details
        sender = UserRepo.get_user(updated_request.sender_uid)
        receiver = UserRepo.get_user(updated_request.receiver_uid)
        
        # Create private study group
        group_name = f"@{sender['username'] if sender else 'Unknown'} & @{receiver['username'] if receiver else 'Unknown'}"
        group_description = f"Private study group created from study buddy request."
        
        created_group = GroupRepo.create_group(
            name=group_name,
            admin_uid=updated_request.sender_uid,  # Sender becomes admin
            description=group_description,
            is_visible=False,  # not visible on public feed
            privacy=GroupPrivacy.PRIVATE  # Admin approval required for new members
        )
        
        if created_group:
            # Add receiver as member to the group
            GroupRepo.add_member(
                group_id=created_group['id'],
                user_uid=updated_request.receiver_uid
            )
        
        response_data = {
            "message": "Request accepted successfully",
            "request": {
                "id": updated_request.id,
                "sender_uid": updated_request.sender_uid,
                "sender_username": sender["username"] if sender else "Unknown",
                "message": updated_request.message,
                "status": updated_request.status.value,
                "updated_at": updated_request.updated_at.isoformat()
            }
        }
        
        if created_group:
            response_data["group"] = {
                "id": created_group["id"],
                "name": created_group["name"],
                "description": created_group["description"]
            }
        
        return jsonify(response_data), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:request_id>/reject/", methods=["PUT", "OPTIONS"])
def reject_request(request_id):
    """Reject an incoming direct request"""
    
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
        updated_request = DirectRequestRepo.update_request_status(
            request_id, 
            RequestStatus.REJECTED, 
            user_uid=user_uid
        )
        
        if not updated_request:
            return jsonify({"error": "Request not found"}), 404
        
        return jsonify({
            "message": "Request rejected successfully",
            "request": {
                "id": updated_request.id,
                "status": updated_request.status.value,
                "updated_at": updated_request.updated_at.isoformat()
            }
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:request_id>/", methods=["DELETE", "OPTIONS"])
def cancel_request(request_id):
    """Cancel/delete a direct request"""
    
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
        success = DirectRequestRepo.cancel_request(request_id, user_uid)
        
        if not success:
            return jsonify({"error": "Request not found"}), 404
        
        return jsonify({"message": "Request cancelled successfully"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500