#!/usr/bin/env python3
"""
Test script for DirectRequest API endpoints
Run this from the backend directory: python test_direct_request_api.py
"""

import requests
import json
import sys

# Test configuration
BASE_URL = "http://localhost:5000"
HEADERS = {
    "Content-Type": "application/json"
}

# You'll need to replace these with actual Firebase ID tokens
# For now, we'll use mock tokens (this will fail auth, but we can see the endpoints respond)
MOCK_TOKEN_1 = "mock_token_user_1"  # Would be smaharaj's token
MOCK_TOKEN_2 = "mock_token_user_2"  # Would be harrym's token

# Real UIDs from our database
USER_1_UID = "SiLt229dCEcuZ95TftzkXQbvw1V2"  # smaharaj
USER_2_UID = "S0JgjUEZAFSNxzoyazkooVFcPaF3"  # harrym

def test_send_request():
    """Test POST /api/requests/ - Send a new request"""
    print("\n🧪 Testing POST /api/requests/ - Send Request")
    print("=" * 50)
    
    url = f"{BASE_URL}/api/requests/"
    headers = {
        **HEADERS,
        "Authorization": f"Bearer {MOCK_TOKEN_1}"
    }
    payload = {
        "receiver_uid": USER_2_UID,
        "message": "Hey! Want to study together for our shared courses?"
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code, response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def test_get_incoming_requests():
    """Test GET /api/requests/incoming/ - Get incoming requests"""
    print("\n🧪 Testing GET /api/requests/incoming/ - Get Incoming Requests")
    print("=" * 50)
    
    url = f"{BASE_URL}/api/requests/incoming/"
    headers = {
        **HEADERS,
        "Authorization": f"Bearer {MOCK_TOKEN_2}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code, response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def test_get_outgoing_requests():
    """Test GET /api/requests/outgoing/ - Get outgoing requests"""
    print("\n🧪 Testing GET /api/requests/outgoing/ - Get Outgoing Requests")
    print("=" * 50)
    
    url = f"{BASE_URL}/api/requests/outgoing/"
    headers = {
        **HEADERS,
        "Authorization": f"Bearer {MOCK_TOKEN_1}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code, response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def test_accept_request():
    """Test PUT /api/requests/{id}/accept/ - Accept a request"""
    print("\n🧪 Testing PUT /api/requests/{id}/accept/ - Accept Request")
    print("=" * 50)
    
    # We'll use request ID 1 (assuming it exists)
    request_id = 1
    url = f"{BASE_URL}/api/requests/{request_id}/accept/"
    headers = {
        **HEADERS,
        "Authorization": f"Bearer {MOCK_TOKEN_2}"
    }
    
    try:
        response = requests.put(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code, response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def test_endpoints_exist():
    """Test that all endpoints respond (even if with auth errors)"""
    print("🚀 Testing DirectRequest API Endpoints")
    print("=" * 80)
    print("Note: These will show auth errors since we're using mock tokens,")
    print("but we can verify the endpoints exist and respond correctly.")
    print("=" * 80)
    
    # Test 1: Send Request
    test_send_request()
    
    # Test 2: Get Incoming Requests  
    test_get_incoming_requests()
    
    # Test 3: Get Outgoing Requests
    test_get_outgoing_requests()
    
    # Test 4: Accept Request (will likely fail due to auth + non-existent request)
    test_accept_request()
    
    print("\n" + "=" * 80)
    print("🎯 Endpoint Test Summary:")
    print("- If you see 401 errors, that's expected (mock tokens)")
    print("- If you see 404 errors, the endpoints don't exist") 
    print("- If you see other status codes, the endpoints are working!")
    print("=" * 80)

if __name__ == "__main__":
    test_endpoints_exist()