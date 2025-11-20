# backend/reset_database.py
"""
Database Reset Script
- Clears all direct request and group data
- Keeps all user data (users, profiles, enrollments)
- Keeps all existing courses intact
- Perfect for testing clean state while preserving users and their course data
"""

from app import create_app, db
from app.models.user import User, UserProfile, UserCourse, Course
from app.models.direct_request import DirectRequest
from app.models.group import Group, GroupMember

def reset_groups_and_requests():
    """Clear direct request and group data, preserve user data and courses"""
    app = create_app()
    with app.app_context():
        
        print("🗑️  Clearing direct request and group data...")
        
        try:
            # Clear direct request data
            DirectRequest.query.delete()
            print("   ✅ Cleared direct_requests")
            
            # Clear group data (in correct order due to foreign keys)
            GroupMember.query.delete()
            print("   ✅ Cleared group_members")
            
            Group.query.delete()
            print("   ✅ Cleared groups (and group_courses association table)")
            
            # Commit all changes
            db.session.commit()
            
            # Count existing data for summary
            user_count = User.query.count()
            course_count = Course.query.count()
            user_course_count = UserCourse.query.count()
            
            print(f"\n🎉 Database reset complete!")
            print(f"   🧹 All direct request and group data cleared")
            print(f"   � {user_count} users preserved")
            print(f"   📚 {course_count} courses preserved")
            print(f"   🎓 {user_course_count} user course enrollments preserved")
            print(f"   ✨ Ready for fresh testing!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during reset: {e}")
            raise

if __name__ == "__main__":
    reset_groups_and_requests()