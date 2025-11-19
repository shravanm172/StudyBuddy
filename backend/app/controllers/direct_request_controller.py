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
    
    print("📤 === SEND REQUEST RECEIVED ===")
    
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
        sender_uid = decoded.get("uid")
        print(f"✅ Token verified! Sender UID: {sender_uid}")
    except Exception as e:
        print(f"❌ Token verification error: {e}")
        return jsonify({"error": f"Invalid or expired Firebase token: {str(e)}"}), 401

    # Get request data
    data = request.get_json()
    print("📦 Request JSON data:", data)
    
    receiver_uid = data.get("receiver_uid")
    message = data.get("message", "")
    print(f"📝 Request data - To: {receiver_uid}, Message: {message}")

    # Validation
    if not receiver_uid:
        print("❌ Missing receiver_uid")
        return jsonify({"error": "Missing receiver_uid"}), 400

    # Verify receiver exists
    receiver = UserRepo.get_user(receiver_uid)
    if not receiver:
        print(f"❌ Receiver {receiver_uid} not found")
        return jsonify({"error": "Receiver user not found"}), 404

    try:
        print("💾 Creating direct request...")
        direct_request = DirectRequestRepo.create_request(sender_uid, receiver_uid, message)
        print("✅ Request sent successfully!")
        
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
        print(f"💥 Validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/incoming/", methods=["GET", "OPTIONS"])
def get_incoming_requests():
    """Get user's incoming direct requests"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print("📥 === GET INCOMING REQUESTS RECEIVED ===")
    
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
        # Get status filter from query params
        status_param = request.args.get("status")
        status_filter = None
        if status_param:
            try:
                status_filter = RequestStatus(status_param)
            except ValueError:
                return jsonify({"error": f"Invalid status: {status_param}"}), 400

        print(f"🔍 Getting incoming requests for {user_uid} with status filter: {status_filter}")
        incoming_requests = DirectRequestRepo.get_user_incoming_requests(user_uid, status_filter)
        
        # Enrich with sender details
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
        
        print(f"✅ Found {len(enriched_requests)} incoming requests")
        return jsonify({"requests": enriched_requests}), 200
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/outgoing/", methods=["GET", "OPTIONS"])
def get_outgoing_requests():
    """Get user's outgoing direct requests"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print("📤 === GET OUTGOING REQUESTS RECEIVED ===")
    
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
        # Get status filter from query params
        status_param = request.args.get("status")
        status_filter = None
        if status_param:
            try:
                status_filter = RequestStatus(status_param)
            except ValueError:
                return jsonify({"error": f"Invalid status: {status_param}"}), 400

        print(f"🔍 Getting outgoing requests for {user_uid} with status filter: {status_filter}")
        outgoing_requests = DirectRequestRepo.get_user_outgoing_requests(user_uid, status_filter)
        
        # Enrich with receiver details
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
        
        print(f"✅ Found {len(enriched_requests)} outgoing requests")
        return jsonify({"requests": enriched_requests}), 200
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:request_id>/accept/", methods=["PUT", "OPTIONS"])
def accept_request(request_id):
    """Accept an incoming direct request"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print(f"✅ === ACCEPT REQUEST {request_id} RECEIVED ===")
    
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
        print(f"💾 Accepting request {request_id}...")
        updated_request = DirectRequestRepo.update_request_status(
            request_id, 
            RequestStatus.ACCEPTED, 
            user_uid=user_uid
        )
        
        if not updated_request:
            print(f"❌ Request {request_id} not found")
            return jsonify({"error": "Request not found"}), 404
        
        # Get sender and receiver details
        sender = UserRepo.get_user(updated_request.sender_uid)
        receiver = UserRepo.get_user(updated_request.receiver_uid)
        
        # Create a private study group with sender as admin
        print(f"🏗️ Creating private study group...")
        group_name = f"@{sender['username'] if sender else 'Unknown'} & @{receiver['username'] if receiver else 'Unknown'}"
        group_description = f"Private study group created from study buddy request."
        
        # Create group with sender as admin
        created_group = GroupRepo.create_group(
            name=group_name,
            admin_uid=updated_request.sender_uid,  # Sender becomes admin
            description=group_description,
            is_visible=False,  # Private - not visible on public feed
            privacy=GroupPrivacy.PRIVATE  # Admin approval required for new members
        )
        
        if created_group:
            # Add receiver as member to the group
            GroupRepo.add_member(
                group_id=created_group['id'],
                user_uid=updated_request.receiver_uid  # Receiver becomes member
            )
            print(f"✅ Created private study group {created_group['id']} for accepted request")
        else:
            print("⚠️ Failed to create study group, but request was accepted")
        
        print("✅ Request accepted successfully!")
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
        
        # Include group info if created successfully
        if created_group:
            response_data["group"] = {
                "id": created_group["id"],
                "name": created_group["name"],
                "description": created_group["description"]
            }
        
        return jsonify(response_data), 200
    except ValueError as e:
        print(f"💥 Permission/validation error: {e}")
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:request_id>/reject/", methods=["PUT", "OPTIONS"])
def reject_request(request_id):
    """Reject an incoming direct request"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print(f"❌ === REJECT REQUEST {request_id} RECEIVED ===")
    
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
        print(f"💾 Rejecting request {request_id}...")
        updated_request = DirectRequestRepo.update_request_status(
            request_id, 
            RequestStatus.REJECTED, 
            user_uid=user_uid
        )
        
        if not updated_request:
            print(f"❌ Request {request_id} not found")
            return jsonify({"error": "Request not found"}), 404
        
        print("✅ Request rejected successfully!")
        return jsonify({
            "message": "Request rejected successfully",
            "request": {
                "id": updated_request.id,
                "status": updated_request.status.value,
                "updated_at": updated_request.updated_at.isoformat()
            }
        }), 200
    except ValueError as e:
        print(f"💥 Permission/validation error: {e}")
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:request_id>/", methods=["DELETE", "OPTIONS"])
def cancel_request(request_id):
    """Cancel an outgoing direct request"""
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return "", 200
    
    print(f"🗑️ === CANCEL REQUEST {request_id} RECEIVED ===")
    
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
        print(f"💾 Cancelling request {request_id}...")
        success = DirectRequestRepo.cancel_request(request_id, user_uid)
        
        if not success:
            print(f"❌ Request {request_id} not found")
            return jsonify({"error": "Request not found"}), 404
        
        print("✅ Request cancelled successfully!")
        return jsonify({"message": "Request cancelled successfully"}), 200
    except ValueError as e:
        print(f"💥 Permission/validation error: {e}")
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        print(f"💥 Database error: {e}")
        return jsonify({"error": str(e)}), 500