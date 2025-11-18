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
      } catch (err) {
        console.error(err);
        setError("Failed to load data: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleViewProfile = (targetUser) => {
    // For now, just log the user - you can implement a modal or navigation later
    console.log("View profile for user:", targetUser);
    alert(`Viewing profile for @${targetUser.username}`);
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
              />
            ))}
          </div>
        </>
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
};
