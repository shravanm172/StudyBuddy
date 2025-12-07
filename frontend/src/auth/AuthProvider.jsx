/*
 * Manages Firebase authentication state and user session lifecycle.
 * Provides login, signup, and logout methods via React context.
 * Coordinates Firebase auth with backend Postgres user profiles.
 */

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setInitializing(false);
    });
    return unsub;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  // Creates Firebase user and corresponding Postgres profile with server verification
  const signup = async (email, password, profile) => {
    if (!profile?.courses?.length) {
      throw new Error("Please select at least one course.");
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const u = cred.user;

    // Set display name as email address
    try {
      try {
        await updateProfile(u, { displayName: email });
      } catch {}

      // Get ID token for backend verification
      const idToken = await u.getIdToken();
      console.log(
        "Firebase ID Token obtained:",
        idToken.substring(0, 20) + "..."
      );

      // Tell backend to create Postgres profile.
      const payload = {
        uid: u.uid,
        email: u.email,
        ...profile, // date_of_birth, grade, gender, courses
      };

      const res = await fetch("http://localhost:5000/api/users/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      console.log(" Response status:", res.status);
      console.log(" Response ok:", res.ok);

      if (!res.ok) {
        let errorMsg;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || "Unknown error";
          console.log("Backend error:", errorData);
        } catch {
          errorMsg = await res.text();
          console.log("Backend error text:", errorMsg);
        }
        throw new Error(`Backend error (${res.status}): ${errorMsg}`);
      }

      const responseData = await res.json();
      console.log("User created successfully:", responseData);

      setUser(u);
      return u;
    } catch (err) {
      try {
        await u.delete();
      } catch {
        /* ignore rollback failure */
      }
      throw err;
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthCtx.Provider value={{ user, initializing, login, signup, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
