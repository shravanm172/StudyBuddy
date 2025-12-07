/*
  User profile management page with editable fields and password change functionality.
*/

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProfilePage.css";

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

  const [enums, setEnums] = useState({ grades: [], genders: [] });
  const [enumsLoading, setEnumsLoading] = useState(false);

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
        setEnumsLoading(true);
        const enumsResponse = await fetch(
          "http://localhost:5000/api/users/enums/"
        );
        if (enumsResponse.ok) {
          const enumsData = await enumsResponse.json();
          setEnums(enumsData);
        }
        setEnumsLoading(false);

        const token = await user.getIdToken();
        const res = await fetch("http://localhost:5000/api/users/me/", {
          headers: {
            Authorization: "Bearer " + token,
          },
        });

        if (res.status === 404) {
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
            date_of_birth: data.date_of_birth || "",
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
      <div className="profile-page-container">
        <LoadingSpinner message="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      <h1 className="profile-page-title">My Profile</h1>

      {error && (
        <div className="profile-page-error">
          <strong>Error:</strong> {error}
        </div>
      )}
      {success && <div className="profile-page-success">{success}</div>}

      <form onSubmit={handleSave} className="profile-page-form">
        <label className="profile-page-form-group">
          <span className="profile-page-label">Username</span>
          <input
            className="profile-page-input"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Enter a unique username"
            required
          />
        </label>

        <label className="profile-page-form-group">
          <span className="profile-page-label">Date of Birth</span>
          <input
            className="profile-page-input"
            type="date"
            name="date_of_birth"
            value={form.date_of_birth}
            onChange={handleChange}
          />
        </label>

        <label className="profile-page-form-group">
          <span className="profile-page-label">Grade</span>
          <select
            className="profile-page-select"
            name="grade"
            value={form.grade}
            onChange={handleChange}
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

        <label className="profile-page-form-group">
          <span className="profile-page-label">Gender</span>
          <select
            className="profile-page-select"
            name="gender"
            value={form.gender}
            onChange={handleChange}
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

        <label className="profile-page-form-group">
          <span className="profile-page-label">
            Courses (comma-separated course IDs)
          </span>
          <textarea
            className="profile-page-textarea"
            name="coursesText"
            value={form.coursesText}
            onChange={handleChange}
            rows={3}
          />
        </label>

        <button
          type="submit"
          className="profile-page-submit-button"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>

      <hr className="profile-page-divider" />

      <ChangePasswordSection />
    </div>
  );
}

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
    <section className="password-change-section">
      <h2 className="password-change-title">Change Password</h2>
      {error && (
        <div className="profile-page-error">
          <strong>Error:</strong> {error}
        </div>
      )}
      {success && <div className="profile-page-success">{success}</div>}

      <form onSubmit={handleChangePassword} className="password-change-form">
        <label className="profile-page-form-group">
          <span className="profile-page-label">Current Password</span>
          <input
            className="profile-page-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>

        <label className="profile-page-form-group">
          <span className="profile-page-label">New Password</span>
          <input
            className="profile-page-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>

        <label className="profile-page-form-group">
          <span className="profile-page-label">Confirm New Password</span>
          <input
            className="profile-page-input"
            type="password"
            value={confirmNew}
            onChange={(e) => setConfirmNew(e.target.value)}
          />
        </label>

        <button
          type="submit"
          className="profile-page-submit-button"
          disabled={loading}
        >
          {loading ? "Updating…" : "Change Password"}
        </button>
      </form>
    </section>
  );
}
