// src/pages/ProfilePage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

export default function ProfilePage() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    username: "",
    date_of_birth: "",
    grade: "",
    gender: "",
    coursesText: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // NEW: dynamic enums from backend
  const [enums, setEnums] = useState({ grades: [], genders: [] });
  const [enumsLoading, setEnumsLoading] = useState(false);

  // ---- Load profile and enums on mount ----
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!user) {
        setError("You must be logged in to view your profile.");
        setLoading(false);
        return;
      }

      try {
        // Load enums first
        setEnumsLoading(true);
        const enumsResponse = await fetch(
          "http://localhost:5000/api/users/enums/"
        );
        if (enumsResponse.ok) {
          const enumsData = await enumsResponse.json();
          setEnums(enumsData);
        }
        setEnumsLoading(false);

        // Load profile
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:5000/api/users/me/", {
          headers: {
            Authorization: "Bearer " + token,
          },
        });

        if (res.status === 404) {
          // No profile yet – leave form empty
          setSuccess("No profile found yet. Fill out your details below.");
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load profile.");
        } else {
          setForm({
            username: data.username || "",
            date_of_birth: data.date_of_birth || "", // ISO string yyyy-mm-dd
            grade: data.grade || "",
            gender: data.gender || "",
            coursesText: (data.courses || []).join(", "),
          });
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load data: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ---- Save profile (PUT) ----
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (!user) {
      setError("You must be logged in to update your profile.");
      setSaving(false);
      return;
    }

    const courses = form.coursesText
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c !== "");

    try {
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:5000/api/users/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          username: form.username,
          date_of_birth: form.date_of_birth,
          grade: form.grade,
          gender: form.gender,
          courses,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile.");
      } else {
        setSuccess("Profile updated successfully.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "48px auto" }}>
        <p>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "48px auto" }}>
      <h1>My Profile</h1>

      {error && (
        <p style={{ color: "red", marginTop: 8 }}>
          <strong>Error:</strong> {error}
        </p>
      )}
      {success && <p style={{ color: "limegreen", marginTop: 8 }}>{success}</p>}

      <form onSubmit={handleSave} style={{ marginTop: 24 }}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Username
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Enter a unique username"
            style={{ display: "block", width: "100%", marginTop: 4 }}
            required
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          Date of Birth
          <input
            type="date"
            name="date_of_birth"
            value={form.date_of_birth}
            onChange={handleChange}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          Grade
          <select
            name="grade"
            value={form.grade}
            onChange={handleChange}
            style={{ display: "block", width: "100%", marginTop: 4 }}
            disabled={enumsLoading}
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
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          Gender
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            style={{ display: "block", width: "100%", marginTop: 4 }}
            disabled={enumsLoading}
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
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          Courses (comma-separated course IDs)
          <textarea
            name="coursesText"
            value={form.coursesText}
            onChange={handleChange}
            rows={3}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>

      <hr style={{ margin: "32px 0" }} />

      <ChangePasswordSection />
    </div>
  );
}

// ---- Change Password (Firebase only) ----

function ChangePasswordSection() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleChangePassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user || !user.email) {
      setError("You must be logged in to change your password.");
      return;
    }

    if (newPassword !== confirmNew) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNew("");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        setError("Current password is incorrect.");
      } else if (err.code === "auth/weak-password") {
        setError("New password is too weak.");
      } else if (err.code === "auth/requires-recent-login") {
        setError(
          "Please log out and log in again, then try changing your password."
        );
      } else {
        setError("Failed to change password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Change Password</h2>
      {error && (
        <p style={{ color: "red", marginTop: 8 }}>
          <strong>Error:</strong> {error}
        </p>
      )}
      {success && <p style={{ color: "limegreen", marginTop: 8 }}>{success}</p>}

      <form onSubmit={handleChangePassword} style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Current Password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          New Password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          Confirm New Password
          <input
            type="password"
            value={confirmNew}
            onChange={(e) => setConfirmNew(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Updating…" : "Change Password"}
        </button>
      </form>
    </section>
  );
}
