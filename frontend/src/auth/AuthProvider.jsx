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

  // ✅ Signup that also creates the Postgres profile, with server verification
  const signup = async (email, password, profile) => {
    // profile = { age, grade, school, gender, courses: [...] }
    if (!profile?.courses?.length) {
      throw new Error("Please select at least one course.");
    }

    // 1) Create Firebase user
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const u = cred.user;

    try {
      // 2) (Optional) set display name; don’t fail signup if this fails
      try {
        await updateProfile(u, { displayName: email });
      } catch {
        /* non-fatal */
      }

      // 3) Get ID token for backend verification (important!)
      const idToken = await u.getIdToken();
      console.log(
        "🔑 Firebase ID Token obtained:",
        idToken.substring(0, 20) + "..."
      );

      // 4) Tell backend to create Postgres profile.
      const payload = {
        uid: u.uid,
        email: u.email,
        ...profile, // date_of_birth, grade, gender, courses
      };

      console.log("📤 Sending payload to backend:", payload);
      console.log("🌐 Making request to: http://localhost:5000/api/users/");

      const res = await fetch("http://localhost:5000/api/users/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("📥 Response status:", res.status);
      console.log("📥 Response ok:", res.ok);

      if (!res.ok) {
        let errorMsg;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || "Unknown error";
          console.log("❌ Backend error response:", errorData);
        } catch {
          errorMsg = await res.text();
          console.log("❌ Backend error text:", errorMsg);
        }
        throw new Error(`Backend error (${res.status}): ${errorMsg}`);
      }

      const responseData = await res.json();
      console.log("✅ Backend success response:", responseData);

      // Optional: avoid UI flash before onAuthStateChanged fires
      setUser(u);
      return u;
    } catch (err) {
      // Single rollback to avoid double-delete USER_NOT_FOUND noise
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
