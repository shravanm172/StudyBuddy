#!/usr/bin/env python3
"""
Test script for DirectRequest repository methods
Run this from the backend directory: python test_direct_request_repo.py
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.repositories.direct_request_repo import DirectRequestRepo
from app.models.direct_request import DirectRequest, RequestStatus
from app.repositories.user_repo import UserRepo
from datetime import datetime, date

def test_direct_request_repo():
    app = create_app()
    
    with app.app_context():
        print("🧪 Testing DirectRequest Repository Methods")
        print("=" * 50)
        
        # Test data - using real UIDs from database
        sender_uid = "SiLt229dCEcuZ95TftzkXQbvw1V2"  # smaharaj
        receiver_uid = "S0JgjUEZAFSNxzoyazkooVFcPaF3"  # harrym
        
        try:
            # Test 1: Create a new request
            print("\n1. Testing create_request()...")
            request = DirectRequestRepo.create_request(
                sender_uid=sender_uid,
                receiver_uid=receiver_uid,
                message="Hey! Want to study together for CS101?"
            )
            print(f"✅ Created request ID: {request.id}")
            print(f"   Sender: {request.sender_uid}")
            print(f"   Receiver: {request.receiver_uid}")
            print(f"   Status: {request.status.value}")
            print(f"   Message: {request.message}")
            
            # Test 2: Try to create duplicate request (should fail)
            print("\n2. Testing duplicate request prevention...")
            try:
                DirectRequestRepo.create_request(sender_uid, receiver_uid, "Another message")
                print("❌ ERROR: Duplicate request should have been prevented!")
            except ValueError as e:
                print(f"✅ Duplicate prevented: {e}")
            
            # Test 3: Try self-request (should fail)
            print("\n3. Testing self-request prevention...")
            try:
                DirectRequestRepo.create_request(sender_uid, sender_uid, "Self request")
                print("❌ ERROR: Self-request should have been prevented!")
            except ValueError as e:
                print(f"✅ Self-request prevented: {e}")
            
            # Test 4: Get incoming requests
            print("\n4. Testing get_user_incoming_requests()...")
            incoming = DirectRequestRepo.get_user_incoming_requests(receiver_uid)
            print(f"✅ Found {len(incoming)} incoming requests for {receiver_uid}")
            for req in incoming:
                print(f"   From {req.sender_uid}: {req.message}")
            
            # Test 5: Get outgoing requests
            print("\n5. Testing get_user_outgoing_requests()...")
            outgoing = DirectRequestRepo.get_user_outgoing_requests(sender_uid)
            print(f"✅ Found {len(outgoing)} outgoing requests for {sender_uid}")
            for req in outgoing:
                print(f"   To {req.receiver_uid}: {req.message}")
            
            # Test 6: Update request status (accept)
            print("\n6. Testing update_request_status() - Accept...")
            updated_request = DirectRequestRepo.update_request_status(
                request.id, 
                RequestStatus.ACCEPTED, 
                user_uid=receiver_uid  # Only receiver can accept
            )
            print(f"✅ Updated request status to: {updated_request.status.value}")
            
            # Test 7: Try to update already accepted request (should fail)
            print("\n7. Testing invalid status transition...")
            try:
                DirectRequestRepo.update_request_status(request.id, RequestStatus.REJECTED, receiver_uid)
                print("❌ ERROR: Should not be able to change accepted request!")
            except ValueError as e:
                print(f"✅ Invalid transition prevented: {e}")
            
            # Test 8: Create another request for cancel test
            print("\n8. Creating second request for cancel test...")
            cancel_request = DirectRequestRepo.create_request(
                sender_uid=receiver_uid,  # Reverse direction for testing
                receiver_uid=sender_uid,
                message="Let's form a study group!"
            )
            print(f"✅ Created request ID: {cancel_request.id}")
            
            # Test 9: Cancel request
            print("\n9. Testing cancel_request()...")
            success = DirectRequestRepo.cancel_request(cancel_request.id, receiver_uid)
            print(f"✅ Cancel successful: {success}")
            
            # Verify it's gone
            cancelled_req = DirectRequestRepo.get_request_by_id(cancel_request.id)
            print(f"✅ Request deleted: {cancelled_req is None}")
            
            # Test 10: Get request between users
            print("\n10. Testing get_request_between_users()...")
            between_req = DirectRequestRepo.get_request_between_users(sender_uid, receiver_uid)
            if between_req:
                print(f"✅ Found request between users: {between_req.status.value}")
            else:
                print("❌ No request found between users")
            
            print("\n" + "=" * 50)
            print("🎉 All DirectRequest repository tests completed!")
            
        except Exception as e:
            print(f"\n💥 Test failed with error: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            # Cleanup: Remove test data
            print("\n🧹 Cleaning up test data...")
            try:
                # Delete any test requests between our test users
                test_requests = DirectRequest.query.filter(
                    DirectRequest.sender_uid.in_([sender_uid, receiver_uid])
                ).all()
                for req in test_requests:
                    db.session.delete(req)
                db.session.commit()
                print("✅ Test data cleaned up")
            except Exception as e:
                print(f"⚠️  Cleanup warning: {e}")
                db.session.rollback()

if __name__ == "__main__":
    test_direct_request_repo()