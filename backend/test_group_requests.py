#!/usr/bin/env python3
"""
Test script for Group Request API endpoints
- Tests creating join requests for public/private groups
- Tests admin response functionality
- Tests getting pending requests
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:5000"
HEADERS = {
    "Content-Type": "application/json"
}

def print_separator(title):
    """Print a nice separator for test sections"""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def make_request(method, endpoint, data=None, headers=None, expected_status=None):
    """Make HTTP request and print results"""
    url = f"{BASE_URL}{endpoint}"
    all_headers = {**HEADERS, **(headers or {})}
    
    print(f"\n📡 {method.upper()} {endpoint}")
    if data:
        print(f"📝 Request data: {json.dumps(data, indent=2)}")
    
    try:
        if method.lower() == 'get':
            response = requests.get(url, headers=all_headers)
        elif method.lower() == 'post':
            response = requests.post(url, json=data, headers=all_headers)
        elif method.lower() == 'put':
            response = requests.put(url, json=data, headers=all_headers)
        else:
            print(f"❌ Unsupported method: {method}")
            return None
        
        print(f"📊 Status: {response.status_code}")
        
        if expected_status and response.status_code != expected_status:
            print(f"⚠️  Expected {expected_status}, got {response.status_code}")
        
        try:
            result = response.json()
            print(f"📦 Response: {json.dumps(result, indent=2)}")
            return result
        except:
            print(f"📦 Raw response: {response.text}")
            return response.text
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - is the backend server running?")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_group_requests():
    """Test the group request endpoints"""
    
    print_separator("GROUP REQUEST API TESTS")
    
    # Note: You'll need to replace these with actual Firebase tokens from your frontend
    print("\n⚠️  IMPORTANT: This script needs real Firebase tokens to work!")
    print("   You can get tokens by:")
    print("   1. Login to your frontend app")
    print("   2. Open browser dev tools → Console")
    print("   3. Run: await firebase.auth().currentUser.getIdToken()")
    print("   4. Copy the token and paste it below")
    
    # Placeholder tokens - replace with real ones
    user1_token = input("\n🔑 Enter Firebase token for User 1 (requester): ").strip()
    user2_token = input("🔑 Enter Firebase token for User 2 (admin): ").strip()
    
    if not user1_token or not user2_token:
        print("❌ Need both tokens to run tests")
        return
    
    user1_headers = {"Authorization": f"Bearer {user1_token}"}
    user2_headers = {"Authorization": f"Bearer {user2_token}"}
    
    # Test 1: Create a join request
    print_separator("TEST 1: CREATE JOIN REQUEST")
    
    group_id = input("Enter group ID to test with: ").strip()
    if not group_id:
        print("❌ Need group ID to test")
        return
    
    request_data = {
        "group_id": int(group_id),
        "message": "Hi! I'd love to join your study group. I'm really interested in the courses you're studying."
    }
    
    result1 = make_request(
        "POST", 
        "/api/group-requests/", 
        data=request_data,
        headers=user1_headers,
        expected_status=200
    )
    
    # Test 2: Try to create duplicate request (should fail)
    print_separator("TEST 2: DUPLICATE REQUEST (Should Fail)")
    
    result2 = make_request(
        "POST", 
        "/api/group-requests/", 
        data=request_data,
        headers=user1_headers,
        expected_status=400
    )
    
    # Test 3: Get user's pending requests
    print_separator("TEST 3: GET MY PENDING REQUESTS")
    
    result3 = make_request(
        "GET", 
        "/api/group-requests/my-requests/",
        headers=user1_headers,
        expected_status=200
    )
    
    # Test 4: Get group's pending requests (as admin)
    print_separator("TEST 4: GET GROUP PENDING REQUESTS (Admin)")
    
    result4 = make_request(
        "GET", 
        f"/api/group-requests/group/{group_id}/",
        headers=user2_headers,
        expected_status=200
    )
    
    # Test 5: Respond to request (accept)
    print_separator("TEST 5: ADMIN ACCEPT REQUEST")
    
    if result4 and isinstance(result4, dict) and 'requests' in result4 and result4['requests']:
        request_id = result4['requests'][0]['id']
        
        accept_data = {"accept": True}
        
        result5 = make_request(
            "POST", 
            f"/api/group-requests/{request_id}/respond/",
            data=accept_data,
            headers=user2_headers,
            expected_status=200
        )
    else:
        print("⚠️  No pending requests found to accept")
    
    # Test 6: Try to get group requests as non-admin (should fail)
    print_separator("TEST 6: NON-ADMIN ACCESS (Should Fail)")
    
    result6 = make_request(
        "GET", 
        f"/api/group-requests/group/{group_id}/",
        headers=user1_headers,
        expected_status=403
    )

def test_without_auth():
    """Test endpoints without authentication (should all fail)"""
    
    print_separator("AUTHENTICATION TESTS (Should All Fail)")
    
    # Test without auth headers
    make_request(
        "POST", 
        "/api/group-requests/", 
        data={"group_id": 1, "message": "test"},
        expected_status=401
    )
    
    make_request(
        "GET", 
        "/api/group-requests/my-requests/",
        expected_status=401
    )
    
    make_request(
        "GET", 
        "/api/group-requests/group/1/",
        expected_status=401
    )

def main():
    """Main test function"""
    print("🧪 Group Request API Test Suite")
    print("================================")
    
    print("\n🔍 Checking if backend is running...")
    
    # Test basic connectivity
    try:
        response = requests.get(f"{BASE_URL}/api/courses/", headers={"Authorization": "Bearer dummy"})
        print(f"✅ Backend is running (status: {response.status_code})")
    except:
        print("❌ Backend is not running! Start with: python run.py")
        return
    
    # Choose test type
    print("\nSelect test to run:")
    print("1. Authentication tests (no tokens needed)")
    print("2. Full functionality tests (requires Firebase tokens)")
    print("3. Both")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice in ['1', '3']:
        test_without_auth()
    
    if choice in ['2', '3']:
        test_group_requests()
    
    print("\n🎉 Test suite completed!")

if __name__ == "__main__":
    main()