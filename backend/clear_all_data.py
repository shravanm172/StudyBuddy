#!/usr/bin/env python3
"""
Clear all data from the database and reseed courses.
This deletes all users, groups, requests, and courses, then reseeds courses.
Use for starting completely fresh with clean test data.
"""

from app import create_app, db
from app.models.user import User, UserProfile, UserCourse, Course
from app.models.group import Group, GroupMember, group_courses
from app.models.direct_request import DirectRequest
from app.models.group_request import GroupRequest

# Course data to seed
COURSES = [
    ("CSE1001", "Intro to Programming"),
    ("CSE2010", "Data Structures"),
    ("CSE2410", "Software Engineering"),
    ("CSE4001", "Operating Systems"),
    ("PHY2002", "Physics II"),
]

def clear_all_data_and_reseed():
    """Clear all data from database and reseed courses."""
    
    app = create_app()
    
    with app.app_context():
        try:
            print(" Starting complete database cleanup...")
            
            # Get counts before deletion
            user_count = User.query.count()
            group_count = Group.query.count()
            direct_request_count = DirectRequest.query.count()
            group_request_count = GroupRequest.query.count()
            course_count = Course.query.count()
            
            print(f"\n Current data:")
            print(f"   - Users: {user_count}")
            print(f"   - Groups: {group_count}")
            print(f"   - Direct Requests: {direct_request_count}")
            print(f"   - Group Requests: {group_request_count}")
            print(f"   - Courses: {course_count}")
            
            print("\n Deleting all data...")
            
            # Delete in correct order due to foreign key constraints
            
            # 1. Delete group requests (references groups and users)
            print("   - Deleting group requests...")
            GroupRequest.query.delete()
            
            # 2. Delete direct requests (references users)
            print("   - Deleting direct requests...")
            DirectRequest.query.delete()
            
            # 3. Delete group members (references groups and users)
            print("   - Deleting group members...")
            GroupMember.query.delete()
            
            # 4. Delete group-course associations
            print("   - Deleting group-course associations...")
            db.session.execute(group_courses.delete())
            
            # 5. Delete groups
            print("   - Deleting groups...")
            Group.query.delete()
            
            # 6. Delete user-course enrollments (references users and courses)
            print("   - Deleting user course enrollments...")
            UserCourse.query.delete()
            
            # 7. Delete user profiles (references users)
            print("   - Deleting user profiles...")
            UserProfile.query.delete()
            
            # 8. Delete users
            print("   - Deleting users...")
            User.query.delete()
            
            # 9. Delete courses
            print("   - Deleting courses...")
            Course.query.delete()
            
            # Commit deletions
            db.session.commit()
            print("All data deleted!")
            
            # Reseed courses
            print("\n Reseeding courses...")
            for course_id, title in COURSES:
                course = Course(course_id=course_id, title=title)
                db.session.add(course)
                print(f"   + {course_id}: {title}")
            
            db.session.commit()
            print(f" Seeded {len(COURSES)} courses!")
            
            # Verify final state
            final_course_count = Course.query.count()
            final_user_count = User.query.count()
            final_group_count = Group.query.count()
            
            print(f"\n Final database state:")
            print(f"   - Users: {final_user_count}")
            print(f"   - Groups: {final_group_count}")
            print(f"   - Courses: {final_course_count}")
            
            print("\n Database completely reset with fresh courses!")
            print("   Ready for new test data.")
            
        except Exception as e:
            print(f"\n Error during cleanup: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    import sys
    
    # Safety check - require confirmation
    print(" WARNING: This will delete ALL data from the database!")
    
    response = input("Continue? (yes/no): ").strip().lower()
    
    if response == "yes":
        clear_all_data_and_reseed()
    else:
        print("Operation cancelled.")
        sys.exit(0)
