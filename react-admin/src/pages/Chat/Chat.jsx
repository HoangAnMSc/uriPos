import React, { useEffect, useRef, useCallback, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useMsg } from "../../components/MsgContext/MsgContext";
import { can } from "../../auth/permission";

function SearchIcon({ className = "chat-icon" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function TrashIcon({ className = "chat-icon" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

function EditIcon({ className = "chat-icon" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z" />
    </svg>
  );
}

function MoreIcon({ className = "chat-icon" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6 12h.01" />
      <path d="M12 12h.01" />
      <path d="M18 12h.01" />
    </svg>
  );
}

function CloseIcon({ className = "chat-icon" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m7 7 10 10" />
      <path d="m17 7-10 10" />
    </svg>
  );
}

function SendIcon({ className = "chat-icon" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M21 3 10 14" />
      <path d="m21 3-7 18-4-7-7-4 18-7Z" />
    </svg>
  );
}

function EmptyChatIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="chat-placeholder-graphic"
      aria-hidden="true"
    >
      <path d="M18 19h28a10 10 0 0 1 10 10v7a10 10 0 0 1-10 10H32l-11 8v-8h-3A10 10 0 0 1 8 36v-7a10 10 0 0 1 10-10Z" />
      <path d="M21 31h22" />
      <path d="M21 38h13" />
    </svg>
  );
}

function getInitial(value, fallback = "K") {
  return (value || fallback).trim().charAt(0).toUpperCase();
}

const CHAT_TIME_ZONE = "Asia/Ho_Chi_Minh";

function parseChatDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const date = new Date(hasTimeZone ? normalized : `${normalized}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatChatTime(value) {
  const date = parseChatDate(value);
  if (!date) return "";

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CHAT_TIME_ZONE,
  });
}

export default function Chat() {
  const { showDanger } = useMsg();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat"
  const [openActionMsgId, setOpenActionMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const messagesListRef = useRef(null);
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);
  const activeConvIdRef = useRef(null);
  const longPressTimerRef = useRef(null);

  useEffect(() => {
    activeConvIdRef.current = activeConv?.id ?? null;
  }, [activeConv]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axiosClient.get("/chat/conversations");
      const list = res.data.data || [];
      setConversations(list);
      if (activeConvIdRef.current) {
        const updated = list.find((c) => c.id === activeConvIdRef.current);
        if (updated) setActiveConv(updated);
      }
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    }
  }, []);

  const fetchMessages = useCallback(async (convId) => {
    try {
      const res = await axiosClient.get(
        `/chat/conversations/${convId}/messages`,
      );
      setMessages(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const t = setInterval(fetchConversations, 5000);
    return () => clearInterval(t);
  }, [fetchConversations]);

  useEffect(() => {
    if (!activeConv?.id) return;
    fetchMessages(activeConv.id);
    const t = setInterval(() => fetchMessages(activeConv.id), 3000);
    return () => clearInterval(t);
  }, [activeConv?.id, fetchMessages]);

  useEffect(() => {
    const messagesList = messagesListRef.current;
    if (!messagesList) return;

    messagesList.scrollTo({
      top: messagesList.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (editingMsgId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = "auto";
      editTextareaRef.current.style.height =
        Math.min(editTextareaRef.current.scrollHeight, 140) + "px";
    }
  }, [editingMsgId]);

  useEffect(() => {
    setOpenActionMsgId(null);
    setEditingMsgId(null);
    setEditText("");
  }, [activeConv?.id]);

  useEffect(() => {
    if (!openActionMsgId) return undefined;

    function closeMessageMenu(event) {
      if (event.target.closest(".chat-msg-menu-wrap")) return;
      setOpenActionMsgId(null);
    }

    document.addEventListener("pointerdown", closeMessageMenu);
    return () => document.removeEventListener("pointerdown", closeMessageMenu);
  }, [openActionMsgId]);

  useEffect(() => () => clearLongPressTimer(), []);

  function selectConv(conv) {
    setActiveConv(conv);
    setMessages([]);
    setMobileView("chat");
    fetchMessages(conv.id);
    setTimeout(() => fetchConversations(), 1000);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || !activeConv) return;
    setSending(true);
    try {
      const res = await axiosClient.post("/chat/messages", {
        conversationId: activeConv.id,
        message: input.trim(),
      });
      setMessages((prev) => [...prev, res.data.data]);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "44px";
      }
      fetchConversations();
    } catch {
      showDanger("Gửi tin nhắn thất bại");
    } finally {
      setSending(false);
    }
  }

  function handleTextareaChange(e) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  }

  async function editMessage(msgId) {
    if (!editText.trim()) return;
    setSavingEdit(true);
    try {
      const res = await axiosClient.patch(`/chat/messages/${msgId}`, {
        message: editText.trim(),
      });
      const updatedMessage = res.data.data;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId
            ? { ...msg, message: updatedMessage?.message || editText.trim() }
            : msg,
        ),
      );
      setEditingMsgId(null);
      setEditText("");
      setOpenActionMsgId(null);
      fetchConversations();
    } catch {
      showDanger("Sửa tin nhắn thất bại");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteMessage(msgId) {
    if (!window.confirm("Xóa tin nhắn này?")) return;
    try {
      await axiosClient.delete(`/chat/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      setOpenActionMsgId(null);
      fetchConversations();
    } catch {
      showDanger("Xóa tin nhắn thất bại");
    }
  }

  async function deleteConversation(convId) {
    if (!window.confirm("Xóa cuộc trò chuyện này? Tất cả tin nhắn sẽ bị xóa."))
      return;
    try {
      await axiosClient.delete(`/chat/conversations/${convId}`);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConv?.id === convId) {
        setActiveConv(null);
        setMessages([]);
        setMobileView("list");
      }
      fetchConversations();
    } catch {
      showDanger("Xóa cuộc trò chuyện thất bại");
    }
  }

  function startEditingMessage(msg) {
    setEditingMsgId(msg.id);
    setEditText(msg.message || "");
    setOpenActionMsgId(null);
  }

  function cancelEditingMessage() {
    setEditingMsgId(null);
    setEditText("");
  }

  function handleEditTextareaChange(e) {
    setEditText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  }

  function handleEditKeyDown(e, msgId) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      editMessage(msgId);
    }

    if (e.key === "Escape") {
      cancelEditingMessage();
    }
  }

  function toggleMessageMenu(msgId) {
    setOpenActionMsgId((current) => (current === msgId ? null : msgId));
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function startMessageLongPress(msgId, event) {
    if (event.pointerType === "mouse") return;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      setOpenActionMsgId(msgId);
    }, 480);
  }

  const canDeleteChat = can("chat.delete");
  const canEditChat = can("chat.reply");
  const unreadTotal = conversations.reduce(
    (total, conv) => total + (Number(conv.unreadCount) || 0),
    0,
  );
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("vi-VN");
  const filteredConversations = normalizedSearch
    ? conversations.filter((conv) => {
        const haystack = [
          conv.customerName,
          conv.customerPhone,
          conv.lastMessage,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("vi-VN");

        return haystack.includes(normalizedSearch);
      })
    : conversations;

  const sidebarJSX = (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <div>
          <span className="chat-sidebar-eyebrow">Hộp thoại</span>
          <h2>Chat khách hàng</h2>
        </div>
        <span className="chat-sidebar-count">{conversations.length}</span>
      </div>

      <div className="chat-search-wrap">
        <SearchIcon className="chat-search-icon" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm tên, số điện thoại, tin nhắn"
          aria-label="Tìm cuộc trò chuyện"
        />
        {searchTerm && (
          <button
            type="button"
            className="chat-search-clear"
            onClick={() => setSearchTerm("")}
            aria-label="Xóa tìm kiếm"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <div className="chat-sidebar-summary">
        <span>
          {unreadTotal > 0 ? `${unreadTotal} chưa đọc` : "Không có tin mới"}
        </span>
        <span>{filteredConversations.length} cuộc trò chuyện</span>
      </div>

      <div className="chat-conv-list">
        {conversations.length === 0 ? (
          <div className="chat-empty-list">
            <EmptyChatIcon />
            <strong>Chưa có cuộc trò chuyện</strong>
            <span>Tin nhắn mới của khách hàng sẽ xuất hiện tại đây.</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="chat-empty-list">
            <SearchIcon className="chat-empty-search-icon" />
            <strong>Không tìm thấy hội thoại</strong>
            <span>Không có tên, số điện thoại hoặc nội dung trùng khớp.</span>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`chat-conv-item ${activeConv?.id === conv.id ? "is-active" : ""} ${
                conv.unreadCount > 0 ? "has-unread" : ""
              }`}
            >
              <button
                type="button"
                className="chat-conv-content"
                onClick={() => selectConv(conv)}
              >
                <div className="chat-conv-avatar">
                  {conv.customerAvatar ? (
                    <img
                      src={conv.customerAvatar}
                      alt={conv.customerName || "Khách hàng"}
                    />
                  ) : (
                    getInitial(conv.customerName)
                  )}
                </div>
                <div className="chat-conv-info">
                  <div className="chat-conv-row">
                    <span className="chat-conv-name">
                      {conv.customerName || "Khách hàng"}
                    </span>
                    {conv.lastMessageAt && (
                      <span className="chat-conv-time">
                        {formatChatTime(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="chat-conv-preview">
                    {conv.lastMessage ? (
                      conv.lastMessageSenderType === "user" ? (
                        <>
                          <span className="chat-conv-preview-you">Bạn: </span>
                          {conv.lastMessage}
                        </>
                      ) : (
                        conv.lastMessage
                      )
                    ) : (
                      "Chưa có tin nhắn"
                    )}
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="chat-conv-badge">{conv.unreadCount}</div>
                )}
              </button>
              {canDeleteChat && (
                <button
                  type="button"
                  className="chat-conv-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  title="Xóa cuộc trò chuyện"
                  aria-label="Xóa cuộc trò chuyện"
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const mainJSX = (
    <div className="chat-main">
      {!activeConv ? (
        <div className="chat-placeholder">
          <EmptyChatIcon />
          <h2>Chọn cuộc trò chuyện</h2>
          <p>Tin nhắn và thông tin khách hàng sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <>
          <div className="chat-main-header">
            <button
              type="button"
              className="chat-back-btn"
              onClick={() => setMobileView("list")}
              aria-label="Quay lại danh sách"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="chat-main-avatar">
              {activeConv.customerAvatar ? (
                <img
                  src={activeConv.customerAvatar}
                  alt={activeConv.customerName || "Khách hàng"}
                />
              ) : (
                getInitial(activeConv.customerName)
              )}
            </div>
            <div className="chat-main-info">
              <div className="chat-main-name">
                {activeConv.customerName || "Khách hàng"}
              </div>
              <div className="chat-main-sub">
                {activeConv.customerPhone || "Chưa có số điện thoại"}
              </div>
            </div>
            <div className="chat-main-meta">
              <span>
                {messages.length ? `${messages.length} tin nhắn` : "Chưa có tin nhắn"}
              </span>
              {activeConv.unreadCount > 0 && (
                <strong>{activeConv.unreadCount} chưa đọc</strong>
              )}
            </div>
          </div>

          <div className="chat-messages" ref={messagesListRef}>
            {messages.length === 0 ? (
              <div className="chat-messages-empty">
                <EmptyChatIcon />
                <strong>Chưa có tin nhắn</strong>
                <span>Cuộc trò chuyện này đang trống.</span>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-msg ${
                    msg.senderType === "user" ? "chat-msg--out" : "chat-msg--in"
                  } ${
                    msg.senderType === "user" &&
                    editingMsgId !== msg.id &&
                    (canEditChat || canDeleteChat)
                      ? "has-actions"
                      : ""
                  }`}
                >
                  <div className="chat-msg-avatar">
                    {msg.senderAvatar ? (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName || "User"}
                      />
                    ) : (
                      <span>
                        {getInitial(
                          msg.senderName,
                          msg.senderType === "user" ? "A" : "K",
                        )}
                      </span>
                    )}
                  </div>

                  <div className="chat-msg-content">
                    {msg.senderType === "user" && msg.senderName && (
                      <div className="chat-msg-sender">{msg.senderName}</div>
                    )}
                    <div
                      className="chat-msg-body"
                      onPointerDown={(event) => {
                        if (
                          msg.senderType === "user" &&
                          editingMsgId !== msg.id &&
                          (canEditChat || canDeleteChat)
                        ) {
                          startMessageLongPress(msg.id, event);
                        }
                      }}
                      onPointerUp={clearLongPressTimer}
                      onPointerCancel={clearLongPressTimer}
                      onPointerLeave={clearLongPressTimer}
                    >
                      {msg.senderType === "user" &&
                        editingMsgId !== msg.id &&
                        (canEditChat || canDeleteChat) && (
                          <div className="chat-msg-menu-wrap">
                            <button
                              type="button"
                              className="chat-msg-more"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleMessageMenu(msg.id);
                              }}
                              title="Tùy chọn tin nhắn"
                              aria-label="Tùy chọn tin nhắn"
                              aria-expanded={openActionMsgId === msg.id}
                            >
                              <MoreIcon />
                            </button>

                            {openActionMsgId === msg.id && (
                              <div
                                className="chat-msg-menu"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {canEditChat && (
                                  <button
                                    type="button"
                                    className="chat-msg-menu-item"
                                    onClick={() => startEditingMessage(msg)}
                                  >
                                    <EditIcon />
                                    <span>Sửa tin nhắn</span>
                                  </button>
                                )}
                                {canDeleteChat && (
                                  <button
                                    type="button"
                                    className="chat-msg-menu-item is-danger"
                                    onClick={() => deleteMessage(msg.id)}
                                  >
                                    <TrashIcon />
                                    <span>Xóa tin nhắn</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      {editingMsgId === msg.id ? (
                        <form
                          className="chat-msg-edit-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            editMessage(msg.id);
                          }}
                        >
                          <textarea
                            ref={editTextareaRef}
                            className="chat-msg-edit-input"
                            value={editText}
                            onChange={handleEditTextareaChange}
                            onKeyDown={(event) =>
                              handleEditKeyDown(event, msg.id)
                            }
                            rows={1}
                            disabled={savingEdit}
                            aria-label="Nội dung tin nhắn cần sửa"
                          />
                          <div className="chat-msg-edit-actions">
                            <button
                              type="button"
                              className="chat-msg-edit-cancel"
                              onClick={cancelEditingMessage}
                              disabled={savingEdit}
                            >
                              Hủy
                            </button>
                            <button
                              type="submit"
                              className="chat-msg-edit-save"
                              disabled={savingEdit || !editText.trim()}
                            >
                              Lưu
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="chat-msg-bubble">{msg.message}</div>
                      )}
                    </div>
                    <div className="chat-msg-time">
                      {formatChatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form className="chat-input-bar" onSubmit={sendMessage}>
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              aria-label="Tin nhắn"
              disabled={sending}
              autoComplete="off"
              rows={1}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={sending || !input.trim()}
              title="Gửi tin nhắn"
              aria-label="Gửi tin nhắn"
            >
              <SendIcon />
            </button>
          </form>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="chat-page chat-page--pc">
        {sidebarJSX}
        {mainJSX}
      </div>

      <div className="chat-page chat-page--mobile">
        {mobileView === "list" ? sidebarJSX : mainJSX}
      </div>
    </>
  );
}
