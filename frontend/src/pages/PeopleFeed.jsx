// src/pages/PeopleFeed.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import ProfileCard from "../components/ProfileCard";
import { rankUsers } from "../utils/rankingEngine";

export default function PeopleFeed() {
  const { user } = useAuth();

  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [rankedUsers, setRankedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestStates, setRequestStates] = useState({}); // Track request status for each user
  const [loadingRequests, setLoadingRequests] = useState({}); // Track loading state for requests
  const [incomingRequests, setIncomingRequests] = useState({}); // Track incoming requests by sender UID
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [customMessage, setCustomMessage] = useState("");

  // Load current user profile and all other users
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      if (!user) {
        setError("You must be logged in to view the people feed.");
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();

        // Load current user profile
        const currentUserRes = await fetch(
          "http://localhost:5000/api/users/me/",
          {
            headers: {
              Authorization: "Bearer " + token,
            },
          }
        );

        if (currentUserRes.status === 404) {
          setError(
            "Please complete your profile first to see people recommendations."
          );
          setLoading(false);
          return;
        }

        if (!currentUserRes.ok) {
          const currentUserData = await currentUserRes.json();
          setError(currentUserData.error || "Failed to load your profile.");
          setLoading(false);
          return;
        }

        const currentUserProfile = await currentUserRes.json();
        setCurrentUserProfile(currentUserProfile);

        // Load all other users
        const allUsersRes = await fetch(
          "http://localhost:5000/api/users/all/",
          {
            headers: {
              Authorization: "Bearer " + token,
            },
          }
        );

        if (!allUsersRes.ok) {
          const allUsersData = await allUsersRes.json();
          setError(allUsersData.error || "Failed to load users.");
          setLoading(false);
          return;
        }

        const allUsersData = await allUsersRes.json();
        setAllUsers(allUsersData.users || []);

        // Rank the users based on compatibility with current user
        const ranked = rankUsers(currentUserProfile, allUsersData.users || []);
        setRankedUsers(ranked);

        // Load existing request states
        await loadRequestStates(token, ranked);
      } catch (err) {
        console.error(err);
        setError("Failed to load data: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Load existing request states for the ranked users
  const loadRequestStates = async (token, users) => {
    try {
      // Get outgoing requests to see who we've already sent requests to
      const outgoingRes = await fetch(
        "http://localhost:5000/api/requests/outgoing/",
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (outgoingRes.ok) {
        const outgoingData = await outgoingRes.json();
        const states = {};

        outgoingData.requests?.forEach((request) => {
          states[request.receiver_uid] = request.status;
        });

        setRequestStates(states);
      }

      // Get pending incoming requests to see who has sent requests to us that we need to respond to
      const incomingPendingRes = await fetch(
        "http://localhost:5000/api/requests/incoming/?status=pending",
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (incomingPendingRes.ok) {
        const incomingPendingData = await incomingPendingRes.json();
        const incoming = {};

        incomingPendingData.requests?.forEach((request) => {
          incoming[request.sender_uid] = request.id; // Store request ID for accept/reject
        });

        setIncomingRequests(incoming);
      }

      // Get accepted incoming requests to properly track connections
      const incomingAcceptedRes = await fetch(
        "http://localhost:5000/api/requests/incoming/?status=accepted",
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (incomingAcceptedRes.ok) {
        const incomingAcceptedData = await incomingAcceptedRes.json();

        // Update request states for users who sent us requests that we accepted
        setRequestStates((prev) => {
          const newStates = { ...prev };
          incomingAcceptedData.requests?.forEach((request) => {
            newStates[request.sender_uid] = "accepted";
          });
          return newStates;
        });
      }

      // Get shared group memberships to validate "accepted" statuses
      const sharedMembershipsRes = await fetch(
        "http://localhost:5000/api/groups/shared-memberships/",
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (sharedMembershipsRes.ok) {
        const sharedMembershipsData = await sharedMembershipsRes.json();
        const usersInGroupsWith = new Set(sharedMembershipsData.shared_memberships || []);

        // Update request states: only keep "accepted" status if still in groups together
        setRequestStates((prev) => {
          const newStates = { ...prev };
          
          // For each user with "accepted" status, check if we're still in groups together
          Object.keys(newStates).forEach((userUid) => {
            if (newStates[userUid] === "accepted") {
              // If we're no longer in any groups together, reset to null (show "Send Request")
              if (!usersInGroupsWith.has(userUid)) {
                delete newStates[userUid]; // Remove the status entirely
                console.log(`🔄 Reset status for ${userUid}: no longer in groups together`);
              }
            }
          });
          
          return newStates;
        });
      }
    } catch (err) {
      console.error("Failed to load request states:", err);
      // Don't show error to user, just continue without request state info
    }
  };

  // Add periodic refresh of request states to catch updates from other users
  useEffect(() => {
    if (!user || rankedUsers.length === 0) return;

    const refreshRequestStates = async () => {
      try {
        const token = await user.getIdToken();
        await loadRequestStates(token, rankedUsers);
      } catch (err) {
        console.error("Failed to refresh request states:", err);
      }
    };

    // Refresh every 10 seconds to catch updates
    const interval = setInterval(refreshRequestStates, 10000);

    return () => clearInterval(interval);
  }, [user, rankedUsers]);

  // Manual refresh function for immediate updates after actions
  const refreshRequestStates = async () => {
    if (!user || rankedUsers.length === 0) return;

    try {
      const token = await user.getIdToken();
      await loadRequestStates(token, rankedUsers);
    } catch (err) {
      console.error("Failed to refresh request states:", err);
    }
  };

  const handleViewProfile = (targetUser) => {
    // For now, just log the user - you can implement a modal or navigation later
    console.log("View profile for user:", targetUser);
    alert(`Viewing profile for @${targetUser.username}`);
  };

  const handleSendRequest = (targetUser) => {
    // Open the message modal instead of sending immediately
    setSelectedUser(targetUser);
    setCustomMessage(
      `Hi @${targetUser.username}! I noticed we share some courses. Want to study together?`
    );
    setShowMessageModal(true);
  };

  const handleSendRequestWithMessage = async (message) => {
    if (!user || !selectedUser || !message.trim()) return;

    // Set loading state for this specific user
    setLoadingRequests((prev) => ({ ...prev, [selectedUser.uid]: true }));

    try {
      const token = await user.getIdToken();

      const response = await fetch("http://localhost:5000/api/requests/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          receiver_uid: selectedUser.uid,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update request state to show "Request Sent"
        setRequestStates((prev) => ({
          ...prev,
          [selectedUser.uid]: "pending",
        }));
        alert(`Request sent to @${selectedUser.username}!`);

        // Close modal and reset state
        setShowMessageModal(false);
        setSelectedUser(null);
        setCustomMessage("");

        // Refresh request states to ensure consistency
        await refreshRequestStates();
      } else {
        console.error("Failed to send request:", data);
        alert(`Failed to send request: ${data.error}`);
      }
    } catch (err) {
      console.error("Error sending request:", err);
      alert("Failed to send request. Please try again.");
    } finally {
      // Clear loading state for this user
      setLoadingRequests((prev) => ({ ...prev, [selectedUser.uid]: false }));
    }
  };

  const handleCancelMessage = () => {
    setShowMessageModal(false);
    setSelectedUser(null);
    setCustomMessage("");
  };

  const handleAcceptRequest = async (requestId, senderUser) => {
    if (!user || !requestId) return;

    setLoadingRequests((prev) => ({ ...prev, [senderUser.uid]: true }));

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        `http://localhost:5000/api/requests/${requestId}/accept/`,
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Remove from incoming requests and update to accepted status
        setIncomingRequests((prev) => {
          const newState = { ...prev };
          delete newState[senderUser.uid];
          return newState;
        });

        setRequestStates((prev) => ({ ...prev, [senderUser.uid]: "accepted" }));
        alert(`You're now connected with @${senderUser.username}!`);

        // Refresh request states to ensure consistency
        await refreshRequestStates();
      } else {
        console.error("Failed to accept request:", data);
        alert(`Failed to accept request: ${data.error}`);
      }
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Failed to accept request. Please try again.");
    } finally {
      setLoadingRequests((prev) => ({ ...prev, [senderUser.uid]: false }));
    }
  };

  const handleRejectRequest = async (requestId, senderUser) => {
    if (!user || !requestId) return;

    setLoadingRequests((prev) => ({ ...prev, [senderUser.uid]: true }));

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        `http://localhost:5000/api/requests/${requestId}/reject/`,
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Remove from incoming requests - don't update requestStates for sender
        // This way the sender won't see "rejected" status
        setIncomingRequests((prev) => {
          const newState = { ...prev };
          delete newState[senderUser.uid];
          return newState;
        });

        alert(`Request from @${senderUser.username} has been declined.`);

        // Refresh request states to ensure consistency
        await refreshRequestStates();
      } else {
        console.error("Failed to reject request:", data);
        alert(`Failed to reject request: ${data.error}`);
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert("Failed to reject request. Please try again.");
    } finally {
      setLoadingRequests((prev) => ({ ...prev, [senderUser.uid]: false }));
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <p>Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h1>People Feed</h1>
          <p style={styles.error}>
            <strong>Error:</strong> {error}
          </p>
          {error.includes("complete your profile") && (
            <p style={styles.suggestion}>
              <a href="/account" style={styles.link}>
                Go to Profile Settings
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>People Feed</h1>
        <p style={styles.subtitle}>
          Discover study buddies who share your courses
        </p>
        {currentUserProfile && (
          <div style={styles.userInfo}>
            <p>
              <strong>Your courses:</strong>{" "}
              {currentUserProfile.courses?.join(", ") || "None"}
            </p>
          </div>
        )}
      </header>

      {rankedUsers.length === 0 ? (
        <div style={styles.emptyState}>
          <h2>No study buddies found</h2>
          <p>
            We couldn't find any users who share courses with you. Check back
            later as more students join!
          </p>
        </div>
      ) : (
        <>
          <div style={styles.resultsInfo}>
            <p>
              Found <strong>{rankedUsers.length}</strong> study buddy
              {rankedUsers.length !== 1 ? "s" : ""}
              who share courses with you
            </p>
          </div>

          <div style={styles.feedContainer}>
            {rankedUsers.map((rankedUser) => (
              <ProfileCard
                key={rankedUser.uid}
                user={rankedUser}
                onViewProfile={handleViewProfile}
                onSendRequest={handleSendRequest}
                onAcceptRequest={handleAcceptRequest}
                onRejectRequest={handleRejectRequest}
                requestStatus={requestStates[rankedUser.uid]}
                incomingRequestId={incomingRequests[rankedUser.uid]}
                isLoadingRequest={loadingRequests[rankedUser.uid]}
              />
            ))}
          </div>
        </>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div style={styles.modalOverlay} onClick={handleCancelMessage}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>Send Request to @{selectedUser?.username}</h3>
              <button style={styles.closeButton} onClick={handleCancelMessage}>
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalDescription}>
                Write a personalized message to introduce yourself:
              </p>

              <textarea
                style={styles.messageTextarea}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={`Hi @${selectedUser?.username}! I noticed we share some courses. Want to study together?`}
                rows={4}
                maxLength={500}
                autoFocus
              />

              <div style={styles.characterCount}>
                {customMessage.length}/500 characters
              </div>
            </div>

            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={handleCancelMessage}>
                Cancel
              </button>
              <button
                style={styles.sendButton}
                onClick={() => handleSendRequestWithMessage(customMessage)}
                disabled={
                  !customMessage.trim() || loadingRequests[selectedUser?.uid]
                }
              >
                {loadingRequests[selectedUser?.uid]
                  ? "Sending..."
                  : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
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
    marginBottom: "32px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e0e0e0",
  },
  subtitle: {
    color: "#666",
    fontSize: "16px",
    margin: "8px 0 16px 0",
  },
  userInfo: {
    backgroundColor: "#f8f9fa",
    padding: "12px 16px",
    borderRadius: "8px",
    margin: "16px 0",
    fontSize: "14px",
  },
  error: {
    color: "red",
    marginTop: "8px",
  },
  suggestion: {
    marginTop: "16px",
  },
  link: {
    color: "#007acc",
    textDecoration: "none",
    fontWeight: "500",
  },
  resultsInfo: {
    textAlign: "center",
    marginBottom: "24px",
    color: "#555",
  },
  feedContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#666",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "0",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "80vh",
    overflow: "hidden",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    color: "#666",
    cursor: "pointer",
    padding: "0",
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: "24px",
  },
  modalDescription: {
    color: "#666",
    marginBottom: "16px",
    fontSize: "14px",
  },
  messageTextarea: {
    width: "100%",
    minHeight: "100px",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  characterCount: {
    fontSize: "12px",
    color: "#666",
    textAlign: "right",
    marginTop: "8px",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    padding: "20px 24px",
    borderTop: "1px solid #e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  cancelButton: {
    padding: "10px 20px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  sendButton: {
    padding: "10px 20px",
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
styles.closeButton[":hover"] = {
  backgroundColor: "#f0f0f0",
};

styles.messageTextarea[":focus"] = {
  borderColor: "#007acc",
  boxShadow: "0 0 0 2px rgba(0, 122, 204, 0.2)",
};

styles.cancelButton[":hover"] = {
  backgroundColor: "#5a6268",
};

styles.sendButton[":hover"] = {
  backgroundColor: "#0056b3",
};

styles.sendButton[":disabled"] = {
  backgroundColor: "#ccc",
  cursor: "not-allowed",
};
