# backend/test_reset.py
"""
Interactive Test Reset Menu
Choose what type of database reset you want
"""

from app import create_app, db
from app.models.user import User, UserProfile, UserCourse, Course
import sys

# Course data
COURSES = [
    ("CSE1001", "Intro to Programming"),
    ("CSE2010", "Data Structures"), 
    ("CSE3002", "Algorithms"),
    ("CSE4001", "Software Engineering"),
    ("PHY2002", "Physics II"),
]

def show_current_stats():
    """Show current database state"""
    app = create_app()
    with app.app_context():
        user_count = User.query.count()
        profile_count = UserProfile.query.count()
        enrollment_count = UserCourse.query.count()
        course_count = Course.query.count()
        
        print(f"\n📊 Current Database State:")
        print(f"   Users: {user_count}")
        print(f"   Profiles: {profile_count}")
        print(f"   Enrollments: {enrollment_count}")
        print(f"   Courses: {course_count}")

def clear_users_only():
    """Clear only user data"""
    app = create_app()
    with app.app_context():
        UserCourse.query.delete()
        UserProfile.query.delete()
        User.query.delete()
        db.session.commit()
        print("✅ User data cleared!")

def full_reset():
    """Clear everything and reseed courses"""
    app = create_app()
    with app.app_context():
        UserCourse.query.delete()
        UserProfile.query.delete()
        User.query.delete()
        Course.query.delete()
        
        for course_id, title in COURSES:
            db.session.add(Course(course_id=course_id, title=title))
        
        db.session.commit()
        print(f"✅ Full reset complete! {len(COURSES)} courses seeded.")

def main():
    print("🔄 StudyBuddy Database Reset Tool")
    print("=" * 40)
    
    if len(sys.argv) > 1:
        # Command line argument provided
        action = sys.argv[1].lower()
        if action == "users":
            show_current_stats()
            clear_users_only()
            show_current_stats()
        elif action == "full":
            show_current_stats()
            full_reset()
            show_current_stats()
        elif action == "stats":
            show_current_stats()
        else:
            print("Usage: python test_reset.py [users|full|stats]")
    else:
        # Interactive menu
        show_current_stats()
        print("\nOptions:")
        print("1. Clear users only (keep courses)")
        print("2. Full reset (clear all + reseed courses)")
        print("3. Just show stats")
        print("0. Exit")
        
        choice = input("\nEnter choice (0-3): ").strip()
        
        if choice == "1":
            clear_users_only()
            show_current_stats()
        elif choice == "2":
            full_reset()
            show_current_stats()
        elif choice == "3":
            show_current_stats()
        else:
            print("Goodbye!")

if __name__ == "__main__":
    main()