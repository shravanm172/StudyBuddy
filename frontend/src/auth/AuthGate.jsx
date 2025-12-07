// Redirects user on app load based on auth state
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function AuthGate() {
  const { user, initializing } = useAuth();
  if (initializing) return <div style={{ padding: 24 }}>Loading…</div>; // loading: checking auth state
  return user ? (
    <Navigate to="/groups" replace /> // if authenticated, redirect to my groups page
  ) : (
    <Navigate to="/login" replace /> // if not authenticated, redirect to login page
  );
}
