// src/pages/Landing.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

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
    <div style={{ maxWidth: 600, margin: "48px auto" }}>
      <h1>Welcome{user?.email ? `, ${user.email}` : ""} 🎉</h1>
      <p>You’re in. This is the basic landing page.</p>

      <button onClick={logout} style={{ marginRight: 16 }}>
        Log out
      </button>

      <button onClick={handleTestBackend} style={{ marginRight: 16 }}>
        Test Backend /api/users/me
      </button>

      <button onClick={() => navigate("/account")} style={{ marginRight: 16 }}>
        Manage Profile
      </button>

      <button onClick={() => navigate("/people")} style={{ marginRight: 16 }}>
        People Feed
      </button>

      <button onClick={() => navigate("/requests")} style={{ marginRight: 16 }}>
        My Requests
      </button>

      <button onClick={() => navigate("/groups")} style={{ marginRight: 16 }}>
        My Groups
      </button>

      <button onClick={() => navigate("/group-feed")}>Find Groups</button>

      {testError && (
        <p style={{ color: "red", marginTop: 16 }}>
          <strong>Error:</strong> {testError}
        </p>
      )}

      {testResult && (
        <pre
          style={{
            background: "#111",
            color: "#0f0",
            padding: "12px",
            marginTop: 16,
            borderRadius: 8,
          }}
        >
          {JSON.stringify(testResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
