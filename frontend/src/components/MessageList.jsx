import { formatDistanceToNow } from "date-fns";
import "./MessageList.css";

function MessageList({ messages = [], currentUserId, groupMembers = [] }) {
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";

    try {
      // Handle Firestore timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (err) {
      return "";
    }
  };

  const getMemberInfo = (userId) => {
    const member = groupMembers.find(
      (m) => m.user_uid === userId || m.user_id === userId
    );
    return member || { username: "Unknown User", role: "member" };
  };

  const getAvatarLetter = (username) => {
    return username ? username.charAt(0).toUpperCase() : "?";
  };

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <div className="message-list-empty-icon">💬</div>
        <h4>No messages yet</h4>
        <p>Be the first to start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="message-list-container">
      {messages.map((message, index) => {
        const isCurrentUser = message.senderId === currentUserId;
        const memberInfo = getMemberInfo(message.senderId);
        const showAvatar =
          index === 0 ||
          messages[index - 1].senderId !== message.senderId ||
          (message.timestamp &&
            messages[index - 1].timestamp &&
            message.timestamp.toDate() -
              messages[index - 1].timestamp.toDate() >
              5 * 60 * 1000); // Show avatar if > 5 min gap

        return (
          <div
            key={message.id}
            className={`message-item ${
              isCurrentUser ? "message-own" : "message-other"
            }`}
          >
            {!isCurrentUser && showAvatar && (
              <div className="message-avatar">
                <div className="message-avatar-circle">
                  {getAvatarLetter(
                    memberInfo.username || message.senderUsername || "Unknown User"
                  )}
                </div>
                {memberInfo.role === "admin" && (
                  <div className="message-admin-badge" title="Admin">
                    👑
                  </div>
                )}
              </div>
            )}

            <div
              className={`message-content ${
                !isCurrentUser && !showAvatar ? "message-content-compact" : ""
              }`}
            >
              {!isCurrentUser && showAvatar && (
                <div className="message-header">
                  <span className="message-sender-name">
                    {memberInfo.username || message.senderUsername || "Unknown User"}
                  </span>
                  <span className="message-timestamp">
                    {formatMessageTime(message.timestamp)}
                  </span>
                </div>
              )}

              <div className="message-bubble">
                <div className="message-text">{message.content}</div>
                {isCurrentUser && (
                  <div className="message-timestamp-own">
                    {formatMessageTime(message.timestamp)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MessageList;
