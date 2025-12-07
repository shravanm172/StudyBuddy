// ProtectedRoute provides individual route protection for authenticated users
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (!user) {
    // Not logged in: redirect back to AuthPage at "/"
    return <Navigate to="/" replace />;
  }

  // Logged in: render the protected route
  return children;
}
