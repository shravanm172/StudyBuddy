/*
 * Real-time group chat component with Firebase Firestore messaging.
 * Handles message sending, live updates, typing indicators, and access control.
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthProvider";
import { db } from "../auth/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  where,
  getDocs,
} from "firebase/firestore";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import "./GroupChat.css";

function GroupChat({ groupId, groupMembers = [] }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch current user profile to get username
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch(
          "http://localhost:5000/api/users/profile/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCurrentUserProfile(data);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Check chat access first
  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !groupId) {
        setCheckingAccess(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch(
          `http://localhost:5000/api/groups/${groupId}/chat/access/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log(
          "📡 Response received:",
          response.status,
          response.statusText
        );

        if (response.ok) {
          const data = await response.json();
          setHasAccess(data.has_access);
          if (!data.has_access) {
            setError(data.message || "Access denied to group chat");
          }
        } else {
          setHasAccess(false);
          setError("Unable to verify chat access");
        }
      } catch (err) {
        console.error("Error checking chat access:", err);
        setHasAccess(false);
        setError("Failed to check chat permissions");
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, groupId]);

  // Listen for messages
  useEffect(() => {
    if (!groupId || !user || !hasAccess || checkingAccess) return;

    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(newMessages);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Error listening to messages:", err);
        setError("Failed to load messages");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [groupId, user, hasAccess, checkingAccess]);

  // Listen for typing indicators
  useEffect(() => {
    if (!groupId || !user || !hasAccess || checkingAccess) return;

    const typingRef = collection(db, "groups", groupId, "typing");
    const q = query(typingRef, where("isTyping", "==", true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const typing = snapshot.docs
        .map((doc) => ({
          userId: doc.id,
          ...doc.data(),
        }))
        .filter((t) => t.userId !== user.uid); // Don't show current user typing

      setTypingUsers(typing);
    });

    return () => unsubscribe();
  }, [groupId, user, hasAccess, checkingAccess]);

  // Send message
  const handleSendMessage = async (content) => {
    if (!content.trim() || !user || !groupId) return;

    try {
      const messagesRef = collection(db, "groups", groupId, "messages");
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderUsername:
          currentUserProfile?.username ||
          user.displayName ||
          user.email ||
          "Anonymous",
        content: content.trim(),
        timestamp: serverTimestamp(),
        type: "text",
      });

      // Clear typing indicator
      await handleStopTyping();
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };

  // Handle typing indicators
  const handleStartTyping = async () => {
    if (!user || !groupId) return;

    try {
      const typingRef = doc(db, "groups", groupId, "typing", user.uid);
      await setDoc(
        typingRef,
        {
          isTyping: true,
          username:
            currentUserProfile?.username ||
            user.displayName ||
            user.email ||
            "Anonymous",
          lastUpdate: serverTimestamp(),
        },
        { merge: true }
      );

      // Auto-clear typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(handleStopTyping, 3000);
    } catch (err) {
      console.error("Error updating typing status:", err);
    }
  };

  const handleStopTyping = async () => {
    if (!user || !groupId) return;

    try {
      const typingRef = doc(db, "groups", groupId, "typing", user.uid);
      await deleteDoc(typingRef);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (err) {
      console.error("Error clearing typing status:", err);
    }
  };

  // Clean up typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      handleStopTyping();
    };
  }, []);

  if (!user) {
    return (
      <div className="group-chat-container">
        <div className="group-chat-error">Please log in to view chat</div>
      </div>
    );
  }

  if (checkingAccess) {
    return (
      <div className="group-chat-container">
        <div className="group-chat-loading">Checking chat access...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="group-chat-container">
        <div className="group-chat-error">
          {error || "You don't have access to this group chat"}
        </div>
      </div>
    );
  }

  return (
    <div className="group-chat-container">
      <div className="group-chat-header">
        <h3>Group Chat</h3>
        <span className="group-chat-member-count">
          {groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="group-chat-content">
        {loading ? (
          <div className="group-chat-loading">Loading messages...</div>
        ) : error ? (
          <div className="group-chat-error">
            {error}
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              currentUserId={user.uid}
              groupMembers={groupMembers}
            />
            <TypingIndicator typingUsers={typingUsers} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        onStartTyping={handleStartTyping}
        onStopTyping={handleStopTyping}
        disabled={loading || !!error}
      />
    </div>
  );
}

export default GroupChat;
