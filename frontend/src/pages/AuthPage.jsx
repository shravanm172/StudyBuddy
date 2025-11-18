import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import "../auth.css";

export default function AuthPage() {
  const { user, initializing, login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [gender, setGender] = useState("");
  const [courses, setCourses] = useState([]); // array of strings/ids
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nav = useNavigate();

  useEffect(() => {
    if (user) nav("/landing", { replace: true });
  }, [user, nav]);

  const toggleCourse = (c) =>
    setCourses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  // NEW: block UI until Firebase resolves initial state
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
        // optional immediate redirect (useEffect will also handle it):
        // nav("/landing", { replace: true });
      } else {
        if (!age || !grade || !school || !gender) {
          throw new Error("Please complete all biodata fields.");
        }
        if (!courses.length) {
          throw new Error("Select at least one course.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await signup(email, password, {
          age: Number(age),
          grade,
          school,
          gender,
          courses,
        });
        // optional immediate redirect:
        // nav("/landing", { replace: true });
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
            <input
              className="auth-input"
              type="number"
              min="10"
              max="120"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              disabled={submitting}
            />
            <input
              className="auth-input"
              placeholder="Grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
              disabled={submitting}
            />
            <input
              className="auth-input"
              placeholder="School"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              required
              disabled={submitting}
            />
            <select
              className="auth-input"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              disabled={submitting}
            >
              <option value="" disabled>
                Gender
              </option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="nonbinary">Non-binary</option>
              <option value="prefer-not">Prefer not to say</option>
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
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          disabled={submitting}
        >
          {mode === "login" ? "Sign Up" : "Log In"}
        </button>
      </p>
    </div>
  );
}
