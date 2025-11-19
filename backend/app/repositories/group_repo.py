# app/repositories/group_repo.py
from typing import List, Optional, Dict, Any
from sqlalchemy.exc import IntegrityError
from app import db
from app.models.group import Group, GroupMember, GroupRole, GroupPrivacy

class GroupRepo:
    
    @staticmethod
    def create_group(name: str, admin_uid: str, description: str = None, 
                    is_visible: bool = True, privacy: GroupPrivacy = GroupPrivacy.PRIVATE,
                    course_ids: List[str] = None) -> Optional[Dict[str, Any]]:
        """
        Create a new group with the specified admin.
        
        Args:
            name: Group name
            admin_uid: Firebase UID of the group admin
            description: Optional group description
            is_visible: Whether group is visible on group feed
            privacy: Group privacy setting (public/private)
            course_ids: List of course IDs that this group studies
            
        Returns:
            Dictionary representation of created group, or None if creation failed
        """
        try:
            # Create the group
            group = Group(
                name=name,
                description=description,
                is_visible=is_visible,
                privacy=privacy
            )
            
            db.session.add(group)
            db.session.flush()  # Get the group ID
            
            # Add admin as first member
            admin_member = GroupMember(
                group_id=group.id,
                user_uid=admin_uid,
                role=GroupRole.ADMIN
            )
            
            db.session.add(admin_member)
            
            # Add courses to the group if provided
            if course_ids:
                from app.models.user import Course  # Import here to avoid circular imports
                for course_id in course_ids:
                    course = Course.query.get(course_id)
                    if course:
                        group.courses.append(course)
                    else:
                        print(f"Warning: Course {course_id} not found, skipping...")
            
            db.session.commit()
            
            # Refresh to get all relationships
            db.session.refresh(group)
            
            return group.to_dict()
            
        except IntegrityError as e:
            db.session.rollback()
            print(f"Error creating group: {e}")
            return None
        except Exception as e:
            db.session.rollback()
            print(f"Unexpected error creating group: {e}")
            return None
    
    @staticmethod
    def get_group(group_id: int) -> Optional[Dict[str, Any]]:
        """Get group by ID with member details."""
        try:
            group = Group.query.get(group_id)
            if not group:
                return None
            
            # Get group dict and add member details
            group_data = group.to_dict()
            group_data['members'] = [member.to_dict() for member in group.members]
            
            return group_data
        except Exception as e:
            print(f"Error getting group {group_id}: {e}")
            return None
    
    @staticmethod
    def get_user_groups(user_uid: str) -> List[Dict[str, Any]]:
        """Get all groups that a user is a member of."""
        try:
            member_records = GroupMember.query.filter_by(user_uid=user_uid).all()
            groups = []
            
            for member in member_records:
                group_data = member.group.to_dict()
                group_data['user_role'] = member.role.value
                group_data['joined_at'] = member.joined_at.isoformat()
                groups.append(group_data)
            
            return groups
        except Exception as e:
            print(f"Error getting user groups for {user_uid}: {e}")
            return []
    
    @staticmethod
    def get_visible_groups() -> List[Dict[str, Any]]:
        """Get all groups that are marked as visible for the group feed."""
        try:
            groups = Group.query.filter_by(is_visible=True).order_by(Group.created_at.desc()).all()
            return [group.to_dict() for group in groups]
        except Exception as e:
            print(f"Error getting visible groups: {e}")
            return []
    
    @staticmethod
    def add_member(group_id: int, user_uid: str, role: GroupRole = GroupRole.MEMBER) -> bool:
        """
        Add a member to a group.
        
        Args:
            group_id: ID of the group
            user_uid: Firebase UID of user to add
            role: Role to assign (default: MEMBER)
            
        Returns:
            True if member was added successfully, False otherwise
        """
        try:
            # Check if group exists
            group = Group.query.get(group_id)
            if not group:
                print(f"Group {group_id} not found")
                return False
            
            # Check if user is already a member
            existing_member = GroupMember.query.filter_by(
                group_id=group_id, 
                user_uid=user_uid
            ).first()
            
            if existing_member:
                print(f"User {user_uid} is already a member of group {group_id}")
                return False
            
            # Add new member
            new_member = GroupMember(
                group_id=group_id,
                user_uid=user_uid,
                role=role
            )
            
            db.session.add(new_member)
            db.session.commit()
            
            return True
            
        except IntegrityError as e:
            db.session.rollback()
            print(f"Error adding member to group: {e}")
            return False
        except Exception as e:
            db.session.rollback()
            print(f"Unexpected error adding member: {e}")
            return False
    
    @staticmethod
    def remove_member(group_id: int, user_uid: str) -> bool:
        """
        Remove a member from a group.
        Handles admin transfer logic and group deletion if needed.
        
        Args:
            group_id: ID of the group
            user_uid: Firebase UID of user to remove
            
        Returns:
            True if member was removed successfully, False otherwise
        """
        try:
            # Get the member to remove
            member_to_remove = GroupMember.query.filter_by(
                group_id=group_id, 
                user_uid=user_uid
            ).first()
            
            if not member_to_remove:
                print(f"User {user_uid} is not a member of group {group_id}")
                return False
            
            # Get all members of the group
            all_members = GroupMember.query.filter_by(group_id=group_id).order_by(GroupMember.joined_at).all()
            
            # If this is the last member, delete the group
            if len(all_members) == 1:
                return GroupRepo._delete_group(group_id)
            
            # If removing an admin, transfer admin role to earliest member
            if member_to_remove.role == GroupRole.ADMIN:
                # Find earliest member who isn't the one being removed
                new_admin = None
                for member in all_members:
                    if member.user_uid != user_uid:
                        new_admin = member
                        break
                
                if new_admin:
                    new_admin.role = GroupRole.ADMIN
                    print(f"Transferred admin role to user {new_admin.user_uid}")
            
            # Remove the member
            db.session.delete(member_to_remove)
            db.session.commit()
            
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"Error removing member from group: {e}")
            return False
    
    @staticmethod
    def kick_member(group_id: int, admin_uid: str, member_to_kick_uid: str) -> Dict[str, Any]:
        """
        Admin kicks a member from the group.
        
        Args:
            group_id: ID of the group
            admin_uid: Firebase UID of the admin performing the kick
            member_to_kick_uid: Firebase UID of the member to kick
            
        Returns:
            Dict with success status and message
        """
        try:
            # Verify the admin is actually an admin of this group
            admin_member = GroupMember.query.filter_by(
                group_id=group_id,
                user_uid=admin_uid,
                role=GroupRole.ADMIN
            ).first()
            
            if not admin_member:
                return {
                    "success": False,
                    "error": "You must be an admin to kick members"
                }
            
            # Can't kick yourself
            if admin_uid == member_to_kick_uid:
                return {
                    "success": False,
                    "error": "You cannot kick yourself from the group"
                }
            
            # Check if the member to kick exists in the group
            member_to_kick = GroupMember.query.filter_by(
                group_id=group_id,
                user_uid=member_to_kick_uid
            ).first()
            
            if not member_to_kick:
                return {
                    "success": False,
                    "error": "User is not a member of this group"
                }
            
            # Use the existing remove_member logic
            success = GroupRepo.remove_member(group_id, member_to_kick_uid)
            
            if success:
                return {
                    "success": True,
                    "message": "Member successfully removed from group"
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to remove member from group"
                }
                
        except Exception as e:
            print(f"Error kicking member: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
    
    @staticmethod
    def update_group_info(group_id: int, name: str = None, description: str = None, 
                         is_visible: bool = None, privacy: GroupPrivacy = None) -> Dict[str, Any]:
        """
        Update group information with validation.
        
        Args:
            group_id: ID of the group to update
            name: New group name (optional)
            description: New description (optional)
            is_visible: New visibility setting (optional)
            privacy: New privacy setting (optional)
            
        Returns:
            Dict with success status and message/error
        """
        try:
            group = Group.query.get(group_id)
            if not group:
                return {
                    "success": False,
                    "error": f"Group {group_id} not found"
                }
            
            # VALIDATION: If trying to make group visible (public), ensure it has courses
            if is_visible is True and len(group.courses) == 0:
                return {
                    "success": False,
                    "error": "Cannot make group public without adding at least one course. Please add courses first."
                }
            
            # Update provided fields
            if name is not None:
                group.name = name
            if description is not None:
                group.description = description
            if is_visible is not None:
                group.is_visible = is_visible
            if privacy is not None:
                group.privacy = privacy
            
            db.session.commit()
            print(f"Group {group_id} updated successfully")
            
            return {
                "success": True,
                "message": "Group updated successfully"
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"Error updating group {group_id}: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
            if privacy is not None:
                group.privacy = privacy
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"Error updating group {group_id}: {e}")
            return False
    
    @staticmethod
    def update_member_role(group_id: int, user_uid: str, new_role: GroupRole) -> bool:
        """
        Update a member's role in a group.
        
        Args:
            group_id: ID of the group
            user_uid: Firebase UID of the member
            new_role: New role to assign
            
        Returns:
            True if role was updated successfully, False otherwise
        """
        try:
            member = GroupMember.query.filter_by(
                group_id=group_id, 
                user_uid=user_uid
            ).first()
            
            if not member:
                print(f"Member {user_uid} not found in group {group_id}")
                return False
            
            member.role = new_role
            db.session.commit()
            
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"Error updating member role: {e}")
            return False
    
    @staticmethod
    def is_member(group_id: int, user_uid: str) -> bool:
        """Check if a user is a member of a group."""
        try:
            member = GroupMember.query.filter_by(
                group_id=group_id, 
                user_uid=user_uid
            ).first()
            return member is not None
        except Exception as e:
            print(f"Error checking membership: {e}")
            return False
    
    @staticmethod
    def is_admin(group_id: int, user_uid: str) -> bool:
        """Check if a user is an admin of a group."""
        try:
            member = GroupMember.query.filter_by(
                group_id=group_id, 
                user_uid=user_uid,
                role=GroupRole.ADMIN
            ).first()
            return member is not None
        except Exception as e:
            print(f"Error checking admin status: {e}")
            return False
    
    @staticmethod
    def get_group_members(group_id: int) -> List[Dict[str, Any]]:
        """Get all members of a specific group."""
        try:
            members = GroupMember.query.filter_by(group_id=group_id).order_by(GroupMember.joined_at).all()
            return [member.to_dict() for member in members]
        except Exception as e:
            print(f"Error getting group members: {e}")
            return []
    
    @staticmethod
    def _delete_group(group_id: int) -> bool:
        """
        Delete a group and all its members.
        Private method used when last member leaves.
        """
        try:
            group = Group.query.get(group_id)
            if not group:
                return False
            
            # Delete all members first (cascade should handle this, but being explicit)
            GroupMember.query.filter_by(group_id=group_id).delete()
            
            # Delete the group
            db.session.delete(group)
            db.session.commit()
            
            print(f"Group {group_id} deleted (last member left)")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting group {group_id}: {e}")
            return False
    
    @staticmethod
    def add_course_to_group(group_id: int, course_id: str) -> bool:
        """
        Add a course to a group's study list.
        
        Args:
            group_id: ID of the group
            course_id: ID of the course to add
            
        Returns:
            True if course was added successfully, False otherwise
        """
        try:
            from app.models.user import Course
            
            group = Group.query.get(group_id)
            course = Course.query.get(course_id)
            
            if not group or not course:
                print(f"Group {group_id} or course {course_id} not found")
                return False
            
            # Check if course is already in group
            if course in group.courses:
                print(f"Course {course_id} already in group {group_id}")
                return True  # Not an error, just already exists
            
            group.courses.append(course)
            db.session.commit()
            
            print(f"Added course {course_id} to group {group_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"Error adding course to group: {e}")
            return False
    
    @staticmethod
    def remove_course_from_group(group_id: int, course_id: str) -> bool:
        """
        Remove a course from a group's study list.
        
        Args:
            group_id: ID of the group
            course_id: ID of the course to remove
            
        Returns:
            True if course was removed successfully, False otherwise
        """
        try:
            from app.models.user import Course
            
            group = Group.query.get(group_id)
            course = Course.query.get(course_id)
            
            if not group or not course:
                print(f"Group {group_id} or course {course_id} not found")
                return False
            
            if course in group.courses:
                group.courses.remove(course)
                db.session.commit()
                print(f"Removed course {course_id} from group {group_id}")
            else:
                print(f"Course {course_id} not in group {group_id}")
            
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"Error removing course from group: {e}")
            return False
    
    @staticmethod
    def get_groups_by_course(course_id: str) -> List[Dict[str, Any]]:
        """
        Get all visible groups that study a specific course.
        
        Args:
            course_id: ID of the course
            
        Returns:
            List of group dictionaries
        """
        try:
            from app.models.user import Course
            
            course = Course.query.get(course_id)
            if not course:
                return []
            
            # Get all visible groups for this course
            groups = Group.query.join(Group.courses).filter(
                Course.course_id == course_id,
                Group.is_visible == True
            ).all()
            
            return [group.to_dict() for group in groups]
            
        except Exception as e:
            print(f"Error getting groups by course: {e}")
            return []