"""
Direct Request Repository
Handles direct study buddy request operations

Methods:
- create_request(sender_uid, receiver_uid, message)      - Create a new study buddy (direct) request
- get_user_incoming_requests(uid, status)                - Get direct requests received by user
- get_user_outgoing_requests(uid, status)                - Get direct requests sent by user
- update_request_status(request_id, new_status, user_uid) - Accept or reject a direct request
- cancel_request(request_id, sender_uid)                 - Cancel a sent direct request
- get_request_by_id(request_id)                          - Fetch a specific direct request
- get_request_between_users(uid1, uid2)                  - Check for existing direct request between two users
"""

from app import db
from app.models.direct_request import DirectRequest, RequestStatus
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_


class DirectRequestRepo:
    @staticmethod
    def create_request(sender_uid, receiver_uid, message=None):
        """
        Create a new direct request between two users.

        """
        # Prevent self-requests
        if sender_uid == receiver_uid:
            raise ValueError("Cannot send request to yourself")
        
        # Prevent duplicate pending requests from the same sender to the same receiver
        existing_pending = DirectRequest.query.filter(
            DirectRequest.sender_uid == sender_uid,
            DirectRequest.receiver_uid == receiver_uid,
            DirectRequest.status == RequestStatus.PENDING
        ).first()
        
        if existing_pending:
            raise ValueError("You already have a pending request to this user")
        
        try:
            request = DirectRequest(
                sender_uid=sender_uid,
                receiver_uid=receiver_uid,
                message=message,
                status=RequestStatus.PENDING
            )
            db.session.add(request)
            db.session.commit()
            return request
        except IntegrityError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_user_incoming_requests(uid, status=None):
        """
        Get all incoming requests for a user.

        """
        query = DirectRequest.query.filter_by(receiver_uid=uid)
        
        if status:
            query = query.filter_by(status=status)
        
        return query.order_by(DirectRequest.created_at.desc()).all()

    @staticmethod
    def get_user_outgoing_requests(uid, status=None):
        """
        Get all outgoing requests for a user.
        
        """
        query = DirectRequest.query.filter_by(sender_uid=uid)
        
        if status:
            query = query.filter_by(status=status)
        
        return query.order_by(DirectRequest.created_at.desc()).all()

    @staticmethod
    def update_request_status(request_id, new_status, user_uid=None):
        """
        Update the status of a request.
    
        """
        request = DirectRequest.query.get(request_id)
        if not request:
            return None
        
        # Verify permission if user_uid provided
        if user_uid:
            if new_status in [RequestStatus.ACCEPTED, RequestStatus.REJECTED]:
                # Only receiver of the request can accept or reject it
                if request.receiver_uid != user_uid:
                    raise ValueError("Only the request receiver can accept or reject requests")
            elif new_status == RequestStatus.PENDING:
                if request.sender_uid != user_uid:
                    raise ValueError("Invalid permission for this status change")
        
        # Validate status transitions
        if request.status == RequestStatus.ACCEPTED:
            raise ValueError("Cannot change status of already accepted request")
        if request.status == RequestStatus.REJECTED and new_status != RequestStatus.PENDING:
            raise ValueError("Cannot change status of rejected request except back to pending")
        
        try:
            request.status = new_status
            db.session.commit()
            return request
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def cancel_request(request_id, sender_uid):
        """
        Cancel (delete) an outgoing pending request. Only the sender can cancel.
        
        """
        request = DirectRequest.query.get(request_id)
        if not request:
            return False
        
        # Verify permission - only sender can cancel
        if request.sender_uid != sender_uid:
            raise ValueError("Only the request sender can cancel requests")
        
        # Can only cancel pending requests
        if request.status != RequestStatus.PENDING:
            raise ValueError("Can only cancel pending requests")
        
        try:
            db.session.delete(request)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_request_by_id(request_id):
        """
        Get a request by its ID.

        """
        return DirectRequest.query.get(request_id)

    @staticmethod
    def get_request_between_users(uid1, uid2):
        """
        Get any existing request between two users (in either direction).
        
        """
        return DirectRequest.query.filter(
            or_(
                and_(DirectRequest.sender_uid == uid1, DirectRequest.receiver_uid == uid2),
                and_(DirectRequest.sender_uid == uid2, DirectRequest.receiver_uid == uid1)
            )
        ).first()