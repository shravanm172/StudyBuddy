#!/usr/bin/env python3
"""
Check existing users in the database
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User, UserProfile

def check_existing_users():
    app = create_app()
    
    with app.app_context():
        print("👥 Checking existing users in database...")
        print("=" * 50)
        
        try:
            # Get all users
            users = User.query.all()
            print(f"Found {len(users)} users in database:")
            
            for user in users:
                profile = UserProfile.query.filter_by(uid=user.uid).first()
                print(f"\n📝 User: {user.username}")
                print(f"   UID: {user.uid}")
                print(f"   Email: {user.email}")
                if profile:
                    print(f"   Grade: {profile.grade.value if profile.grade else 'N/A'}")
                    print(f"   Gender: {profile.gender.value if profile.gender else 'N/A'}")
                else:
                    print("   No profile found")
            
            if len(users) >= 2:
                print(f"\n✅ We have {len(users)} users - enough for testing DirectRequest!")
                print(f"We can use UIDs: {[user.uid for user in users[:2]]}")
            else:
                print(f"\n⚠️  Only {len(users)} user(s) found. We need at least 2 users for request testing.")
            
        except Exception as e:
            print(f"💥 Error checking users: {e}")

if __name__ == "__main__":
    check_existing_users()