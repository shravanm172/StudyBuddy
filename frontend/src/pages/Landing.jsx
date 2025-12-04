// This is the main index landing page after a user logs in
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import "./Landing.css";

export default function Landing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState("");

  async function handleTestBackend() {
    setTestError("");
    setTestResult(null);

    if (!user) {
      setTestError("No Firebase user is logged in.");
      return;
    }

    try {
      const token = await user.getIdToken();
      console.log("ID token:", token);

      const res = await fetch("http://localhost:5000/api/users/me/", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setTestError(
          `Backend error (${res.status}): ${data.error || "Unknown error"}`
        );
      } else {
        setTestResult(data);
      }
    } catch (err) {
      console.error(err);
      setTestError("Request failed: " + err.message);
    }
  }

  return (
    <div className="landing-container">
      <h1 className="landing-title">
        Welcome{user?.email ? `, ${user.email}` : ""} 🎉
      </h1>
      <p className="landing-description">
        You're in. This is the basic landing page.
      </p>

      <div className="landing-nav-buttons">
        <button className="landing-button secondary" onClick={logout}>
          Log out
        </button>

        <button className="landing-button" onClick={handleTestBackend}>
          Test Backend /api/users/me
        </button>

        <button className="landing-button" onClick={() => navigate("/account")}>
          Manage Profile
        </button>

        <button className="landing-button" onClick={() => navigate("/people")}>
          People Feed
        </button>

        <button
          className="landing-button"
          onClick={() => navigate("/requests")}
        >
          My Requests
        </button>

        <button className="landing-button" onClick={() => navigate("/groups")}>
          My Groups
        </button>

        <button
          className="landing-button"
          onClick={() => navigate("/group-feed")}
        >
          Find Groups
        </button>
      </div>

      {testError && (
        <div className="landing-error">
          <strong>Error:</strong> {testError}
        </div>
      )}

      {testResult && (
        <pre className="landing-test-result">
          {JSON.stringify(testResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
