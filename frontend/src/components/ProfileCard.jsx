/*
 * User profile card for people feed with request actions.
 * Handles send, accept, and reject request interactions.
 */

import { formatGrade, formatGender } from "../utils/peopleRankingEngine";
import "./ProfileCard.css";

export default function ProfileCard({
  user,
  onViewProfile,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  requestStatus = null,
  incomingRequestId = null,
  isLoadingRequest = false,
}) {
  const { username, sharedCourses = [], grade, gender, age, uid } = user;

  const handleSendRequest = () => {
    // Allow sending if no current request status
    if (
      onSendRequest &&
      !isLoadingRequest &&
      !incomingRequestId &&
      (!requestStatus ||
        requestStatus === "rejected" ||
        requestStatus === "accepted")
    ) {
      onSendRequest(user);
    }
  };

  const handleAcceptRequest = () => {
    if (onAcceptRequest && incomingRequestId && !isLoadingRequest) {
      onAcceptRequest(incomingRequestId, user);
    }
  };

  const handleRejectRequest = () => {
    if (onRejectRequest && incomingRequestId && !isLoadingRequest) {
      onRejectRequest(incomingRequestId, user);
    }
  };

  const getRequestButtonText = () => {
    if (isLoadingRequest) return "Loading...";

    if (incomingRequestId) {
      return "Sent you a request";
    }

    if (requestStatus === "pending") return "Request Sent";
    if (requestStatus === "accepted") return "In group • Request again";

    return "Send Request";
  };

  const getRequestButtonClass = () => {
    let classes = "profile-card-request-button";

    if (isLoadingRequest) classes += " loading";
    else if (incomingRequestId) classes += " incoming";
    else if (requestStatus === "pending") classes += " pending";
    else if (requestStatus === "accepted") classes += " accepted";

    return classes;
  };

  const renderRequestActions = () => {
    if (incomingRequestId && !requestStatus) {
      return (
        <div className="profile-card-incoming-request-actions">
          <div className="profile-card-incoming-request-text">
            @{username} wants to study with you!
          </div>
          <div className="profile-card-action-buttons">
            <button
              className="profile-card-accept-button"
              onClick={handleAcceptRequest}
              disabled={isLoadingRequest}
            >
              {isLoadingRequest ? "..." : "Accept"}
            </button>
            <button
              className="profile-card-reject-button"
              onClick={handleRejectRequest}
              disabled={isLoadingRequest}
            >
              {isLoadingRequest ? "..." : "Decline"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        className={getRequestButtonClass()}
        onClick={handleSendRequest}
        disabled={
          isLoadingRequest || requestStatus === "pending" || incomingRequestId
        }
      >
        {getRequestButtonText()}
      </button>
    );
  };

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <div className="profile-card-avatar">
          {username?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="profile-card-user-info">
          <h3 className="profile-card-username">@{username}</h3>
        </div>
      </div>

      <div className="profile-card-details">
        <div className="profile-card-detail">
          <strong>Grade:</strong> {formatGrade(grade)}
        </div>
        <div className="profile-card-detail">
          <strong>Gender:</strong> {formatGender(gender)}
        </div>
        {age && (
          <div className="profile-card-detail">
            <strong>Age:</strong> {age}
          </div>
        )}
      </div>

      {sharedCourses.length > 0 && (
        <div className="profile-card-shared-courses">
          <strong>Shared Courses ({sharedCourses.length}):</strong>
          <div className="profile-card-courses-container">
            {sharedCourses.map((course, index) => (
              <span key={index} className="profile-card-course-badge">
                {course}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="profile-card-button-container">
        {renderRequestActions()}

        <button
          className="profile-card-view-button"
          onClick={() => onViewProfile && onViewProfile(user)}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}
