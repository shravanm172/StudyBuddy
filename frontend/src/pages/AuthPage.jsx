/*
 * Authentication page handling login and signup/account creation flows.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import "../auth.css";
import "./AuthPage.css";

export default function AuthPage() {
  const { user, initializing, login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [grade, setGrade] = useState("");
  const [gender, setGender] = useState("");
  const [courses, setCourses] = useState([]);

  const [enums, setEnums] = useState({ grades: [], genders: [] });
  const [enumsLoading, setEnumsLoading] = useState(false);

  const [availableCourses, setAvailableCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nav = useNavigate();

  useEffect(() => {
    if (user) nav("/groups", { replace: true });
  }, [user, nav]);

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

  useEffect(() => {
    async function loadCourses() {
      if (mode !== "signup") return;

      setCoursesLoading(true);
      try {
        const response = await fetch(
          "http://localhost:5000/api/courses/available/"
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableCourses(data.courses);
        } else {
          console.error("Failed to load courses");
        }
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setCoursesLoading(false);
      }
    }

    loadCourses();
  }, [mode]);

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

  // Debounce username check to avoid excessive API calls
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
      } else {
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

        await signup(email, password, {
          username,
          date_of_birth: dateOfBirth,
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
            <div className="username-input-container">
              <input
                className={`auth-input username-input-with-validation ${
                  usernameAvailable === false
                    ? "taken"
                    : usernameAvailable === true
                    ? "available"
                    : ""
                }`}
                placeholder="Username (min 3 chars)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={submitting}
              />
              {usernameChecking && (
                <span className="username-checking-indicator">Checking...</span>
              )}
              {usernameAvailable === false && (
                <span className="username-feedback taken">
                  Username is taken
                </span>
              )}
              {usernameAvailable === true && (
                <span className="username-feedback available">
                  Username available!
                </span>
              )}
            </div>

            <input
              className="auth-input"
              type="date"
              placeholder="Date of Birth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              disabled={submitting}
            />

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
              {coursesLoading ? (
                <p
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  Loading courses...
                </p>
              ) : availableCourses.length > 0 ? (
                availableCourses.map((course) => (
                  <label key={course.course_id}>
                    <input
                      type="checkbox"
                      checked={courses.includes(course.course_id)}
                      onChange={() => toggleCourse(course.course_id)}
                      disabled={submitting}
                    />{" "}
                    {course.course_id} - {course.title}
                  </label>
                ))
              ) : (
                <p
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  No courses available
                </p>
              )}
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
