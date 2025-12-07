/*
 * Shows who is currently typing in the group chat.
 * Displays animated dots and handles multiple simultaneous typers.
 */

import "./TypingIndicator.css";

function TypingIndicator({ typingUsers = [] }) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    const usernames = typingUsers.map((user) => user.username || "Someone");

    if (usernames.length === 1) {
      return `${usernames[0]} is typing...`;
    } else if (usernames.length === 2) {
      return `${usernames[0]} and ${usernames[1]} are typing...`;
    } else {
      return `${usernames[0]} and ${usernames.length - 1} others are typing...`;
    }
  };

  return (
    <div className="typing-indicator">
      <div className="typing-indicator-content">
        <div className="typing-indicator-dots">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
        <span className="typing-indicator-text">{getTypingText()}</span>
      </div>
    </div>
  );
}

export default TypingIndicator;
