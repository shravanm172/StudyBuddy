import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import "../auth.css";

export default function AuthPage() {
  const { user, initializing, login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // NEW: username field
  const [username, setUsername] = useState("");

  // UPDATED: use date_of_birth instead of age, remove school
  const [dateOfBirth, setDateOfBirth] = useState(""); // "YYYY-MM-DD"
  const [grade, setGrade] = useState("");
  const [gender, setGender] = useState("");
  const [courses, setCourses] = useState([]); // array of strings/ids

  // NEW: dynamic enums from backend
  const [enums, setEnums] = useState({ grades: [], genders: [] });
  const [enumsLoading, setEnumsLoading] = useState(false);

  // NEW: username validation
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nav = useNavigate();

  useEffect(() => {
    if (user) nav("/landing", { replace: true });
  }, [user, nav]);

  // NEW: Load enums from backend
  useEffect(() => {
    async function loadEnums() {
      if (mode !== "signup") return;

      setEnumsLoading(true);
      try {
        const response = await fetch("http://localhost:5000/api/users/enums/");
        if (response.ok) {
          const data = await response.json();
          setEnums(data);
        } else {
          console.error("Failed to load enums");
        }
      } catch (error) {
        console.error("Error loading enums:", error);
      } finally {
        setEnumsLoading(false);
      }
    }

    loadEnums();
  }, [mode]);

  // NEW: Check username availability
  const checkUsername = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/users/check-username/${encodeURIComponent(
          username
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        setUsernameAvailable(data.available);
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  // NEW: Debounced username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (mode === "signup" && username) {
        checkUsername(username);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, mode]);

  const toggleCourse = (c) =>
    setCourses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  // Block UI until Firebase resolves initial state
  if (initializing) {
    return <div className="auth-container">Loading…</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        await login(email, password);
        // useEffect will redirect once user is set
      } else {
        // ✅ Validation: username, dateOfBirth, grade, gender required
        if (!username || !dateOfBirth || !grade || !gender) {
          throw new Error("Please complete all required fields.");
        }
        if (username.length < 3) {
          throw new Error("Username must be at least 3 characters.");
        }
        if (usernameAvailable === false) {
          throw new Error("Username is already taken.");
        }
        if (!courses.length) {
          throw new Error("Select at least one course.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }

        // ✅ Payload matches backend schema: username, date_of_birth, grade, gender, courses
        await signup(email, password, {
          username,
          date_of_birth: dateOfBirth, // "YYYY-MM-DD"
          grade,
          gender,
          courses,
        });
      }
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{mode === "login" ? "Log In" : "Sign Up"}</h2>

      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={submitting}
        />

        <input
          className="auth-input"
          type="password"
          placeholder="Password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={submitting}
        />

        {mode === "signup" && (
          <>
            {/* NEW: Username field with availability check */}
            <div style={{ position: "relative" }}>
              <input
                className="auth-input"
                placeholder="Username (min 3 chars)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={submitting}
                style={{
                  borderColor:
                    usernameAvailable === false
                      ? "#ff6b6b"
                      : usernameAvailable === true
                      ? "#51cf66"
                      : "",
                }}
              />
              {usernameChecking && (
                <span
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "12px",
                  }}
                >
                  Checking...
                </span>
              )}
              {usernameAvailable === false && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#ff6b6b",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Username is taken
                </span>
              )}
              {usernameAvailable === true && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#51cf66",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Username available!
                </span>
              )}
            </div>

            {/* ✅ DOB instead of age */}
            <input
              className="auth-input"
              type="date"
              placeholder="Date of Birth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              disabled={submitting}
            />

            {/* UPDATED: Dynamic grade dropdown */}
            <select
              className="auth-input"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
              disabled={submitting || enumsLoading}
            >
              <option value="" disabled>
                {enumsLoading ? "Loading grades..." : "Select Grade"}
              </option>
              {enums.grades.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {/* UPDATED: Dynamic gender dropdown */}
            <select
              className="auth-input"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              disabled={submitting || enumsLoading}
            >
              <option value="" disabled>
                {enumsLoading ? "Loading genders..." : "Select Gender"}
              </option>
              {enums.genders.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div className="course-box">
              <label>
                <input
                  type="checkbox"
                  checked={courses.includes("CSE2010")}
                  onChange={() => toggleCourse("CSE2010")}
                  disabled={submitting}
                />{" "}
                CSE2010
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={courses.includes("CSE4001")}
                  onChange={() => toggleCourse("CSE4001")}
                  disabled={submitting}
                />{" "}
                CSE4001
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={courses.includes("PHY2002")}
                  onChange={() => toggleCourse("PHY2002")}
                  disabled={submitting}
                />{" "}
                PHY2002
              </label>
            </div>
          </>
        )}

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting
            ? "Please wait…"
            : mode === "login"
            ? "Log In"
            : "Create Account"}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <p className="toggle-text">
        {mode === "login" ? "Don't have an account?" : "Already registered?"}
        <button
          type="button"
          className="toggle-btn"
          onClick={() =>
            setMode((prev) => (prev === "login" ? "signup" : "login"))
          }
          disabled={submitting}
        >
          {mode === "login" ? "Sign Up" : "Log In"}
        </button>
      </p>
    </div>
  );
}
