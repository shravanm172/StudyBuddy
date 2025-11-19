// src/pages/MyGroupsPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function MyGroupsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load user's groups on component mount
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

  // Function to refresh groups data
  const refreshGroups = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();

      const response = await fetch("http://localhost:5000/api/groups/user-groups/", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

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

  const getRoleBadgeStyle = (role) => {
    const baseStyle = {
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase",
    };

    if (role === "admin") {
      return { ...baseStyle, backgroundColor: "#fff3cd", color: "#856404", border: "1px solid #ffeaa7" };
    } else {
      return { ...baseStyle, backgroundColor: "#d1edff", color: "#0c5460", border: "1px solid #bee5eb" };
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
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <p>Loading your groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h1>My Groups</h1>
          <p style={styles.error}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>My Study Groups</h1>
        <p style={styles.subtitle}>
          Manage your study groups and collaborate with your study buddies
        </p>
      </header>

      {groups.length === 0 ? (
        <div style={styles.emptyState}>
          <h2>No groups yet</h2>
          <p>
            You haven't joined any study groups yet. Start by connecting with study buddies!
          </p>
          <button
            style={styles.primaryButton}
            onClick={() => navigate("/people")}
          >
            Find Study Buddies
          </button>
        </div>
      ) : (
        <>
          <div style={styles.groupsInfo}>
            <p>
              You're a member of <strong>{groups.length}</strong> study group
              {groups.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div style={styles.groupsContainer}>
            {groups.map((group) => (
              <div key={group.id} style={styles.groupCard}>
                <div style={styles.groupHeader}>
                  <div style={styles.groupTitle}>
                    <h3 style={styles.groupName}>{group.name}</h3>
                    <span style={getRoleBadgeStyle(group.user_role)}>
                      {group.user_role}
                    </span>
                  </div>
                  <div style={styles.groupMeta}>
                    <span style={styles.memberCount}>
                      👥 {group.member_count} member{group.member_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {group.description && (
                  <div style={styles.groupDescription}>
                    {group.description}
                  </div>
                )}

                <div style={styles.groupInfo}>
                  <div style={styles.groupDetail}>
                    <strong>Privacy:</strong> {getPrivacyText(group.privacy)}
                  </div>
                  <div style={styles.groupDetail}>
                    <strong>Visibility:</strong> {getVisibilityText(group.is_visible)}
                  </div>
                  <div style={styles.groupDetail}>
                    <strong>Joined:</strong> {formatDate(group.joined_at)}
                  </div>
                  <div style={styles.groupDetail}>
                    <strong>Created:</strong> {formatDate(group.created_at)}
                  </div>
                </div>

                <div style={styles.groupActions}>
                  <button
                    style={styles.viewButton}
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

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "20px",
  },
  loadingContainer: {
    textAlign: "center",
    padding: "60px 20px",
  },
  errorContainer: {
    textAlign: "center",
    padding: "40px 20px",
  },
  header: {
    textAlign: "center",
    marginBottom: "40px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e0e0e0",
  },
  subtitle: {
    color: "#666",
    fontSize: "16px",
    margin: "8px 0 0 0",
  },
  error: {
    color: "red",
    marginTop: "8px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "12px",
    color: "#666",
  },
  primaryButton: {
    marginTop: "20px",
    padding: "12px 24px",
    backgroundColor: "#007acc",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  groupsInfo: {
    textAlign: "center",
    marginBottom: "30px",
    color: "#555",
  },
  groupsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  groupCard: {
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    padding: "24px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  groupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  groupTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
  },
  groupName: {
    margin: "0",
    fontSize: "20px",
    color: "#333",
    fontWeight: "600",
  },
  groupMeta: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  memberCount: {
    fontSize: "14px",
    color: "#666",
    fontWeight: "500",
  },
  groupDescription: {
    backgroundColor: "#f8f9fa",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#555",
  },
  groupInfo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "20px",
  },
  groupDetail: {
    fontSize: "14px",
    color: "#666",
  },
  groupActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  viewButton: {
    padding: "8px 16px",
    backgroundColor: "#007acc",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
};

// Add hover effects
styles.groupCard[":hover"] = {
  transform: "translateY(-2px)",
  boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
};

styles.primaryButton[":hover"] = {
  backgroundColor: "#0056b3",
};

styles.viewButton[":hover"] = {
  backgroundColor: "#0056b3",
};