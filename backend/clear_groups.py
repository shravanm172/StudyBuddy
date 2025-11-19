#!/usr/bin/env python3
"""
Clear all group data from the database.
This script will remove all groups and group memberships.
"""

from app import create_app, db
from app.models.group import Group, GroupMember

def clear_all_groups():
    """Clear all groups and group memberships from the database"""
    
    app = create_app()
    with app.app_context():
        try:
            print("🧹 Starting to clear all group data...")
            
            # Get counts before deletion
            group_count = Group.query.count()
            member_count = GroupMember.query.count()
            
            print(f"📊 Found {group_count} groups and {member_count} group memberships")
            
            if group_count == 0 and member_count == 0:
                print("✅ No group data found - database is already clean!")
                return
            
            # Delete all group memberships first (due to foreign key constraints)
            print("🗑️  Deleting all group memberships...")
            GroupMember.query.delete()
            
            # Delete all groups
            print("🗑️  Deleting all groups...")
            Group.query.delete()
            
            # Commit the changes
            db.session.commit()
            
            print(f"✅ Successfully cleared all group data!")
            print(f"   - Deleted {group_count} groups")
            print(f"   - Deleted {member_count} group memberships")
            
        except Exception as e:
            print(f"❌ Error clearing group data: {e}")
            db.session.rollback()
            raise
        
        finally:
            # Verify deletion
            remaining_groups = Group.query.count()
            remaining_members = GroupMember.query.count()
            
            if remaining_groups == 0 and remaining_members == 0:
                print("🎉 Database successfully cleaned - no group data remaining")
            else:
                print(f"⚠️  Warning: {remaining_groups} groups and {remaining_members} memberships still remain")

if __name__ == "__main__":
    print("=" * 50)
    print("🧹 GROUP DATA CLEANUP SCRIPT")
    print("=" * 50)
    
    # Ask for confirmation
    response = input("Are you sure you want to delete ALL group data? (yes/no): ").strip().lower()
    
    if response in ['yes', 'y']:
        clear_all_groups()
        print("\n🏁 Script completed!")
    else:
        print("❌ Operation cancelled - no data was deleted")
        print("🏁 Script completed!")