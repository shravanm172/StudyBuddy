import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import "./TopBar.css";

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <h1 className="app-title">StudyBuddy</h1>
      </div>
      <div className="top-bar-right">
        <span className="username-display">
          {user?.displayName || user?.email || "User"}
        </span>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
