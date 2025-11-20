#!/usr/bin/env python3
"""
Clear all groups and direct requests from the database.
Keeps users and courses intact for clean testing.
"""

from app import create_app, db
from app.models.group import Group, GroupMember, group_courses
from app.models.direct_request import DirectRequest

def clear_groups_and_requests():
    """Clear all group and request data while preserving users and courses."""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("🧹 Starting cleanup of groups and requests...")
            
            # Get counts before deletion
            group_count = Group.query.count()
            member_count = GroupMember.query.count()
            request_count = DirectRequest.query.count()
            
            print(f"📊 Current data:")
            print(f"   - Groups: {group_count}")
            print(f"   - Group Members: {member_count}")
            print(f"   - Direct Requests: {request_count}")
            
            # Clear all direct requests
            print("🗑️  Deleting all direct requests...")
            DirectRequest.query.delete()
            
            # Clear all group members (this should cascade delete from groups)
            print("🗑️  Deleting all group members...")
            GroupMember.query.delete()
            
            # Clear group-course associations
            print("🗑️  Deleting all group-course associations...")
            db.session.execute(group_courses.delete())
            
            # Clear all groups
            print("🗑️  Deleting all groups...")
            Group.query.delete()
            
            # Commit all changes
            db.session.commit()
            
            # Verify cleanup
            final_group_count = Group.query.count()
            final_member_count = GroupMember.query.count()
            final_request_count = DirectRequest.query.count()
            
            print("✅ Cleanup completed!")
            print(f"📊 Final counts:")
            print(f"   - Groups: {final_group_count}")
            print(f"   - Group Members: {final_member_count}")
            print(f"   - Direct Requests: {final_request_count}")
            
            # Verify users and courses are still there
            from app.models.user import User, Course
            user_count = User.query.count()
            course_count = Course.query.count()
            
            print(f"🔄 Preserved data:")
            print(f"   - Users: {user_count}")
            print(f"   - Courses: {course_count}")
            
            print("🎉 Database cleaned! Ready for fresh group testing.")
            
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    clear_groups_and_requests()