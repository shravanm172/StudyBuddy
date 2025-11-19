from app import db
from app.models.direct_request import DirectRequest, RequestStatus
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_


class DirectRequestRepo:
    @staticmethod
    def create_request(sender_uid, receiver_uid, message=None):
        """
        Create a new direct request between two users.
        
        Args:
            sender_uid: UID of the user sending the request
            receiver_uid: UID of the user receiving the request
            message: Optional message with the request
            
        Returns:
            DirectRequest object if successful
            
        Raises:
            ValueError: If trying to send request to self or duplicate request exists
            IntegrityError: If database constraint violation
        """
        # Prevent self-requests
        if sender_uid == receiver_uid:
            raise ValueError("Cannot send request to yourself")
        
        # Only prevent duplicate PENDING requests from the same sender to the same receiver
        # Rejected requests should not block new requests
        existing_pending = DirectRequest.query.filter(
            DirectRequest.sender_uid == sender_uid,
            DirectRequest.receiver_uid == receiver_uid,
            DirectRequest.status == RequestStatus.PENDING
        ).first()
        
        if existing_pending:
            raise ValueError("You already have a pending request to this user")
        
        # Also check if there's an accepted request in either direction
        existing_accepted = DirectRequest.query.filter(
            or_(
                and_(DirectRequest.sender_uid == sender_uid, DirectRequest.receiver_uid == receiver_uid),
                and_(DirectRequest.sender_uid == receiver_uid, DirectRequest.receiver_uid == sender_uid)
            ),
            DirectRequest.status == RequestStatus.ACCEPTED
        ).first()
        
        if existing_accepted:
            raise ValueError("You are already connected with this user")
        
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
        
        Args:
            uid: User ID
            status: Optional status filter (RequestStatus enum)
            
        Returns:
            List of DirectRequest objects with sender info
        """
        query = DirectRequest.query.filter_by(receiver_uid=uid)
        
        if status:
            query = query.filter_by(status=status)
        
        return query.order_by(DirectRequest.created_at.desc()).all()

    @staticmethod
    def get_user_outgoing_requests(uid, status=None):
        """
        Get all outgoing requests for a user.
        
        Args:
            uid: User ID
            status: Optional status filter (RequestStatus enum)
            
        Returns:
            List of DirectRequest objects with receiver info
        """
        query = DirectRequest.query.filter_by(sender_uid=uid)
        
        if status:
            query = query.filter_by(status=status)
        
        return query.order_by(DirectRequest.created_at.desc()).all()

    @staticmethod
    def update_request_status(request_id, new_status, user_uid=None):
        """
        Update the status of a request.
        
        Args:
            request_id: ID of the request to update
            new_status: New RequestStatus
            user_uid: Optional UID to verify user has permission to update
            
        Returns:
            DirectRequest object if successful, None if not found
            
        Raises:
            ValueError: If user doesn't have permission or invalid status transition
        """
        request = DirectRequest.query.get(request_id)
        if not request:
            return None
        
        # Verify permission if user_uid provided
        if user_uid:
            if new_status in [RequestStatus.ACCEPTED, RequestStatus.REJECTED]:
                # Only receiver can accept/reject
                if request.receiver_uid != user_uid:
                    raise ValueError("Only the request receiver can accept or reject requests")
            elif new_status == RequestStatus.PENDING:
                # This shouldn't normally happen, but if it does, only sender can do it
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
        
        Args:
            request_id: ID of the request to cancel
            sender_uid: UID of the user trying to cancel (must be the sender)
            
        Returns:
            True if successful, False if request not found
            
        Raises:
            ValueError: If user doesn't have permission or request cannot be cancelled
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
        
        Args:
            request_id: ID of the request
            
        Returns:
            DirectRequest object or None if not found
        """
        return DirectRequest.query.get(request_id)

    @staticmethod
    def get_request_between_users(uid1, uid2):
        """
        Get any existing request between two users (in either direction).
        
        Args:
            uid1: First user UID
            uid2: Second user UID
            
        Returns:
            DirectRequest object or None if no request exists
        """
        return DirectRequest.query.filter(
            or_(
                and_(DirectRequest.sender_uid == uid1, DirectRequest.receiver_uid == uid2),
                and_(DirectRequest.sender_uid == uid2, DirectRequest.receiver_uid == uid1)
            )
        ).first()