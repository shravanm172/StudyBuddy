import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function AuthGate() {
  const { user, initializing } = useAuth();
  if (initializing) return <div style={{ padding: 24 }}>Loading…</div>;
  return user ? (
    <Navigate to="/groups" replace />
  ) : (
    <Navigate to="/login" replace />
  );
}
