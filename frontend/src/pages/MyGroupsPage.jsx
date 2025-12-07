/*
 * Show all study groups the current user is a member of withrole badges (admin/member) and group metadata.
 * Provides quick navigation to individual group pages.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { HiUsers, HiRefresh } from "react-icons/hi";
import LoadingSpinner from "../components/LoadingSpinner";
import "./MyGroupsPage.css";

export default function MyGroupsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUserGroups() {
      if (!user) {
        setError("You must be logged in to view your groups.");
        setLoading(false);
        return;
      }

      await refreshGroups();
    }

    loadUserGroups();
  }, [user]);

  const refreshGroups = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();

      const response = await fetch(
        "http://localhost:5000/api/groups/user-groups/",
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setError("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load groups.");
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
      setError("Failed to load groups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewGroup = (group) => {
    navigate(`/groups/${group.id}`);
  };

  const getRoleBadgeClass = (role) => {
    if (role === "admin") {
      return "my-groups-role-badge admin";
    } else {
      return "my-groups-role-badge member";
    }
  };

  const getPrivacyText = (privacy) => {
    return privacy === "private" ? "Private" : "Public";
  };

  const getVisibilityText = (isVisible) => {
    return isVisible ? "Visible on feed" : "Private group";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="my-groups-container">
        <LoadingSpinner message="Loading your groups..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-groups-container">
        <div className="my-groups-error-container">
          <h1>My Groups</h1>
          <div className="my-groups-error">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-groups-container">
      <header className="my-groups-header">
        <div className="my-groups-header-content">
          <div>
            <h1 className="my-groups-title">My Study Groups</h1>
          </div>
          <button
            className="my-groups-refresh-button"
            onClick={refreshGroups}
            disabled={loading}
            title="Refresh groups"
          >
            <HiRefresh />
          </button>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="my-groups-empty-state">
          <h2>No groups yet</h2>
          <p>
            You haven't joined any study groups yet. Start by connecting with
            study buddies!
          </p>
          <button
            className="my-groups-primary-button"
            onClick={() => navigate("/people")}
          >
            Find Study Buddies
          </button>
        </div>
      ) : (
        <>
          <div className="my-groups-info">
            <p>
              You're a member of <strong>{groups.length}</strong> study group
              {groups.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="my-groups-container-list">
            {groups.map((group) => (
              <div key={group.id} className="my-groups-card">
                <div className="my-groups-card-header">
                  <div className="my-groups-card-title">
                    <h3 className="my-groups-card-name">{group.name}</h3>
                    <span className={getRoleBadgeClass(group.user_role)}>
                      {group.user_role}
                    </span>
                  </div>
                  <div className="my-groups-card-meta">
                    <span className="my-groups-member-count">
                      <HiUsers /> {group.member_count} member
                      {group.member_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {group.description && (
                  <div className="my-groups-description">
                    {group.description}
                  </div>
                )}

                <div className="my-groups-info-grid">
                  <div className="my-groups-info-item">
                    <strong>Privacy:</strong> {getPrivacyText(group.privacy)}
                  </div>
                  <div className="my-groups-info-item">
                    <strong>Visibility:</strong>{" "}
                    {getVisibilityText(group.is_visible)}
                  </div>
                  <div className="my-groups-info-item">
                    <strong>Joined:</strong> {formatDate(group.joined_at)}
                  </div>
                  <div className="my-groups-info-item">
                    <strong>Created:</strong> {formatDate(group.created_at)}
                  </div>
                </div>

                <div className="my-groups-actions">
                  <button
                    className="my-groups-view-button"
                    onClick={() => handleViewGroup(group)}
                  >
                    View Group
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
