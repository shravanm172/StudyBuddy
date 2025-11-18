import { useAuth } from "../auth/AuthProvider";

export default function Landing() {
  const { user, logout } = useAuth();
  return (
    <div style={{ maxWidth: 600, margin: "48px auto" }}>
      <h1>Welcome{user?.email ? `, ${user.email}` : ""} 🎉</h1>
      <p>You’re in. This is the basic landing page.</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}
