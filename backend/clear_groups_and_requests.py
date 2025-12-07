"""
Debugging script for resetting group-related data during testing.
Clears groups, group members, group-course associations, and group requests.
Preserves users and courses for continued testing.
"""

from app import create_app, db
from app.models.group import Group, GroupMember, group_courses
from app.models.group_request import GroupRequest

def clear_groups_and_requests():
    """Clear all group-related data while preserving users and courses."""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("Starting cleanup of groups and group requests...")
            
            # Get counts before deletion
            group_count = Group.query.count()
            member_count = GroupMember.query.count()
            request_count = GroupRequest.query.count()
            
            print(f"Current data:")
            print(f"  - Groups: {group_count}")
            print(f"  - Group Members: {member_count}")
            print(f"  - Group Requests: {request_count}")
            
            # Clear all group requests
            print("Deleting all group requests...")
            GroupRequest.query.delete()
            
            # Clear all group members
            print("Deleting all group members...")
            GroupMember.query.delete()
            
            # Clear group-course associations
            print("Deleting all group-course associations...")
            db.session.execute(group_courses.delete())
            
            # Clear all groups
            print("Deleting all groups...")
            Group.query.delete()
            
            # Commit all changes
            db.session.commit()
            
            # Verify cleanup
            final_group_count = Group.query.count()
            final_member_count = GroupMember.query.count()
            final_request_count = GroupRequest.query.count()
            
            print("Cleanup completed successfully")
            print(f"Final counts:")
            print(f"  - Groups: {final_group_count}")
            print(f"  - Group Members: {final_member_count}")
            print(f"  - Group Requests: {final_request_count}")
            
            # Verify users and courses are still intact
            from app.models.user import User, Course
            user_count = User.query.count()
            course_count = Course.query.count()
            
            print(f"Preserved data:")
            print(f"  - Users: {user_count}")
            print(f"  - Courses: {course_count}")
            
            print("Database cleaned successfully: ready for fresh group testing")
            
        except Exception as e:
            print(f"Error during cleanup: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    clear_groups_and_requests()