# backend/reset_database.py
"""
Database Reset & Reseed Script
- Clears all user data (users, profiles, enrollments)
- Keeps courses table intact and reseeds it
- Perfect for testing clean state
"""

from app import create_app, db
from app.models.user import User, UserProfile, UserCourse, Course

# Course data to seed
COURSES = [
    ("CSE1001", "Intro to Programming"),
    ("CSE2010", "Data Structures"), 
    ("CSE3002", "Algorithms"),
    ("CSE4001", "Software Engineering"),
    ("PHY2002", "Physics II"),
]

def reset_and_reseed():
    """Clear user data and reseed courses"""
    app = create_app()
    with app.app_context():
        
        print("🗑️  Clearing user data...")
        
        try:
            # Clear user-related tables (in correct order due to foreign keys)
            UserCourse.query.delete()
            print("   ✅ Cleared user_courses")
            
            UserProfile.query.delete() 
            print("   ✅ Cleared user_profiles")
            
            User.query.delete()
            print("   ✅ Cleared users")
            
            # Clear and reseed courses
            Course.query.delete()
            print("   ✅ Cleared courses")
            
            print("\n🌱 Reseeding courses...")
            for course_id, title in COURSES:
                course = Course(course_id=course_id, title=title)
                db.session.add(course)
                print(f"   ➕ Added: {course_id} - {title}")
            
            # Commit all changes
            db.session.commit()
            
            print(f"\n🎉 Database reset complete!")
            print(f"   📊 {len(COURSES)} courses seeded")
            print(f"   🧹 All user data cleared")
            print(f"   ✨ Ready for fresh testing!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during reset: {e}")
            raise

if __name__ == "__main__":
    reset_and_reseed()