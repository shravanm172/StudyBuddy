#!/usr/bin/env python3
"""
Debug script to check database state
"""

from app import create_app, db
from app.models.user import User, UserProfile, UserCourse, Course
from app.models.group import Group, GroupMember

def debug_database():
    """Check what's actually in the database"""
    app = create_app()
    with app.app_context():
        
        print("🔍 === DATABASE STATE DEBUG ===\n")
        
        # Check users
        users = User.query.all()
        print(f"👥 USERS ({len(users)}):")
        for user in users:
            print(f"   - {user.username} ({user.uid}) - {user.email}")
        
        # Check user courses
        user_courses = UserCourse.query.all()
        print(f"\n🎓 USER COURSE ENROLLMENTS ({len(user_courses)}):")
        user_course_map = {}
        for uc in user_courses:
            if uc.uid not in user_course_map:
                user_course_map[uc.uid] = []
            user_course_map[uc.uid].append(uc.course_id)
        
        for uid, courses in user_course_map.items():
            user = User.query.get(uid)
            username = user.username if user else "Unknown"
            print(f"   - {username} ({uid}): {', '.join(courses)}")
        
        # Check courses
        courses = Course.query.all()
        print(f"\n📚 COURSES ({len(courses)}):")
        for course in courses:
            print(f"   - {course.course_id}: {course.title}")
        
        # Check groups
        groups = Group.query.all()
        print(f"\n🏠 GROUPS ({len(groups)}):")
        if groups:
            for group in groups:
                print(f"   - Group {group.id}: {group.name}")
                print(f"     * Visible: {group.is_visible}")
                print(f"     * Privacy: {group.privacy.value}")
                print(f"     * Courses: {[c.course_id for c in group.courses]}")
                print(f"     * Members: {len(group.members)}")
                for member in group.members:
                    user = User.query.get(member.user_uid)
                    username = user.username if user else "Unknown"
                    print(f"       - {username} ({member.user_uid}) as {member.role.value}")
        else:
            print("   (No groups found)")
        
        # Check group members
        group_members = GroupMember.query.all()
        print(f"\n👤 GROUP MEMBERS ({len(group_members)}):")
        for member in group_members:
            user = User.query.get(member.user_uid)
            username = user.username if user else "Unknown"
            print(f"   - {username} in Group {member.group_id} as {member.role.value}")

if __name__ == "__main__":
    debug_database()