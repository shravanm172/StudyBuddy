#!/usr/bin/env python3
"""
Test script for group courses functionality
"""

from app import create_app, db
from app.repositories.group_repo import GroupRepo
from app.models.group import GroupPrivacy
from app.models.user import Course

def test_group_courses():
    """Test creating groups with courses and managing course relationships"""
    
    app = create_app()
    with app.app_context():
        try:
            print("🧪 Testing group courses functionality...")
            
            # First, ensure we have some test courses
            print("\n📚 Creating test courses...")
            
            # Create test courses if they don't exist
            course1 = Course.query.get('CS101')
            if not course1:
                course1 = Course(course_id='CS101', title='Introduction to Computer Science')
                db.session.add(course1)
            
            course2 = Course.query.get('MATH201')
            if not course2:
                course2 = Course(course_id='MATH201', title='Calculus II')
                db.session.add(course2)
            
            course3 = Course.query.get('PHYS301')
            if not course3:
                course3 = Course(course_id='PHYS301', title='Quantum Physics')
                db.session.add(course3)
            
            db.session.commit()
            print("✅ Test courses created/verified")
            
            # Test creating a group with courses
            print("\n🏗️ Creating group with courses...")
            group1 = GroupRepo.create_group(
                name='CS Study Circle',
                admin_uid='testuser1',
                description='Group for studying computer science',
                is_visible=True,
                privacy=GroupPrivacy.PRIVATE,
                course_ids=['CS101', 'MATH201']
            )
            
            if group1:
                print(f"✅ Created group: {group1['name']}")
                print(f"📚 Courses: {[c['title'] for c in group1['courses']]}")
            else:
                print("❌ Failed to create group")
                return
            
            # Test adding a course to existing group
            print(f"\n➕ Adding PHYS301 to group {group1['id']}...")
            success = GroupRepo.add_course_to_group(group1['id'], 'PHYS301')
            if success:
                print("✅ Course added successfully")
            
            # Test getting groups by course
            print(f"\n🔍 Finding groups that study CS101...")
            cs_groups = GroupRepo.get_groups_by_course('CS101')
            print(f"✅ Found {len(cs_groups)} groups studying CS101:")
            for group in cs_groups:
                print(f"  - {group['name']}")
            
            # Test removing a course
            print(f"\n➖ Removing MATH201 from group {group1['id']}...")
            success = GroupRepo.remove_course_from_group(group1['id'], 'MATH201')
            if success:
                print("✅ Course removed successfully")
            
            # Verify final state
            print(f"\n🔍 Final group state...")
            updated_group = GroupRepo.get_group(group1['id'])
            if updated_group:
                print(f"Group: {updated_group['name']}")
                print(f"Courses: {[c['title'] for c in updated_group['courses']]}")
            
            print("\n🎉 Group courses functionality test completed!")
            
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            raise

if __name__ == "__main__":
    test_group_courses()