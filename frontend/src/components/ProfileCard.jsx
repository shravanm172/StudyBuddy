// src/components/ProfileCard.jsx
import { formatGrade, formatGender } from "../utils/rankingEngine";

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
    // Allow sending if no current request status, or if previous request was rejected or accepted
    if (
      onSendRequest &&
      !isLoadingRequest &&
      !incomingRequestId &&
      (!requestStatus || requestStatus === "rejected" || requestStatus === "accepted")
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

    // Handle incoming requests (someone sent TO us)
    if (incomingRequestId) {
      return "Sent you a request";
    }

    // Handle outgoing requests (we sent TO them)
    if (requestStatus === "pending") return "Request Sent";
    if (requestStatus === "accepted") return "In group • Request again";
    // Note: We don't show "rejected" status - it just goes back to default

    return "Send Request";
  };

  const getRequestButtonStyle = () => {
    const baseStyle = { ...styles.requestButton };

    if (isLoadingRequest) {
      return { ...baseStyle, backgroundColor: "#ccc", cursor: "not-allowed" };
    }

    // Incoming request - highlight as important
    if (incomingRequestId) {
      return { ...baseStyle, backgroundColor: "#17a2b8", cursor: "default" };
    }

    if (requestStatus === "pending") {
      return {
        ...baseStyle,
        backgroundColor: "#ffa500",
        cursor: "not-allowed",
      };
    }
    if (requestStatus === "accepted") {
      return {
        ...baseStyle,
        backgroundColor: "#28a745",
        cursor: "pointer", // Allow clicking to send new requests
      };
    }
    // Note: No special styling for "rejected" - it uses default green styling

    return baseStyle;
  };

  const renderRequestActions = () => {
    // If there's an incoming request, show accept/reject buttons
    if (incomingRequestId && !requestStatus) {
      return (
        <div style={styles.incomingRequestActions}>
          <div style={styles.incomingRequestText}>
            @{username} wants to study with you!
          </div>
          <div style={styles.actionButtons}>
            <button
              style={styles.acceptButton}
              onClick={handleAcceptRequest}
              disabled={isLoadingRequest}
            >
              {isLoadingRequest ? "..." : "Accept"}
            </button>
            <button
              style={styles.rejectButton}
              onClick={handleRejectRequest}
              disabled={isLoadingRequest}
            >
              {isLoadingRequest ? "..." : "Decline"}
            </button>
          </div>
        </div>
      );
    }

    // Otherwise show the regular send request button
    return (
      <button
        style={getRequestButtonStyle()}
        onClick={handleSendRequest}
        disabled={
          isLoadingRequest ||
          (requestStatus === "pending") || // Only disable for pending requests
          incomingRequestId
        }
      >
        {getRequestButtonText()}
      </button>
    );
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.avatar}>
          {username?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div style={styles.userInfo}>
          <h3 style={styles.username}>@{username}</h3>
        </div>
      </div>

      <div style={styles.details}>
        <div style={styles.detail}>
          <strong>Grade:</strong> {formatGrade(grade)}
        </div>
        <div style={styles.detail}>
          <strong>Gender:</strong> {formatGender(gender)}
        </div>
        {age && (
          <div style={styles.detail}>
            <strong>Age:</strong> {age}
          </div>
        )}
      </div>

      {sharedCourses.length > 0 && (
        <div style={styles.sharedCourses}>
          <strong>Shared Courses ({sharedCourses.length}):</strong>
          <div style={styles.coursesContainer}>
            {sharedCourses.map((course, index) => (
              <span key={index} style={styles.courseBadge}>
                {course}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={styles.buttonContainer}>
        {renderRequestActions()}

        <button
          style={styles.viewButton}
          onClick={() => onViewProfile && onViewProfile(user)}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "pointer",
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
  },
  avatar: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#007acc",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "bold",
    marginRight: "12px",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    margin: "0 0 4px 0",
    fontSize: "18px",
    color: "#333",
  },
  details: {
    marginBottom: "16px",
  },
  detail: {
    marginBottom: "8px",
    fontSize: "14px",
    color: "#555",
  },
  sharedCourses: {
    marginBottom: "16px",
  },
  coursesContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "8px",
  },
  courseBadge: {
    backgroundColor: "#f0f8ff",
    color: "#007acc",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
    border: "1px solid #007acc",
  },
  buttonContainer: {
    display: "flex",
    gap: "8px",
    flexDirection: "column",
  },
  requestButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  incomingRequestActions: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#e8f4fd",
    border: "1px solid #17a2b8",
    borderRadius: "8px",
    marginBottom: "8px",
  },
  incomingRequestText: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#17a2b8",
    textAlign: "center",
    marginBottom: "8px",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
  },
  acceptButton: {
    flex: 1,
    padding: "8px 12px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  rejectButton: {
    flex: 1,
    padding: "8px 12px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  viewButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#6c757d",
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
styles.card[":hover"] = {
  transform: "translateY(-2px)",
  boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
};

styles.requestButton[":hover"] = {
  backgroundColor: "#218838",
};

styles.acceptButton[":hover"] = {
  backgroundColor: "#218838",
};

styles.rejectButton[":hover"] = {
  backgroundColor: "#c82333",
};

styles.viewButton[":hover"] = {
  backgroundColor: "#545b62",
};
