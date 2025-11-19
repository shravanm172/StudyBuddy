// src/pages/GroupViewPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate, useParams } from "react-router-dom";

export default function GroupViewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  // Load group details and members
  useEffect(() => {
    async function loadGroupData() {
      if (!user || !groupId) {
        setError("Invalid group or not logged in.");
        setLoading(false);
        return;
      }

      await refreshGroupData();
    }

    loadGroupData();
  }, [user, groupId]);

  // Function to refresh group data
  const refreshGroupData = async () => {
    if (!user || !groupId) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();

      // Use the new group details endpoint
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/`, {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Group API response:", data); // Debug log
        
        // Extract group data from the wrapper
        const groupData = data.group || data;
        setGroup(groupData);
        
        // Check if members array exists and find current user's role
        if (groupData.members && Array.isArray(groupData.members)) {
          const currentMember = groupData.members.find(member => 
            member.user_uid === user.uid || member.user_id === user.uid
          );
          setCurrentUserRole(currentMember ? currentMember.role : null);
          setMembers(groupData.members);
          
          // Add current user's join date to group data for display
          if (currentMember && currentMember.joined_at) {
            groupData.user_joined_at = currentMember.joined_at;
          }
        } else {
          console.warn("No members array found in response:", groupData);
          setMembers([]);
          setCurrentUserRole(null);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load group.");
      }
    } catch (err) {
      console.error("Failed to load group:", err);
      setError("Failed to load group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !groupId) return;
    
    const confirmLeave = window.confirm(
      currentUserRole === "admin" 
        ? "As an admin, leaving will transfer admin rights to the earliest member. Are you sure?"
        : "Are you sure you want to leave this group?"
    );
    
    if (!confirmLeave) return;

    setLoadingAction("leaving");
    
    try {
      // In a full implementation, this would call a leave group endpoint
      // For now, we'll just show a message
      alert("Leave group functionality would be implemented here");
      // navigate("/groups");
    } catch (err) {
      console.error("Error leaving group:", err);
      alert("Failed to leave group. Please try again.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleToggleVisibility = async () => {
    if (!user || !groupId || currentUserRole !== "admin") return;

    setLoadingAction("toggling_visibility");
    
    try {
      // In a full implementation, this would call an update group endpoint
      alert("Toggle visibility functionality would be implemented here");
    } catch (err) {
      console.error("Error updating visibility:", err);
      alert("Failed to update visibility. Please try again.");
    } finally {
      setLoadingAction("");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Unknown";
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Unknown";
      }
      return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
      console.warn("Error formatting date:", dateString, error);
      return "Unknown";
    }
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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <p>Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h1>Group Details</h1>
          <p style={styles.error}>
            <strong>Error:</strong> {error}
          </p>
          <button style={styles.backButton} onClick={() => navigate("/groups")}>
            Back to My Groups
          </button>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h1>Group Not Found</h1>
          <p>The group you're looking for doesn't exist or you don't have access to it.</p>
          <button style={styles.backButton} onClick={() => navigate("/groups")}>
            Back to My Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerSection}>
        <button style={styles.backButton} onClick={() => navigate("/groups")}>
          ← Back to My Groups
        </button>
        
        <div style={styles.groupHeader}>
          <div style={styles.groupTitleSection}>
            <h1 style={styles.groupTitle}>{group.name}</h1>
            <span style={getRoleBadgeStyle(currentUserRole)}>
              {currentUserRole}
            </span>
          </div>
          
          {group.description && (
            <div style={styles.groupDescription}>
              {group.description}
            </div>
          )}
        </div>
      </div>

      {/* Group Info */}
      <div style={styles.infoSection}>
        <h2 style={styles.sectionTitle}>Group Information</h2>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <strong>Privacy:</strong> {group.privacy === "private" ? "Private" : "Public"}
          </div>
          <div style={styles.infoItem}>
            <strong>Visibility:</strong> {group.is_visible ? "Visible on feed" : "Private group"}
          </div>
          <div style={styles.infoItem}>
            <strong>Created:</strong> {formatDate(group.created_at)}
          </div>
          <div style={styles.infoItem}>
            <strong>Your join date:</strong> {formatDate(group.user_joined_at)}
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div style={styles.membersSection}>
        <h2 style={styles.sectionTitle}>
          Members ({group.member_count || members.length})
        </h2>
        
        <div style={styles.membersList}>
          {members.map((member, index) => (
            <div key={member.user_uid || member.user_id || index} style={styles.memberCard}>
              <div style={styles.memberInfo}>
                <div style={styles.memberAvatar}>
                  {(member.username || member.user_uid || member.user_id).charAt(0).toUpperCase()}
                </div>
                <div style={styles.memberDetails}>
                  <h4 style={styles.memberName}>@{member.username || member.user_uid || member.user_id}</h4>
                  <p style={styles.memberJoinDate}>
                    Joined {formatDate(member.joined_at)}
                  </p>
                </div>
              </div>
              <span style={getRoleBadgeStyle(member.role)}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions Section */}
      <div style={styles.actionsSection}>
        <h2 style={styles.sectionTitle}>Actions</h2>
        
        <div style={styles.actionButtons}>
          {currentUserRole === "admin" && (
            <button
              style={styles.adminButton}
              onClick={handleToggleVisibility}
              disabled={loadingAction === "toggling_visibility"}
            >
              {loadingAction === "toggling_visibility" 
                ? "Updating..." 
                : `Make ${group.is_visible ? "Private" : "Public"}`}
            </button>
          )}
          
          <button
            style={styles.leaveButton}
            onClick={handleLeaveGroup}
            disabled={loadingAction === "leaving"}
          >
            {loadingAction === "leaving" ? "Leaving..." : "Leave Group"}
          </button>
        </div>
        
        {currentUserRole === "admin" && (
          <p style={styles.adminNote}>
            💡 As an admin, you can change group visibility. Leaving will transfer admin rights to the earliest member.
          </p>
        )}
      </div>
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
  error: {
    color: "red",
    marginTop: "8px",
  },
  headerSection: {
    marginBottom: "30px",
  },
  backButton: {
    padding: "8px 16px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    marginBottom: "20px",
    transition: "background-color 0.2s ease",
  },
  groupHeader: {
    backgroundColor: "#f8f9fa",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid #e0e0e0",
  },
  groupTitleSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "12px",
  },
  groupTitle: {
    margin: "0",
    fontSize: "28px",
    color: "#333",
    fontWeight: "600",
  },
  groupDescription: {
    fontSize: "16px",
    color: "#555",
    lineHeight: "1.5",
  },
  infoSection: {
    marginBottom: "30px",
  },
  sectionTitle: {
    fontSize: "20px",
    color: "#333",
    marginBottom: "16px",
    fontWeight: "600",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  infoItem: {
    fontSize: "14px",
    color: "#666",
  },
  membersSection: {
    marginBottom: "30px",
  },
  membersList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  memberCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
  },
  memberInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  memberAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#007acc",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "bold",
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    margin: "0 0 4px 0",
    fontSize: "16px",
    color: "#333",
  },
  memberJoinDate: {
    margin: "0",
    fontSize: "12px",
    color: "#888",
  },
  actionsSection: {
    backgroundColor: "#f8f9fa",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid #e0e0e0",
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  adminButton: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  leaveButton: {
    padding: "10px 20px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  adminNote: {
    fontSize: "14px",
    color: "#666",
    fontStyle: "italic",
    margin: "0",
  },
};

// Add hover effects
styles.backButton[":hover"] = {
  backgroundColor: "#5a6268",
};

styles.adminButton[":hover"] = {
  backgroundColor: "#218838",
};

styles.leaveButton[":hover"] = {
  backgroundColor: "#c82333",
};