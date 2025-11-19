#!/usr/bin/env python3
"""
Test script to create groups with courses for testing the course functionality.
"""

from app import create_app
from app.repositories.group_repo import GroupRepo
from app.models.group import GroupPrivacy

def create_test_groups_with_courses():
    """Create test groups with courses"""
    app = create_app()
    with app.app_context():
        try:
            print("🧹 Clearing existing groups first...")
            from app.models.group import Group, GroupMember
            from app import db
            
            # Clear existing data
            GroupMember.query.delete()
            Group.query.delete()
            db.session.commit()
            print("✅ Cleared existing groups")
            
            print("🌱 Creating test groups with courses...")
            
            # Test group 1 - Math Study Group with courses
            group1 = GroupRepo.create_group(
                name='Advanced Mathematics Study Circle',
                admin_uid='messi',
                description='Studying advanced math topics together - calculus, linear algebra, and algorithms',
                is_visible=True,
                privacy=GroupPrivacy.PUBLIC,
                course_ids=['CSE3002', 'CSE2010']  # Algorithms and Data Structures
            )
            
            if group1:
                GroupRepo.add_member(group1['id'], 'ronaldo')
                print(f"✅ Created group: {group1['name']} (ID: {group1['id']})")
                print(f"   📚 Courses: CSE3002 (Algorithms), CSE2010 (Data Structures)")
            
            # Test group 2 - Programming Study Group
            group2 = GroupRepo.create_group(
                name='Programming Fundamentals Group',
                admin_uid='ronaldo',
                description='Learning programming from scratch and building projects',
                is_visible=True,
                privacy=GroupPrivacy.PRIVATE,
                course_ids=['CSE1001']  # Intro to Programming
            )
            
            if group2:
                GroupRepo.add_member(group2['id'], 'messi')
                # Add more courses after creation
                GroupRepo.add_course_to_group(group2['id'], 'CSE4001')  # Software Engineering
                print(f"✅ Created group: {group2['name']} (ID: {group2['id']})")
                print(f"   📚 Courses: CSE1001 (Intro to Programming), CSE4001 (Software Engineering)")
            
            # Test group 3 - Physics Study Group
            group3 = GroupRepo.create_group(
                name='Physics Laboratory Partners',
                admin_uid='messi',
                description='Working together on physics lab experiments and homework',
                is_visible=True,
                privacy=GroupPrivacy.PUBLIC,
                course_ids=['PHY2002']  # Physics II
            )
            
            if group3:
                print(f"✅ Created group: {group3['name']} (ID: {group3['id']})")
                print(f"   📚 Courses: PHY2002 (Physics II)")
            
            print("\n🎉 Test groups with courses created successfully!")
            print("\nTest data summary:")
            print("- messi: admin of Math & Physics groups, member of Programming group")
            print("- ronaldo: admin of Programming group, member of Math group")
            print("- All groups have specific courses assigned for studying")
            
        except Exception as e:
            print(f"❌ Error creating test groups: {e}")
            raise

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 CREATE TEST GROUPS WITH COURSES")
    print("=" * 60)
    
    create_test_groups_with_courses()
    print("\n🏁 Script completed!")