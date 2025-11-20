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
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  
  // Group join request management
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRequestsSection, setShowRequestsSection] = useState(false);

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

  // Load pending requests when user becomes admin and requests section is open
  useEffect(() => {
    if (currentUserRole === "admin" && showRequestsSection && !loadingRequests) {
      loadPendingRequests();
    }
  }, [currentUserRole, showRequestsSection]);

  // Load available courses for course management
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch("http://localhost:5000/api/courses/", {
          headers: {
            Authorization: "Bearer " + token,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableCourses(data.courses || []);
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      }
    };

    fetchCourses();
  }, [user]);

  // Function to refresh group data
  const refreshGroupData = async () => {
    if (!user || !groupId) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();

      // Use the new group details endpoint
      const response = await fetch(
        `http://localhost:5000/api/groups/${groupId}/`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Group API response:", data); // Debug log

        // Extract group data from the wrapper
        const groupData = data.group || data;
        setGroup(groupData);

        // Check if members array exists and find current user's role
        if (groupData.members && Array.isArray(groupData.members)) {
          const currentMember = groupData.members.find(
            (member) =>
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

    // Check if group has courses before allowing to make it public
    const hasNoCourses = !group.courses || group.courses.length === 0;
    const makingPublic = !group.is_visible;

    if (makingPublic && hasNoCourses) {
      alert(
        "You must add at least one course before making the group public. This helps other students find relevant study groups!"
      );
      return;
    }

    const action = makingPublic ? "make public" : "make private";
    const confirmMessage = makingPublic
      ? "Are you sure you want to make this group visible on the public feed? Other students will be able to discover and request to join it."
      : "Are you sure you want to make this group private? It will be removed from the public feed.";

    if (!window.confirm(confirmMessage)) return;

    setLoadingAction("toggling_visibility");

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5000/api/groups/${groupId}/visibility/`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_visible: makingPublic,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(
          result.message ||
            `Successfully ${
              makingPublic ? "made group public" : "made group private"
            }!`
        );
        await refreshGroupData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || `Failed to ${action}`);
      }
    } catch (err) {
      console.error("Error updating visibility:", err);
      alert(`Failed to ${action}. Please try again.`);
    } finally {
      setLoadingAction("");
    }
  };

  const handleKickMember = async (memberUid, memberUsername) => {
    if (!user || !groupId || currentUserRole !== "admin") return;

    const confirmKick = window.confirm(
      `Are you sure you want to remove ${memberUsername} from the group?`
    );

    if (!confirmKick) return;

    setLoadingAction(`kicking_${memberUid}`);

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5000/api/groups/${groupId}/kick/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            member_uid: memberUid,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully removed ${memberUsername} from the group`);
        // Refresh the group data to update the member list
        await refreshGroupData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to kick member");
      }
    } catch (err) {
      console.error("Error kicking member:", err);
      alert("Failed to kick member. Please try again.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleAddCourse = async () => {
    if (!user || !groupId || currentUserRole !== "admin" || !selectedCourse)
      return;

    setLoadingAction("adding_course");

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5000/api/groups/${groupId}/courses/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            course_id: selectedCourse,
          }),
        }
      );

      if (response.ok) {
        alert("Course added successfully!");
        setShowCourseForm(false);
        setSelectedCourse("");
        await refreshGroupData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add course");
      }
    } catch (err) {
      console.error("Error adding course:", err);
      alert("Failed to add course. Please try again.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleRemoveCourse = async (courseId, courseTitle) => {
    if (!user || !groupId || currentUserRole !== "admin") return;

    const confirmRemove = window.confirm(
      `Are you sure you want to remove "${courseTitle}" from this group's study list?`
    );

    if (!confirmRemove) return;

    setLoadingAction(`removing_course_${courseId}`);

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5000/api/groups/${groupId}/courses/${courseId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        alert("Course removed successfully!");
        await refreshGroupData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to remove course");
      }
    } catch (err) {
      console.error("Error removing course:", err);
      alert("Failed to remove course. Please try again.");
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
      return (
        date.toLocaleDateString() +
        " at " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (error) {
      console.warn("Error formatting date:", dateString, error);
      return "Unknown";
    }
  };

  // Group join request management functions
  const loadPendingRequests = async () => {
    if (!user || !groupId || currentUserRole !== "admin") return;

    try {
      setLoadingRequests(true);
      const token = await user.getIdToken();

      const response = await fetch(
        `http://localhost:5000/api/group-requests/group/${groupId}/`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.requests || []);
        console.log(`📥 Loaded ${data.requests?.length || 0} pending requests`);
      } else {
        const errorData = await response.json();
        console.error("Failed to load pending requests:", errorData);
      }
    } catch (err) {
      console.error("Error loading pending requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleJoinRequestResponse = async (requestId, accept, requesterUid) => {
    if (!user || !groupId || currentUserRole !== "admin") return;

    try {
      setLoadingAction(`${accept ? "accepting" : "rejecting"}-${requestId}`);
      const token = await user.getIdToken();

      const response = await fetch(
        `http://localhost:5000/api/group-requests/${requestId}/respond/`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accept }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        
        // Remove the request from the pending list
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        
        // If accepted, refresh the group data to show new member
        if (accept) {
          await refreshGroupData();
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to respond to request:", errorData);
        alert(errorData.error || "Failed to respond to request");
      }
    } catch (err) {
      console.error("Error responding to request:", err);
      alert("Failed to respond to request. Please try again.");
    } finally {
      setLoadingAction("");
    }
  };

  // Load pending requests when admin opens the requests section
  useEffect(() => {
    if (showRequestsSection && currentUserRole === "admin") {
      loadPendingRequests();
    }
  }, [showRequestsSection, currentUserRole, groupId, user]);

  const getRoleBadgeStyle = (role) => {
    const baseStyle = {
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase",
    };

    if (role === "admin") {
      return {
        ...baseStyle,
        backgroundColor: "#fff3cd",
        color: "#856404",
        border: "1px solid #ffeaa7",
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: "#d1edff",
        color: "#0c5460",
        border: "1px solid #bee5eb",
      };
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
          <p>
            The group you're looking for doesn't exist or you don't have access
            to it.
          </p>
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
            <div style={styles.groupDescription}>{group.description}</div>
          )}
        </div>
      </div>

      {/* Group Info */}
      <div style={styles.infoSection}>
        <h2 style={styles.sectionTitle}>Group Information</h2>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <strong>Privacy:</strong>{" "}
            {group.privacy === "private" ? "Private" : "Public"}
          </div>
          <div style={styles.infoItem}>
            <strong>Visibility:</strong>{" "}
            {group.is_visible ? "Visible on feed" : "Private group"}
          </div>
          <div style={styles.infoItem}>
            <strong>Created:</strong> {formatDate(group.created_at)}
          </div>
          <div style={styles.infoItem}>
            <strong>Your join date:</strong> {formatDate(group.user_joined_at)}
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <div style={styles.coursesSection}>
        <div style={styles.coursesSectionHeader}>
          <h2 style={styles.sectionTitle}>Study Courses</h2>
          {currentUserRole === "admin" && (
            <button
              style={styles.addCourseButton}
              onClick={() => setShowCourseForm(!showCourseForm)}
              disabled={loadingAction === "adding_course"}
            >
              {showCourseForm ? "Cancel" : "Add Course"}
            </button>
          )}
        </div>

        {showCourseForm && currentUserRole === "admin" && (
          <div style={styles.courseForm}>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={styles.courseSelect}
              disabled={loadingAction === "adding_course"}
            >
              <option value="">Select a course...</option>
              {availableCourses
                .filter(
                  (course) =>
                    !group.courses?.some(
                      (gc) => gc.course_id === course.course_id
                    )
                )
                .map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.course_id}: {course.title}
                  </option>
                ))}
            </select>
            <button
              style={styles.confirmButton}
              onClick={handleAddCourse}
              disabled={!selectedCourse || loadingAction === "adding_course"}
            >
              {loadingAction === "adding_course" ? "Adding..." : "Add"}
            </button>
          </div>
        )}

        {group.courses && group.courses.length > 0 ? (
          <div style={styles.coursesList}>
            {group.courses.map((course) => (
              <div key={course.course_id} style={styles.courseCard}>
                <div style={styles.courseInfo}>
                  <h4 style={styles.courseId}>{course.course_id}</h4>
                  <p style={styles.courseTitle}>{course.title}</p>
                </div>
                {currentUserRole === "admin" && (
                  <button
                    style={styles.removeCourseButton}
                    onClick={() =>
                      handleRemoveCourse(course.course_id, course.title)
                    }
                    disabled={
                      loadingAction === `removing_course_${course.course_id}`
                    }
                    title="Remove course from group"
                  >
                    {loadingAction === `removing_course_${course.course_id}`
                      ? "..."
                      : "✕"}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.noCoursesMessage}>
            <p>No courses added yet.</p>
            {currentUserRole === "admin" && (
              <p style={styles.adminHint}>
                As an admin, you can add courses that this group studies
                together.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Members Section */}
      <div style={styles.membersSection}>
        <h2 style={styles.sectionTitle}>
          Members ({group.member_count || members.length})
        </h2>

        <div style={styles.membersList}>
          {members.map((member, index) => {
            const memberUid = member.user_uid || member.user_id;
            const memberUsername = member.username || memberUid;
            const isCurrentUser = memberUid === user.uid;
            const canKick =
              currentUserRole === "admin" &&
              !isCurrentUser &&
              member.role !== "admin";

            return (
              <div key={memberUid || index} style={styles.memberCard}>
                <div style={styles.memberInfo}>
                  <div style={styles.memberAvatar}>
                    {memberUsername.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.memberDetails}>
                    <h4 style={styles.memberName}>@{memberUsername}</h4>
                    <p style={styles.memberJoinDate}>
                      Joined {formatDate(member.joined_at)}
                    </p>
                  </div>
                </div>
                <div style={styles.memberActions}>
                  <span style={getRoleBadgeStyle(member.role)}>
                    {member.role}
                  </span>
                  {canKick && (
                    <button
                      style={styles.kickButton}
                      onClick={() =>
                        handleKickMember(memberUid, memberUsername)
                      }
                      disabled={loadingAction === `kicking_${memberUid}`}
                      title={`Remove ${memberUsername} from group`}
                    >
                      {loadingAction === `kicking_${memberUid}` ? "..." : "✕"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions Section */}
      <div style={styles.actionsSection}>
        <h2 style={styles.sectionTitle}>Actions</h2>

        <div style={styles.actionButtons}>
          {currentUserRole === "admin" && (
            <>
              <button
                style={{
                  ...styles.adminButton,
                  ...((!group.courses || group.courses.length === 0) &&
                  !group.is_visible
                    ? styles.disabledButton
                    : {}),
                }}
                onClick={handleToggleVisibility}
                disabled={loadingAction === "toggling_visibility"}
                title={
                  (!group.courses || group.courses.length === 0) &&
                  !group.is_visible
                    ? "Add at least one course before making group public"
                    : "Toggle group visibility on public feed"
                }
              >
                {loadingAction === "toggling_visibility"
                  ? "Updating..."
                  : `Make ${group.is_visible ? "Private" : "Public"}`}
              </button>
            </>
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
          <div style={styles.adminNotes}>
            <p style={styles.adminNote}>
              💡 As an admin, you can manage group visibility and remove
              members.
            </p>
            {(!group.courses || group.courses.length === 0) &&
              !group.is_visible && (
                <p style={styles.warningNote}>
                  ⚠️ Add at least one course to make this group discoverable on
                  the public feed.
                </p>
              )}
            {group.is_visible && (
              <p style={styles.successNote}>
                ✅ This group is visible on the public feed - students studying{" "}
                {group.courses?.map((c) => c.course_id).join(", ")} can discover
                it!
              </p>
            )}
          </div>
        )}

        {/* Join Requests Management Section - Admin Only */}
        {currentUserRole === "admin" && (
          <div style={styles.joinRequestsSection}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Join Requests</h2>
              <div style={styles.headerButtons}>
                {showRequestsSection && (
                  <button
                    style={styles.refreshButton}
                    onClick={loadPendingRequests}
                    disabled={loadingRequests}
                    title="Refresh requests"
                  >
                    🔄
                  </button>
                )}
                <button
                  style={styles.toggleButton}
                  onClick={() => {
                    if (!showRequestsSection) {
                      // Load requests when opening the section
                      loadPendingRequests();
                    }
                    setShowRequestsSection(!showRequestsSection);
                  }}
                  disabled={loadingRequests}
                >
                  {loadingRequests 
                    ? "Loading..." 
                    : showRequestsSection 
                      ? "Hide Requests" 
                      : "Manage Requests"
                  }
                </button>
              </div>
            </div>

            {showRequestsSection && (
              <div style={styles.requestsContainer}>
                {loadingRequests ? (
                  <p style={styles.loadingText}>Loading pending requests...</p>
                ) : pendingRequests.length === 0 ? (
                  <p style={styles.emptyText}>
                    No pending join requests. When users request to join your private group, they'll appear here.
                  </p>
                ) : (
                  <div style={styles.requestsList}>
                    {pendingRequests.map((request) => {
                      const profile = request.requester_profile || {};
                      const username = profile.username || `User_${request.requester_uid?.substring(0, 8) || 'Unknown'}`;
                      const avatarLetter = username.charAt(0).toUpperCase();
                      
                      return (
                        <div key={request.id} style={styles.requestCard}>
                          <div style={styles.requestInfo}>
                            <div style={styles.requesterAvatar}>
                              {avatarLetter}
                            </div>
                            <div style={styles.requestDetails}>
                              <h4 style={styles.requesterName}>
                                {username}
                              </h4>
                              <div style={styles.profileInfo}>
                                {profile.grade && (
                                  <span style={styles.profileBadge}>
                                    {profile.grade}
                                  </span>
                                )}
                                {profile.courses && profile.courses.length > 0 && (
                                  <span style={styles.profileBadge}>
                                    {profile.courses.slice(0, 2).join(', ')}
                                    {profile.courses.length > 2 && ` +${profile.courses.length - 2} more`}
                                  </span>
                                )}
                              </div>
                              <p style={styles.requestDate}>
                                Requested {formatDate(request.created_at)}
                              </p>
                              {request.message && (
                                <p style={styles.requestMessage}>
                                  "{request.message}"
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div style={styles.requestActions}>
                            <button
                              style={styles.acceptButton}
                              onClick={() => handleJoinRequestResponse(request.id, true, request.requester_uid)}
                              disabled={loadingAction === `accepting-${request.id}`}
                            >
                              {loadingAction === `accepting-${request.id}` ? "Accepting..." : "Accept"}
                            </button>
                            <button
                              style={styles.rejectButton}
                              onClick={() => handleJoinRequestResponse(request.id, false, request.requester_uid)}
                              disabled={loadingAction === `rejecting-${request.id}`}
                            >
                              {loadingAction === `rejecting-${request.id}` ? "Rejecting..." : "Reject"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
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
  coursesSection: {
    marginBottom: "30px",
  },
  coursesSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  addCourseButton: {
    padding: "8px 16px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  courseForm: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    padding: "16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  courseSelect: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
  },
  confirmButton: {
    padding: "8px 16px",
    backgroundColor: "#007acc",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  coursesList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  courseCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
  },
  courseInfo: {
    flex: 1,
  },
  courseId: {
    margin: "0 0 4px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#007acc",
  },
  courseTitle: {
    margin: "0",
    fontSize: "13px",
    color: "#666",
  },
  removeCourseButton: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    fontSize: "11px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  noCoursesMessage: {
    textAlign: "center",
    padding: "30px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
    color: "#666",
  },
  adminHint: {
    fontSize: "12px",
    fontStyle: "italic",
    marginTop: "8px",
    color: "#888",
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
  memberActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  kickButton: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
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
  adminNotes: {
    marginTop: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  warningNote: {
    fontSize: "14px",
    color: "#856404",
    backgroundColor: "#fff3cd",
    border: "1px solid #ffeaa7",
    borderRadius: "4px",
    padding: "8px 12px",
    margin: "0",
    fontWeight: "500",
  },
  successNote: {
    fontSize: "14px",
    color: "#155724",
    backgroundColor: "#d4edda",
    border: "1px solid #c3e6cb",
    borderRadius: "4px",
    padding: "8px 12px",
    margin: "0",
    fontWeight: "500",
  },
  disabledButton: {
    backgroundColor: "#6c757d !important",
    cursor: "not-allowed !important",
    opacity: "0.7",
  },
  // Join Requests Section Styles
  joinRequestsSection: {
    marginTop: "20px",
    padding: "16px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#f8f9fa",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  sectionTitle: {
    margin: "0",
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
  },
  headerButtons: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  refreshButton: {
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "8px 10px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    minWidth: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButton: {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  requestsContainer: {
    backgroundColor: "white",
    border: "1px solid #e9ecef",
    borderRadius: "6px",
    padding: "16px",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
    margin: "0",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    margin: "0",
  },
  requestsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  requestCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    border: "1px solid #e9ecef",
    borderRadius: "6px",
    backgroundColor: "#f8f9fa",
  },
  requestInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: "1",
  },
  requesterAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#007bff",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "16px",
  },
  requestDetails: {
    flex: "1",
  },
  requesterName: {
    margin: "0 0 4px 0",
    fontSize: "16px",
    fontWeight: "500",
    color: "#333",
  },
  profileInfo: {
    display: "flex",
    gap: "8px",
    marginBottom: "4px",
    flexWrap: "wrap",
  },
  profileBadge: {
    fontSize: "11px",
    fontWeight: "500",
    padding: "2px 6px",
    borderRadius: "12px",
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    border: "1px solid #bbdefb",
  },
  requestDate: {
    margin: "0 0 4px 0",
    fontSize: "12px",
    color: "#666",
  },
  requestMessage: {
    margin: "0",
    fontSize: "14px",
    color: "#555",
    fontStyle: "italic",
  },
  requestActions: {
    display: "flex",
    gap: "8px",
  },
  acceptButton: {
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "6px 12px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  rejectButton: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "6px 12px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
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

styles.toggleButton[":hover"] = {
  backgroundColor: "#0056b3",
};

styles.acceptButton[":hover"] = {
  backgroundColor: "#218838",
};

styles.rejectButton[":hover"] = {
  backgroundColor: "#c82333",
};
