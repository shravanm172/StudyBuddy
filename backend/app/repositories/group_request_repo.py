# app/repositories/group_request_repo.py
from typing import List, Optional, Dict, Any
from sqlalchemy.exc import IntegrityError
from app import db
from app.models.group_request import GroupRequest, GroupRequestStatus
from app.models.group import Group, GroupMember, GroupRole, GroupPrivacy

class GroupRequestRepo:
    
    @staticmethod
    def create_join_request(requester_uid: str, group_id: int, message: str = None) -> Dict[str, Any]:
        """
        Create a join request for a group.
        For PUBLIC groups: Auto-accept and add user immediately.
        For PRIVATE groups: Create pending request for admin approval.
        
        Args:
            requester_uid: Firebase UID of user requesting to join
            group_id: ID of the group to join
            message: Optional message with the request
            
        Returns:
            Dict with success status, message, and request info
        """
        try:
            # Check if group exists and is visible
            group = Group.query.get(group_id)
            if not group:
                return {
                    "success": False,
                    "error": "Group not found"
                }
            
            if not group.is_visible:
                return {
                    "success": False,
                    "error": "Cannot join a group that is not visible"
                }
            
            # Check if user is already a member
            existing_member = GroupMember.query.filter_by(
                group_id=group_id,
                user_uid=requester_uid
            ).first()
            
            if existing_member:
                return {
                    "success": False,
                    "error": "You are already a member of this group"
                }
            
            # Check if there's already a pending request
            existing_request = GroupRequest.query.filter_by(
                requester_uid=requester_uid,
                group_id=group_id,
                status=GroupRequestStatus.PENDING
            ).first()
            
            if existing_request:
                return {
                    "success": False,
                    "error": "You already have a pending request for this group"
                }
            
            # Handle based on group privacy
            if group.privacy == GroupPrivacy.PUBLIC:
                # Public group: Auto-accept by adding user directly
                from app.repositories.group_repo import GroupRepo
                success = GroupRepo.add_member(group_id, requester_uid, GroupRole.MEMBER)
                
                if success:
                    return {
                        "success": True,
                        "message": "Successfully joined the public group!",
                        "auto_accepted": True
                    }
                else:
                    return {
                        "success": False,
                        "error": "Failed to join the group"
                    }
            
            else:
                # Private group: Create pending request
                request = GroupRequest(
                    requester_uid=requester_uid,
                    group_id=group_id,
                    status=GroupRequestStatus.PENDING,
                    message=message
                )
                
                db.session.add(request)
                db.session.commit()
                
                return {
                    "success": True,
                    "message": "Join request sent! Wait for admin approval.",
                    "request": request.to_dict(),
                    "auto_accepted": False
                }
                
        except IntegrityError as e:
            db.session.rollback()
            return {
                "success": False,
                "error": "Request already exists"
            }
        except Exception as e:
            db.session.rollback()
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
    
    @staticmethod
    def get_pending_requests_for_group(group_id: int) -> List[Dict[str, Any]]:
        """Get all pending join requests for a group with user profile data."""
        try:
            from app.repositories.user_repo import UserRepo
            
            requests = GroupRequest.query.filter_by(
                group_id=group_id,
                status=GroupRequestStatus.PENDING
            ).order_by(GroupRequest.created_at.desc()).all()
            
            # Enrich each request with user profile data
            enriched_requests = []
            for request in requests:
                request_dict = request.to_dict()
                
                # Get user profile data
                user_profile = UserRepo.get_user(request.requester_uid)
                if user_profile:
                    request_dict['requester_profile'] = user_profile
                else:
                    # Fallback if profile not found
                    request_dict['requester_profile'] = {
                        'uid': request.requester_uid,
                        'username': f'User_{request.requester_uid[:8]}',
                        'email': 'Unknown',
                        'grade': 'Unknown',
                        'gender': 'Unknown',
                        'courses': []
                    }
                
                enriched_requests.append(request_dict)
            
            return enriched_requests
            
        except Exception as e:
            print(f"Error getting pending requests for group: {e}")
            return []
    
    @staticmethod
    def get_user_pending_requests(user_uid: str) -> List[Dict[str, Any]]:
        """Get all pending requests sent by a user."""
        try:
            requests = GroupRequest.query.filter_by(
                requester_uid=user_uid,
                status=GroupRequestStatus.PENDING
            ).order_by(GroupRequest.created_at.desc()).all()
            
            return [request.to_dict() for request in requests]
            
        except Exception as e:
            print(f"Error getting user pending requests: {e}")
            return []
    
    @staticmethod
    def respond_to_request(request_id: int, admin_uid: str, accept: bool) -> Dict[str, Any]:
        """
        Admin responds to a join request (accept/reject).
        
        Args:
            request_id: ID of the group request
            admin_uid: Firebase UID of the admin responding
            accept: True to accept, False to reject
            
        Returns:
            Dict with success status and message
        """
        try:
            # Get the request
            request = GroupRequest.query.get(request_id)
            if not request:
                return {
                    "success": False,
                    "error": "Request not found"
                }
            
            if request.status != GroupRequestStatus.PENDING:
                return {
                    "success": False,
                    "error": "Request has already been processed"
                }
            
            # Verify admin has permission
            from app.repositories.group_repo import GroupRepo
            if not GroupRepo.is_admin(request.group_id, admin_uid):
                return {
                    "success": False,
                    "error": "Only group admins can respond to join requests"
                }
            
            if accept:
                # Accept: Add user to group and mark request as accepted
                success = GroupRepo.add_member(request.group_id, request.requester_uid, GroupRole.MEMBER)
                
                if success:
                    request.status = GroupRequestStatus.ACCEPTED
                    db.session.commit()
                    
                    return {
                        "success": True,
                        "message": "Join request accepted and user added to group"
                    }
                else:
                    return {
                        "success": False,
                        "error": "Failed to add user to group"
                    }
            else:
                # Reject: Just mark request as rejected
                request.status = GroupRequestStatus.REJECTED
                db.session.commit()
                
                return {
                    "success": True,
                    "message": "Join request rejected"
                }
                
        except Exception as e:
            db.session.rollback()
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
    
    @staticmethod
    def get_request_by_id(request_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific group request by ID."""
        try:
            request = GroupRequest.query.get(request_id)
            return request.to_dict() if request else None
            
        except Exception as e:
            print(f"Error getting request by ID: {e}")
            return None