import { useState, useRef, useEffect } from "react";
import "./MessageInput.css";

function MessageInput({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled = false,
}) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicators
    if (value.trim() && onStartTyping) {
      onStartTyping();

      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) onStopTyping();
      }, 1000);
    } else if (!value.trim() && onStopTyping) {
      onStopTyping();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || disabled) return;

    setIsSending(true);

    try {
      await onSendMessage(trimmedMessage);
      setMessage("");

      // Stop typing indicator
      if (onStopTyping) {
        onStopTyping();
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Focus back to input
      textareaRef.current?.focus();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <div className="message-input-container">
        <textarea
          ref={textareaRef}
          className="message-input-textarea"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          disabled={disabled || isSending}
          rows={1}
          maxLength={1000}
        />

        <button
          type="submit"
          className={`message-input-send-button ${
            !message.trim() || isSending || disabled ? "disabled" : ""
          }`}
          disabled={!message.trim() || isSending || disabled}
          title="Send message"
        >
          {isSending ? (
            <span className="message-input-sending">⏳</span>
          ) : (
            <span className="message-input-send-icon">➤</span>
          )}
        </button>
      </div>

      {message.length > 900 && (
        <div className="message-input-char-count">{message.length}/1000</div>
      )}
    </form>
  );
}

export default MessageInput;
