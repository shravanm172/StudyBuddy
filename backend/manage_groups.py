#!/usr/bin/env python3
"""
Advanced group management script with multiple options:
- Clear all groups
- Clear specific groups
- List all groups
- Reset and seed with test data
"""

import sys
from app import create_app, db
from app.models.group import Group, GroupMember, GroupPrivacy
from app.repositories.group_repo import GroupRepo

def list_all_groups():
    """List all groups in the database"""
    app = create_app()
    with app.app_context():
        groups = Group.query.all()
        
        if not groups:
            print("📭 No groups found in database")
            return []
        
        print(f"📋 Found {len(groups)} groups:")
        print("-" * 60)
        
        group_data = []
        for group in groups:
            member_count = GroupMember.query.filter_by(group_id=group.id).count()
            print(f"ID: {group.id:2d} | {group.name:25s} | Members: {member_count:2d} | Privacy: {group.privacy.value}")
            group_data.append({
                'id': group.id,
                'name': group.name,
                'member_count': member_count,
                'privacy': group.privacy.value
            })
        
        print("-" * 60)
        return group_data

def clear_specific_groups(group_ids):
    """Clear specific groups by their IDs"""
    app = create_app()
    with app.app_context():
        try:
            deleted_count = 0
            for group_id in group_ids:
                group = Group.query.get(group_id)
                if group:
                    # Delete memberships first
                    GroupMember.query.filter_by(group_id=group_id).delete()
                    # Delete the group
                    db.session.delete(group)
                    print(f"🗑️  Deleted group {group_id}: {group.name}")
                    deleted_count += 1
                else:
                    print(f"⚠️  Group {group_id} not found")
            
            db.session.commit()
            print(f"✅ Successfully deleted {deleted_count} groups")
            
        except Exception as e:
            print(f"❌ Error deleting groups: {e}")
            db.session.rollback()
            raise

def clear_all_groups():
    """Clear all groups from the database"""
    app = create_app()
    with app.app_context():
        try:
            group_count = Group.query.count()
            member_count = GroupMember.query.count()
            
            if group_count == 0:
                print("✅ No groups to delete")
                return
            
            # Delete all memberships first
            GroupMember.query.delete()
            # Delete all groups
            Group.query.delete()
            
            db.session.commit()
            print(f"✅ Successfully deleted {group_count} groups and {member_count} memberships")
            
        except Exception as e:
            print(f"❌ Error clearing all groups: {e}")
            db.session.rollback()
            raise

def seed_test_groups():
    """Create some test groups for development"""
    app = create_app()
    with app.app_context():
        try:
            print("🌱 Creating test groups...")
            
            # Test group 1
            group1 = GroupRepo.create_group(
                name='Math Study Group',
                admin_uid='messi',  # Use our test users
                description='Studying calculus together',
                is_visible=True,
                privacy=GroupPrivacy.PRIVATE
            )
            
            if group1:
                GroupRepo.add_member(group1['id'], 'ronaldo')
                print(f"✅ Created group: {group1['name']} (ID: {group1['id']})")
            
            # Test group 2
            group2 = GroupRepo.create_group(
                name='Physics Lab Partners',
                admin_uid='ronaldo',
                description='Working on physics lab assignments',
                is_visible=False,
                privacy=GroupPrivacy.PRIVATE
            )
            
            if group2:
                GroupRepo.add_member(group2['id'], 'messi')
                print(f"✅ Created group: {group2['name']} (ID: {group2['id']})")
            
            # Test group 3
            group3 = GroupRepo.create_group(
                name='CS Study Circle',
                admin_uid='messi',
                description='Computer science study group',
                is_visible=True,
                privacy=GroupPrivacy.PUBLIC
            )
            
            if group3:
                print(f"✅ Created group: {group3['name']} (ID: {group3['id']})")
            
            print("🎉 Test data created successfully!")
            
        except Exception as e:
            print(f"❌ Error creating test groups: {e}")
            raise

def main():
    print("=" * 60)
    print("🎯 GROUP MANAGEMENT SCRIPT")
    print("=" * 60)
    
    print("Available commands:")
    print("1. list    - List all groups")
    print("2. clear   - Clear all groups")
    print("3. delete  - Delete specific groups by ID")
    print("4. reset   - Clear all groups and create test data")
    print("5. seed    - Create test data (without clearing)")
    print("6. exit    - Exit without changes")
    
    while True:
        choice = input("\nEnter command (1-6): ").strip().lower()
        
        if choice in ['1', 'list']:
            list_all_groups()
            
        elif choice in ['2', 'clear']:
            groups = list_all_groups()
            if groups:
                confirm = input(f"\nAre you sure you want to delete ALL {len(groups)} groups? (yes/no): ").strip().lower()
                if confirm in ['yes', 'y']:
                    clear_all_groups()
                else:
                    print("❌ Operation cancelled")
            
        elif choice in ['3', 'delete']:
            groups = list_all_groups()
            if groups:
                ids_input = input("\nEnter group IDs to delete (comma-separated): ").strip()
                try:
                    group_ids = [int(x.strip()) for x in ids_input.split(',') if x.strip()]
                    if group_ids:
                        confirm = input(f"Delete groups {group_ids}? (yes/no): ").strip().lower()
                        if confirm in ['yes', 'y']:
                            clear_specific_groups(group_ids)
                        else:
                            print("❌ Operation cancelled")
                    else:
                        print("❌ No valid group IDs provided")
                except ValueError:
                    print("❌ Invalid input - please enter numbers only")
            
        elif choice in ['4', 'reset']:
            groups = list_all_groups()
            confirm = input(f"\nClear all data and create test groups? (yes/no): ").strip().lower()
            if confirm in ['yes', 'y']:
                if groups:
                    clear_all_groups()
                seed_test_groups()
                list_all_groups()
            else:
                print("❌ Operation cancelled")
                
        elif choice in ['5', 'seed']:
            confirm = input("Create test groups? (yes/no): ").strip().lower()
            if confirm in ['yes', 'y']:
                seed_test_groups()
                list_all_groups()
            else:
                print("❌ Operation cancelled")
                
        elif choice in ['6', 'exit']:
            print("👋 Goodbye!")
            break
            
        else:
            print("❌ Invalid choice. Please enter 1-6.")

if __name__ == "__main__":
    main()