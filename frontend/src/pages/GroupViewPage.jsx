/*
 * Group view page with member management and real-time chat.
 * Admins can edit group details, manage members, and handle join requests.
 * Includes live chat functionality via Firebase.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiRefresh,
  HiPencil,
  HiCheckCircle,
  HiExclamationCircle,
} from "react-icons/hi";
import GroupChat from "../components/GroupChat";
import "./GroupViewPage.css";

function GroupViewPage() {
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

  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRequestsSection, setShowRequestsSection] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  const [showChatSection, setShowChatSection] = useState(false);

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

  useEffect(() => {
    if (currentUserRole === "admin" && !loadingRequests) {
      loadPendingRequests();
    }
  }, [currentUserRole]);

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
        setPendingRequests((prev) =>
          prev.filter((req) => req.id !== requestId)
        );

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

  // Group name editing functions
  const startEditingName = () => {
    setEditedName(group.name);
    setEditingName(true);
  };

  const cancelEditingName = () => {
    setEditingName(false);
    setEditedName("");
  };

  const saveGroupName = async () => {
    if (!user || !groupId || currentUserRole !== "admin") return;

    const trimmedName = editedName.trim();
    if (!trimmedName) {
      alert("Group name cannot be empty");
      return;
    }

    if (trimmedName === group.name) {
      // No change, just cancel editing
      cancelEditingName();
      return;
    }

    try {
      setSavingName(true);
      const token = await user.getIdToken();

      const response = await fetch(
        `http://localhost:5000/api/groups/${groupId}/info/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ name: trimmedName }),
        }
      );

      if (response.ok) {
        setGroup((prev) => ({ ...prev, name: trimmedName }));
        setEditingName(false);
        setEditedName("");

        alert("Group name updated successfully!");
      } else {
        const errorData = await response.json();
        console.error("Failed to update group name:", errorData);
        alert(errorData.error || "Failed to update group name");
      }
    } catch (err) {
      console.error("Error updating group name:", err);
      alert("Failed to update group name. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  // Group description editing functions
  const startEditingDescription = () => {
    setEditedDescription(group.description || "");
    setEditingDescription(true);
  };

  const cancelEditingDescription = () => {
    setEditingDescription(false);
    setEditedDescription("");
  };

  const saveGroupDescription = async () => {
    if (!user || !groupId || currentUserRole !== "admin") return;

    const trimmedDescription = editedDescription.trim();

    if (trimmedDescription === (group.description || "")) {
      cancelEditingDescription();
      return;
    }

    try {
      setSavingDescription(true);
      const token = await user.getIdToken();

      const response = await fetch(
        `http://localhost:5000/api/groups/${groupId}/info/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ description: trimmedDescription }),
        }
      );

      if (response.ok) {
        setGroup((prev) => ({ ...prev, description: trimmedDescription }));
        setEditingDescription(false);
        setEditedDescription("");

        alert("Group description updated successfully!");
      } else {
        const errorData = await response.json();
        console.error("Failed to update group description:", errorData);
        alert(errorData.error || "Failed to update group description");
      }
    } catch (err) {
      console.error("Error updating group description:", err);
      alert("Failed to update group description. Please try again.");
    } finally {
      setSavingDescription(false);
    }
  };

  // Load pending requests
  useEffect(() => {
    if (currentUserRole === "admin") {
      loadPendingRequests();
    }
  }, [currentUserRole, groupId, user]);

  const getRoleBadgeClass = (role) => {
    if (role === "admin") {
      return "group-view-role-badge admin";
    } else {
      return "group-view-role-badge member";
    }
  };

  if (loading) {
    return (
      <div className="group-view-container">
        <div className="group-view-loading-container">
          <p>Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="group-view-container">
        <div className="group-view-error-container">
          <h1>Group Details</h1>
          <div className="group-view-error">
            <strong>Error:</strong> {error}
          </div>
          <button
            className="group-view-back-button"
            onClick={() => navigate("/groups")}
          >
            Back to My Groups
          </button>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="group-view-container">
        <div className="group-view-error-container">
          <h1>Group Not Found</h1>
          <p>
            The group you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <button
            className="group-view-back-button"
            onClick={() => navigate("/groups")}
          >
            Back to My Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group-view-container">
      {/* Header */}
      <div className="group-view-header-section">
        <button
          className="group-view-back-button"
          onClick={() => navigate("/groups")}
        >
          ← Back to My Groups
        </button>

        <div className="group-view-group-header">
          <div className="group-view-group-title-section">
            {editingName ? (
              <div className="group-view-edit-name-container">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="group-view-edit-name-input"
                  placeholder="Enter group name"
                  maxLength={100}
                  disabled={savingName}
                />
                <div className="group-view-edit-name-actions">
                  <button
                    onClick={saveGroupName}
                    disabled={savingName || !editedName.trim()}
                    className="group-view-save-name-button"
                  >
                    {savingName ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEditingName}
                    disabled={savingName}
                    className="group-view-cancel-name-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group-view-title-with-edit">
                <h1 className="group-view-group-title">{group.name}</h1>
                {currentUserRole === "admin" && (
                  <button
                    onClick={startEditingName}
                    className="group-view-edit-name-button"
                    title="Edit group name"
                  >
                    <HiPencil />
                  </button>
                )}
              </div>
            )}
            <span className={getRoleBadgeClass(currentUserRole)}>
              {currentUserRole}
            </span>
          </div>

          {/* Group Description Section */}
          {editingDescription ? (
            <div className="group-view-edit-description-container">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="group-view-edit-description-input"
                placeholder="Enter group description (optional)"
                maxLength={500}
                disabled={savingDescription}
                rows={3}
              />
              <div className="group-view-edit-description-actions">
                <button
                  onClick={saveGroupDescription}
                  disabled={savingDescription}
                  className="group-view-save-description-button"
                >
                  {savingDescription ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={cancelEditingDescription}
                  disabled={savingDescription}
                  className="group-view-cancel-description-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group-view-description-with-edit">
              {group.description ? (
                <div className="group-view-group-description">
                  {group.description}
                </div>
              ) : (
                currentUserRole === "admin" && (
                  <div className="group-view-no-description">
                    No description set
                  </div>
                )
              )}
              {currentUserRole === "admin" && (
                <button
                  onClick={startEditingDescription}
                  className="group-view-edit-description-button"
                  title="Edit group description"
                >
                  <HiPencil />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Group Info */}
      <div className="group-view-info-section">
        <h2 className="group-view-section-title">Group Information</h2>
        <div className="group-view-info-grid">
          <div className="group-view-info-item">
            <strong>Privacy:</strong>{" "}
            {group.privacy === "private" ? "Private" : "Public"}
          </div>
          <div className="group-view-info-item">
            <strong>Visibility:</strong>{" "}
            {group.is_visible ? "Visible on feed" : "Private group"}
          </div>
          <div className="group-view-info-item">
            <strong>Created:</strong> {formatDate(group.created_at)}
          </div>
          <div className="group-view-info-item">
            <strong>Your join date:</strong> {formatDate(group.user_joined_at)}
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <div className="group-view-courses-section">
        <div className="group-view-courses-section-header">
          <h2 className="group-view-section-title">Studied Courses</h2>
          {currentUserRole === "admin" && (
            <button
              className="group-view-add-course-button"
              onClick={() => setShowCourseForm(!showCourseForm)}
              disabled={loadingAction === "adding_course"}
            >
              {showCourseForm ? "Cancel" : "Add Course"}
            </button>
          )}
        </div>

        {showCourseForm && currentUserRole === "admin" && (
          <div className="group-view-course-form">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="group-view-course-select"
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
              className="group-view-confirm-button"
              onClick={handleAddCourse}
              disabled={!selectedCourse || loadingAction === "adding_course"}
            >
              {loadingAction === "adding_course" ? "Adding..." : "Add"}
            </button>
          </div>
        )}

        {group.courses && group.courses.length > 0 ? (
          <div className="group-view-courses-list">
            {group.courses.map((course) => (
              <div key={course.course_id} className="group-view-course-card">
                <div className="group-view-course-info">
                  <h4 className="group-view-course-id">{course.course_id}</h4>
                  <p className="group-view-course-title">{course.title}</p>
                </div>
                {currentUserRole === "admin" && (
                  <button
                    className="group-view-remove-course-button"
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
          <div className="group-view-no-courses-message">
            <p>No courses added yet.</p>
            {currentUserRole === "admin" && (
              <p className="group-view-admin-hint">
                As an admin, you can add courses that this group studies
                together.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="group-view-members-section">
        <h2 className="group-view-section-title">
          Members ({group.member_count || members.length})
        </h2>

        <div className="group-view-members-list">
          {members.map((member, index) => {
            const memberUid = member.user_uid || member.user_id;
            const memberUsername = member.username || memberUid;
            const isCurrentUser = memberUid === user.uid;
            const canKick =
              currentUserRole === "admin" &&
              !isCurrentUser &&
              member.role !== "admin";

            return (
              <div key={memberUid || index} className="group-view-member-card">
                <div className="group-view-member-info">
                  <div className="group-view-member-avatar">
                    {memberUsername.charAt(0).toUpperCase()}
                  </div>
                  <div className="group-view-member-details">
                    <h4 className="group-view-member-name">
                      @{memberUsername}
                    </h4>
                    <p className="group-view-member-join-date">
                      Joined {formatDate(member.joined_at)}
                    </p>
                  </div>
                </div>
                <div className="group-view-member-actions">
                  <span className={getRoleBadgeClass(member.role)}>
                    {member.role}
                  </span>
                  {canKick && (
                    <button
                      className="group-view-kick-button"
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
      <div className="group-view-actions-section">
        <h2 className="group-view-section-title">Actions</h2>

        <div className="group-view-action-buttons">
          {currentUserRole === "admin" && (
            <>
              <button
                className={`group-view-admin-button ${
                  (!group.courses || group.courses.length === 0) &&
                  !group.is_visible
                    ? "group-view-disabled-button"
                    : ""
                }`}
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
            className="group-view-leave-button"
            onClick={handleLeaveGroup}
            disabled={loadingAction === "leaving"}
          >
            {loadingAction === "leaving" ? "Leaving..." : "Leave Group"}
          </button>
        </div>

        {currentUserRole === "admin" && (
          <div className="group-view-admin-notes">
            <p className="group-view-admin-note">
              💡 As an admin, you can manage group visibility and remove
              members.
            </p>
            {(!group.courses || group.courses.length === 0) &&
              !group.is_visible && (
                <p className="group-view-warning-note">
                  <HiExclamationCircle /> Add at least one course to make this
                  group discoverable on the public feed.
                </p>
              )}
            {group.is_visible && (
              <p className="group-view-success-note">
                <HiCheckCircle /> This group is visible on the public feed -
                students studying{" "}
                {group.courses?.map((c) => c.course_id).join(", ")} can discover
                it!
              </p>
            )}
          </div>
        )}

        {/* Join Requests Management Section - Admin Only */}
        {currentUserRole === "admin" && (
          <div className="group-view-join-requests-section">
            <div className="group-view-section-header">
              <h2 className="group-view-section-title">Join Requests</h2>
              <div className="group-view-header-buttons">
                <button
                  className="group-view-refresh-button"
                  onClick={loadPendingRequests}
                  disabled={loadingRequests}
                  title="Refresh requests"
                >
                  <HiRefresh />
                </button>
              </div>
            </div>

            {
              <div className="group-view-requests-container">
                {loadingRequests ? (
                  <p className="group-view-loading-text">
                    Loading pending requests...
                  </p>
                ) : pendingRequests.length === 0 ? (
                  <p className="group-view-empty-text">
                    No pending join requests. When users request to join your
                    private group, they'll appear here.
                  </p>
                ) : (
                  <div className="group-view-requests-list">
                    {pendingRequests.map((request) => {
                      const profile = request.requester_profile || {};
                      const username =
                        profile.username ||
                        `User_${
                          request.requester_uid?.substring(0, 8) || "Unknown"
                        }`;
                      const avatarLetter = username.charAt(0).toUpperCase();

                      return (
                        <div
                          key={request.id}
                          className="group-view-request-card"
                        >
                          <div className="group-view-request-info">
                            <div className="group-view-requester-avatar">
                              {avatarLetter}
                            </div>
                            <div className="group-view-request-details">
                              <h4 className="group-view-requester-name">
                                {username}
                              </h4>
                              <div className="group-view-profile-info">
                                {profile.grade && (
                                  <span className="group-view-profile-badge">
                                    {profile.grade}
                                  </span>
                                )}
                                {profile.courses &&
                                  profile.courses.length > 0 && (
                                    <span className="group-view-profile-badge">
                                      {profile.courses.slice(0, 2).join(", ")}
                                      {profile.courses.length > 2 &&
                                        ` +${profile.courses.length - 2} more`}
                                    </span>
                                  )}
                              </div>
                              <p className="group-view-request-date">
                                Requested {formatDate(request.created_at)}
                              </p>
                              {request.message && (
                                <p className="group-view-request-message">
                                  "{request.message}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="group-view-request-actions">
                            <button
                              className="group-view-accept-button"
                              onClick={() =>
                                handleJoinRequestResponse(
                                  request.id,
                                  true,
                                  request.requester_uid
                                )
                              }
                              disabled={
                                loadingAction === `accepting-${request.id}`
                              }
                            >
                              {loadingAction === `accepting-${request.id}`
                                ? "Accepting..."
                                : "Accept"}
                            </button>
                            <button
                              className="group-view-reject-button"
                              onClick={() =>
                                handleJoinRequestResponse(
                                  request.id,
                                  false,
                                  request.requester_uid
                                )
                              }
                              disabled={
                                loadingAction === `rejecting-${request.id}`
                              }
                            >
                              {loadingAction === `rejecting-${request.id}`
                                ? "Rejecting..."
                                : "Reject"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            }
          </div>
        )}

        {/* Group Chat Section */}
        <div className="group-view-chat-section">
          <div className="group-view-section-header">
            <h2 className="group-view-section-title">Group Chat</h2>
            <button
              className="group-view-toggle-button"
              onClick={() => setShowChatSection(!showChatSection)}
            >
              {showChatSection ? "Hide Chat" : "Open Chat"}
            </button>
          </div>

          {showChatSection && (
            <div className="group-view-chat-container">
              <GroupChat groupId={groupId} groupMembers={members} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupViewPage;
