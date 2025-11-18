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

      // 4) Tell backend to create Postgres profile.
      //    - Send Authorization: Bearer <idToken>
      //    - Include credentials if server sets a session cookie here.
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include", // keep if server sets cookies here; remove if not needed
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: u.uid, // 👈 NEW: backend expects this
          email: u.email, // use the actual Firebase email
          ...profile, // age, grade, school, gender, courses
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        // just throw; rollback handled in catch
        throw new Error(msg || "Failed to create profile.");
      }

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
