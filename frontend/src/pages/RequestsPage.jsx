// src/pages/RequestsPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function RequestsPage() {
  const { user } = useAuth();

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingActions, setLoadingActions] = useState({}); // Track loading state for individual actions

  // Load all requests on component mount
  useEffect(() => {
    async function loadAllRequests() {
      if (!user) {
        setError("You must be logged in to view your requests.");
        setLoading(false);
        return;
      }

      await refreshAllRequests();
    }

    loadAllRequests();
  }, [user]);

  // Add periodic refresh every 15 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(refreshAllRequests, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Function to refresh all request data
  const refreshAllRequests = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();

      // Load incoming requests (all statuses)
      const incomingRes = await fetch(
        "http://localhost:5000/api/requests/incoming/",
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (incomingRes.ok) {
        const incomingData = await incomingRes.json();
        setIncomingRequests(incomingData.requests || []);
      }

      // Load outgoing requests (all statuses)
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
        setOutgoingRequests(outgoingData.requests || []);
      }

      setError("");
    } catch (err) {
      console.error("Failed to load requests:", err);
      setError("Failed to load requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    if (!user || !requestId) return;

    setLoadingActions((prev) => ({ ...prev, [requestId]: "accepting" }));

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
        alert("Request accepted! You're now connected.");
        await refreshAllRequests(); // Refresh to show updated status
      } else {
        console.error("Failed to accept request:", data);
        alert(`Failed to accept request: ${data.error}`);
      }
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Failed to accept request. Please try again.");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [requestId]: null }));
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!user || !requestId) return;

    setLoadingActions((prev) => ({ ...prev, [requestId]: "rejecting" }));

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
        alert("Request declined.");
        await refreshAllRequests(); // Refresh to show updated status
      } else {
        console.error("Failed to reject request:", data);
        alert(`Failed to reject request: ${data.error}`);
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert("Failed to reject request. Please try again.");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [requestId]: null }));
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!user || !requestId) return;

    setLoadingActions((prev) => ({ ...prev, [requestId]: "canceling" }));

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        `http://localhost:5000/api/requests/${requestId}/cancel/`,
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Request canceled.");
        await refreshAllRequests(); // Refresh to show updated status
      } else {
        console.error("Failed to cancel request:", data);
        alert(`Failed to cancel request: ${data.error}`);
      }
    } catch (err) {
      console.error("Error canceling request:", err);
      alert("Failed to cancel request. Please try again.");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [requestId]: null }));
    }
  };

  // Sort requests: pending first, then by date
  const sortRequests = (requests) => {
    return [...requests].sort((a, b) => {
      // Pending requests first
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;

      // Then by date (newest first)
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };

  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      padding: "4px 12px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase",
    };

    switch (status) {
      case "pending":
        return {
          ...baseStyle,
          backgroundColor: "#fff3cd",
          color: "#856404",
          border: "1px solid #ffeaa7",
        };
      case "accepted":
        return {
          ...baseStyle,
          backgroundColor: "#d1edff",
          color: "#0c5460",
          border: "1px solid #bee5eb",
        };
      case "rejected":
        return {
          ...baseStyle,
          backgroundColor: "#f8d7da",
          color: "#721c24",
          border: "1px solid #f5c6cb",
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: "#e2e3e5",
          color: "#383d41",
          border: "1px solid #ced4da",
        };
    }
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
          <p>Loading your requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h1>My Requests</h1>
          <p style={styles.error}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      </div>
    );
  }

  const sortedIncoming = sortRequests(incomingRequests);
  const sortedOutgoing = sortRequests(outgoingRequests);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>My Study Buddy Requests</h1>
        <p style={styles.subtitle}>
          Manage your incoming and outgoing study buddy requests
        </p>
      </header>

      {/* Incoming Requests Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Incoming Requests ({incomingRequests.length})
        </h2>
        <p style={styles.sectionSubtitle}>
          Requests from other students who want to study with you
        </p>

        {sortedIncoming.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No incoming requests yet.</p>
            <p style={styles.emptyHint}>
              Complete your profile and engage with the people feed to get
              discovered!
            </p>
          </div>
        ) : (
          <div style={styles.requestsList}>
            {sortedIncoming.map((request) => (
              <div key={request.id} style={styles.requestCard}>
                <div style={styles.requestHeader}>
                  <div style={styles.userInfo}>
                    <div style={styles.avatar}>
                      {request.sender_username?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <h3 style={styles.username}>
                        @{request.sender_username}
                      </h3>
                      <p style={styles.date}>
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <span style={getStatusBadgeStyle(request.status)}>
                    {request.status}
                  </span>
                </div>

                {request.message && (
                  <div style={styles.message}>
                    <strong>Message:</strong> {request.message}
                  </div>
                )}

                {request.status === "pending" && (
                  <div style={styles.actions}>
                    <button
                      style={styles.acceptButton}
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={loadingActions[request.id]}
                    >
                      {loadingActions[request.id] === "accepting"
                        ? "Accepting..."
                        : "Accept"}
                    </button>
                    <button
                      style={styles.rejectButton}
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={loadingActions[request.id]}
                    >
                      {loadingActions[request.id] === "rejecting"
                        ? "Declining..."
                        : "Decline"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Outgoing Requests Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Outgoing Requests ({outgoingRequests.length})
        </h2>
        <p style={styles.sectionSubtitle}>
          Requests you've sent to other students
        </p>

        {sortedOutgoing.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No outgoing requests yet.</p>
            <p style={styles.emptyHint}>
              Browse the people feed to discover and connect with study buddies!
            </p>
          </div>
        ) : (
          <div style={styles.requestsList}>
            {sortedOutgoing.map((request) => (
              <div key={request.id} style={styles.requestCard}>
                <div style={styles.requestHeader}>
                  <div style={styles.userInfo}>
                    <div style={styles.avatar}>
                      {request.receiver_username?.charAt(0)?.toUpperCase() ||
                        "?"}
                    </div>
                    <div>
                      <h3 style={styles.username}>
                        @{request.receiver_username}
                      </h3>
                      <p style={styles.date}>
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <span style={getStatusBadgeStyle(request.status)}>
                    {request.status}
                  </span>
                </div>

                {request.message && (
                  <div style={styles.message}>
                    <strong>Your message:</strong> {request.message}
                  </div>
                )}

                {request.status === "pending" && (
                  <div style={styles.actions}>
                    <button
                      style={styles.cancelButton}
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={loadingActions[request.id]}
                    >
                      {loadingActions[request.id] === "canceling"
                        ? "Canceling..."
                        : "Cancel Request"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
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
  section: {
    marginBottom: "40px",
  },
  sectionTitle: {
    fontSize: "24px",
    color: "#333",
    marginBottom: "8px",
  },
  sectionSubtitle: {
    color: "#666",
    fontSize: "14px",
    marginBottom: "20px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    color: "#666",
  },
  emptyHint: {
    fontSize: "14px",
    marginTop: "8px",
    fontStyle: "italic",
  },
  requestsList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  requestCard: {
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    padding: "20px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  requestHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
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
  username: {
    margin: "0 0 4px 0",
    fontSize: "16px",
    color: "#333",
  },
  date: {
    margin: "0",
    fontSize: "12px",
    color: "#888",
  },
  message: {
    backgroundColor: "#f8f9fa",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  actions: {
    display: "flex",
    gap: "8px",
  },
  acceptButton: {
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
  rejectButton: {
    padding: "8px 16px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  cancelButton: {
    padding: "8px 16px",
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
