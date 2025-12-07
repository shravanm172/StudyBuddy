import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { rankGroups } from "../utils/groupRankingEngine";
import {
  HiRefresh,
  HiUsers,
  HiCalendar,
  HiLockOpen,
  HiLockClosed,
} from "react-icons/hi";
import LoadingSpinner from "../components/LoadingSpinner";
import "./GroupFeedPage.css";

export default function GroupFeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [userCourses, setUserCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const loadGroupFeed = useCallback(async () => {
    if (!user) {
      setError("Please log in to view group recommendations.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const token = await user.getIdToken();

      const response = await fetch(`http://localhost:5000/api/groups/feed/`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();

        const userCourses = data.user_courses || [];
        const groups = data.groups || [];

        setUserCourses(userCourses);

        // Use ranking engine to sort the groups
        console.log("Ranking groups with user courses:", userCourses);
        const rankedGroups = rankGroups(userCourses, groups);
        setGroups(rankedGroups); //store ranked groups
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        setError(errorData.error || "Failed to load group recommendations.");
      }
    } catch (err) {
      console.error("Failed to load group feed:", err);
      setError("Failed to load group feed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRefresh = () => {
    setLastRefresh(Date.now());
    loadGroupFeed();
  };

  useEffect(() => {
    loadGroupFeed();
  }, [loadGroupFeed, lastRefresh]);

  const handleRequestJoin = async (groupId, groupName) => {
    if (!user) {
      alert("Please log in to join groups");
      return;
    }

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        `http://localhost:5000/api/group-requests/`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            group_id: groupId,
            message: `Hi! I'd like to join the ${groupName} study group.`,
          }),
        }
      );

      console.log("Join request response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Join request data:", data);

        if (data.auto_accepted) {
          alert(
            `Successfully joined ${groupName}! You were automatically added to this public group.`
          );
          handleRefresh();
        } else {
          alert(
            `Join request sent for ${groupName}! Pending admin approval for this private group.`
          );
        }
      } else {
        const errorData = await response.json();
        console.error("Join request error:", errorData);

        if (errorData.error.includes("already a member")) {
          alert(`You're already a member of ${groupName}!`);
        } else if (errorData.error.includes("pending request")) {
          alert(
            `You already have a pending request for ${groupName}. Please wait for admin approval.`
          );
        } else {
          alert(`Failed to join ${groupName}: ${errorData.error}`);
        }
      }
    } catch (err) {
      console.error("Join request failed:", err);
      alert(`Failed to send join request for ${groupName}. Please try again.`);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return "Unknown";
    }
  };

  const getOverlapBadgeClass = (overlapCount) => {
    if (overlapCount >= 3) {
      return "group-feed-overlap-badge-high";
    } else if (overlapCount >= 2) {
      return "group-feed-overlap-badge-medium";
    } else {
      return "group-feed-overlap-badge-low";
    }
  };

  if (loading) {
    return (
      <div className="group-feed-container">
        <LoadingSpinner message="Loading group recommendations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="group-feed-container">
        <div className="group-feed-error-container">
          <h1>Group Feed</h1>
          <p className="group-feed-error">
            <strong>Error:</strong> {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group-feed-container">
      {/* Header */}
      <div className="group-feed-header">
        <div className="group-feed-header-content">
          <div className="group-feed-header-text">
            <h1 className="group-feed-title">Study Group Recommendations</h1>
            <p className="group-feed-subtitle">
              Groups studying courses you're enrolled in
            </p>
          </div>
          <button
            className="group-feed-refresh-button"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh groups"
          >
            <HiRefresh />
          </button>
        </div>
      </div>

      {/* Groups Feed */}
      {groups.length === 0 ? (
        <div className="group-feed-empty-state">
          <h2>No Groups Found</h2>
          <p>We couldn't find any public study groups for your courses.</p>
          <p>Try connecting with study partners to create new groups!</p>
          <button
            className="group-feed-create-group-button"
            onClick={() => navigate("/people")}
          >
            Find Study Partners
          </button>
        </div>
      ) : (
        <div className="group-feed-groups-list">
          {groups.map((group) => (
            <div key={group.id} className="group-feed-group-card">
              {/* Group Header */}
              <div className="group-feed-group-header">
                <div className="group-feed-group-title-section">
                  <h3 className="group-feed-group-name">{group.name}</h3>
                  <div className="group-feed-badges">
                    <span
                      className={getOverlapBadgeClass(group.sharedCoursesCount)}
                    >
                      {group.sharedCoursesCount} shared course
                      {group.sharedCoursesCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <button
                  className="group-feed-join-button"
                  onClick={() => handleRequestJoin(group.id, group.name)}
                >
                  Request to Join
                </button>
              </div>

              {/* Group Description */}
              {group.description && (
                <p className="group-feed-group-description">
                  {group.description}
                </p>
              )}

              {/* Courses Section */}
              <div className="group-feed-courses-section">
                <h4 className="group-feed-courses-title">Study Courses:</h4>
                <div className="group-feed-courses-list">
                  {group.courses.map((course) => (
                    <span
                      key={course.course_id}
                      className={`group-feed-course-tag ${
                        group.sharedCourses.includes(course.course_id)
                          ? "group-feed-overlapping-course-tag"
                          : "group-feed-non-overlapping-course-tag"
                      }`}
                    >
                      {course.course_id}
                    </span>
                  ))}
                </div>
              </div>

              {/* Group Info */}
              <div className="group-feed-group-info">
                <span className="group-feed-group-info-item">
                  <HiUsers /> {group.member_count} member
                  {group.member_count !== 1 ? "s" : ""}
                </span>
                <span className="group-feed-group-info-item">
                  <HiCalendar /> Created {formatDate(group.created_at)}
                </span>
                <span className="group-feed-group-info-item">
                  {group.privacy === "public" ? (
                    <HiLockOpen />
                  ) : (
                    <HiLockClosed />
                  )}{" "}
                  {group.privacy === "public" ? "Public" : "Private"} Group
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
