// Manages incoming and outgoing study buddy requests with accept, reject, and cancel actions.

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import LoadingSpinner from "../components/LoadingSpinner";
import "./RequestsPage.css";

export default function RequestsPage() {
  const { user } = useAuth();

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingActions, setLoadingActions] = useState({});

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
        await refreshAllRequests();
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

  const sortRequests = (requests) => {
    return [...requests].sort((a, b) => {
      // Pending requests first
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;

      // Then by date (newest first)
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };

  const getStatusBadgeClass = (status) => {
    return `requests-page-status-badge ${status}`;
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
      <div className="requests-page-container">
        <LoadingSpinner message="Loading your requests..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="requests-page-container">
        <div className="requests-page-error-container">
          <h1>My Requests</h1>
          <div className="requests-page-error">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  const sortedIncoming = sortRequests(incomingRequests);
  const sortedOutgoing = sortRequests(outgoingRequests);

  return (
    <div className="requests-page-container">
      <header className="requests-page-header">
        <h1 className="requests-page-title">My Study Buddy Requests</h1>
        <p className="requests-page-subtitle">
          Manage your incoming and outgoing study buddy requests
        </p>
      </header>

      {/* Incoming Requests Section */}
      <section className="requests-page-section">
        <h2 className="requests-page-section-title">
          Incoming Requests ({incomingRequests.length})
        </h2>
        <p className="requests-page-section-subtitle">
          Requests from other students who want to study with you
        </p>

        {sortedIncoming.length === 0 ? (
          <div className="requests-page-empty-state">
            <p>No incoming requests yet.</p>
            <p className="requests-page-empty-hint">
              Complete your profile and engage with the people feed to get
              discovered!
            </p>
          </div>
        ) : (
          <div className="requests-page-list">
            {sortedIncoming.map((request) => (
              <div key={request.id} className="requests-page-card">
                <div className="requests-page-card-header">
                  <div className="requests-page-user-info">
                    <div className="requests-page-avatar">
                      {request.sender_username?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <h3 className="requests-page-username">
                        @{request.sender_username}
                      </h3>
                      <p className="requests-page-date">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className={getStatusBadgeClass(request.status)}>
                    {request.status}
                  </span>
                </div>

                {request.message && (
                  <div className="requests-page-message">
                    <strong>Message:</strong> {request.message}
                  </div>
                )}

                {request.status === "pending" && (
                  <div className="requests-page-actions">
                    <button
                      className="requests-page-accept-button"
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={loadingActions[request.id]}
                    >
                      {loadingActions[request.id] === "accepting"
                        ? "Accepting..."
                        : "Accept"}
                    </button>
                    <button
                      className="requests-page-reject-button"
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
      <section className="requests-page-section">
        <h2 className="requests-page-section-title">
          Outgoing Requests ({outgoingRequests.length})
        </h2>
        <p className="requests-page-section-subtitle">
          Requests you've sent to other students
        </p>

        {sortedOutgoing.length === 0 ? (
          <div className="requests-page-empty-state">
            <p>No outgoing requests yet.</p>
            <p className="requests-page-empty-hint">
              Browse the people feed to discover and connect with study buddies!
            </p>
          </div>
        ) : (
          <div className="requests-page-list">
            {sortedOutgoing.map((request) => (
              <div key={request.id} className="requests-page-card">
                <div className="requests-page-card-header">
                  <div className="requests-page-user-info">
                    <div className="requests-page-avatar">
                      {request.receiver_username?.charAt(0)?.toUpperCase() ||
                        "?"}
                    </div>
                    <div>
                      <h3 className="requests-page-username">
                        @{request.receiver_username}
                      </h3>
                      <p className="requests-page-date">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className={getStatusBadgeClass(request.status)}>
                    {request.status}
                  </span>
                </div>

                {request.message && (
                  <div className="requests-page-message">
                    <strong>Your message:</strong> {request.message}
                  </div>
                )}

                {request.status === "pending" && (
                  <div className="requests-page-actions">
                    <button
                      className="requests-page-cancel-button"
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
