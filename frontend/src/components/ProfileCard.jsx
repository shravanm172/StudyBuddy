// src/components/ProfileCard.jsx
import { formatGrade, formatGender } from "../utils/rankingEngine";

export default function ProfileCard({ user, onViewProfile }) {
  const {
    username,
    sharedCourses = [],
    grade,
    gender,
    age,
  } = user;

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

      <button
        style={styles.viewButton}
        onClick={() => onViewProfile && onViewProfile(user)}
      >
        View Profile
      </button>
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
  viewButton: {
    width: "100%",
    padding: "10px",
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
styles.card[":hover"] = {
  transform: "translateY(-2px)",
  boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
};

styles.viewButton[":hover"] = {
  backgroundColor: "#005999",
};
