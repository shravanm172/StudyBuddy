# app/firebase_auth.py

import firebase_admin
from firebase_admin import auth, credentials
from flask import request, g
import os
from functools import wraps   # move this to the top

# Initialize Firebase Admin app ONLY once
if not firebase_admin._apps:
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    firebase_admin.initialize_app(credentials.Certificate(cred_path))


def firebase_auth_required(f):
    """
    Decorator that:
    1. Extracts Authorization: Bearer <token>
    2. Verifies token with Firebase
    3. Stores uid + email into g.*
    """

    @wraps(f)
    def wrapper(*args, **kwargs):
        # 🔴 IMPORTANT: Let CORS preflight through with no auth
        if request.method == "OPTIONS":
            # 204 No Content is fine; Flask-CORS (if you use it) will add headers
            return ("", 204)

        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return {"error": "Missing or invalid Authorization header"}, 401

        token = auth_header.split(" ", 1)[1]

        try:
            decoded = auth.verify_id_token(token)
        except Exception as e:
            print("Token verification error:", e)
            return {"error": "Invalid or expired token"}, 401

        # Inject into global request context
        g.firebase_uid = decoded.get("uid")
        g.firebase_email = decoded.get("email")

        return f(*args, **kwargs)

    return wrapper
