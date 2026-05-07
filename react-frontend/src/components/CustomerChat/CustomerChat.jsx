import { useState, useEffect, useRef, useCallback } from "react";
import "./CustomerChat.css";
import axios from "../../api/axios";

const CustomerChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const isOpenRef = useRef(false);

  const customerData = JSON.parse(localStorage.getItem("customerData") || "null");

  // Sync ref với state để dùng trong interval
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch unread count (không mark as read)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await axios.get("/customer/unread-count");
      setUnreadCount(res.data.count || 0);
    } catch {}
  }, []);

  // Fetch messages (không mark as read)
  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get("/customer/messages");
      setMessages(res.data.data || []);
    } catch {}
  }, []);

  // Mark as read — chỉ gọi khi mở chat
  const markAsRead = useCallback(async () => {
    try {
      await axios.post("/customer/messages/mark-read");
      setUnreadCount(0);
    } catch {}
  }, []);

  // Poll: khi chat đóng → lấy unread count; khi mở → lấy messages
  useEffect(() => {
    if (!customerData) return;

    // Chạy ngay lần đầu
    fetchUnreadCount();

    const interval = setInterval(() => {
      if (isOpenRef.current) {
        fetchMessages();
      } else {
        fetchUnreadCount();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [customerData, fetchUnreadCount, fetchMessages]);

  const handleOpen = async () => {
    setIsOpen(true);
    await fetchMessages();
    await markAsRead();
  };

  const handleClose = () => {
    setIsOpen(false);
    // Lấy lại unread count sau khi đóng (phòng có tin mới trong lúc đang chat)
    fetchUnreadCount();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setLoading(true);
    try {
      await axios.post("/customer/messages", { message: newMessage });
      setNewMessage("");
      fetchMessages();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!customerData) return null;

  return (
    <>
      <div
        className={`customer-chat-button ${isOpen ? "hidden" : ""}`}
        onClick={handleOpen}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className="customer-chat-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </div>

      {isOpen && (
        <div className="customer-chat-window">
          <div className="customer-chat-header">
            <div>
              <h3>Hỗ trợ khách hàng</h3>
              <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn</p>
            </div>
            <button onClick={handleClose} className="customer-chat-close">✕</button>
          </div>

          <div className="customer-chat-messages">
            {messages.length === 0 ? (
              <div className="customer-chat-empty">
                <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`customer-chat-message ${msg.senderType === "customer" ? "sent" : "received"}`}
                >
                  {msg.senderType !== "customer" && (
                    <div className="customer-chat-avatar">
                      {msg.senderAvatar ? (
                        <img src={msg.senderAvatar} alt={msg.senderName || "Admin"} />
                      ) : (
                        <span>{msg.senderName?.charAt(0).toUpperCase() || "A"}</span>
                      )}
                    </div>
                  )}
                  <div className="customer-chat-message-content">
                    {msg.senderType !== "customer" && msg.senderName && (
                      <div className="customer-chat-sender-name">{msg.senderName}</div>
                    )}
                    <p>{msg.message}</p>
                    <span className="customer-chat-message-time">
                      {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="customer-chat-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Nhập tin nhắn..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !newMessage.trim()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default CustomerChat;
