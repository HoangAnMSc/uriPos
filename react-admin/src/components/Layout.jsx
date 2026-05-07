import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { getPageMeta } from "../config/adminNavigation";
import { API_ORIGIN } from "../config/api";
import Sidebar from "./Sidebar/Sidebar";

function toAbsUrl(value) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

function getInitial(name) {
  return (name || "U").trim().charAt(0).toUpperCase();
}

function getRoleLabel(roles) {
  if (Array.isArray(roles)) {
    const labels = roles
      .map((role) => (typeof role === "string" ? role : role?.name))
      .filter(Boolean);

    return labels.length ? labels.join(", ") : "Chưa phân vai trò";
  }

  return roles || "Chưa phân vai trò";
}

function isNotificationRead(notification) {
  return Boolean(notification?.isRead ?? notification?.is_read);
}

function isNotificationLiked(notification) {
  return Boolean(notification?.isLiked ?? notification?.is_liked);
}

function getNotificationLikes(notification) {
  return Number(notification?.likeCount ?? notification?.like_count ?? 0);
}

function getNotificationDate(notification) {
  return notification?.createdAt || notification?.created_at || Date.now();
}

function getNotificationType(notification) {
  return notification?.type || "info";
}

function formatNotificationTime(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function NotificationTypeIcon({ type }) {
  switch (type) {
    case "success":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <path d="m6.8 10.1 2.1 2.2 4.4-4.8" />
        </svg>
      );

    case "warning":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 3.3 17 15.5H3L10 3.3Z" />
          <path d="M10 7.3v3.6" />
          <circle cx="10" cy="13.4" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );

    case "error":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <path d="m7.2 7.2 5.6 5.6" />
          <path d="m12.8 7.2-5.6 5.6" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 8.1v4.4" />
          <circle cx="10" cy="5.8" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [headerContent, setHeaderContent] = useState(null);

  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const currentPage = useMemo(
    () => getPageMeta(location.pathname),
    [location.pathname],
  );
  const isPosPage = location.pathname.startsWith("/pos");
  const isProductPage = location.pathname.startsWith("/products");

  useEffect(() => {
    const handler = (event) => {
      if (event.detail?.avatar !== undefined) {
        setUser((prev) =>
          prev ? { ...prev, avatar: event.detail.avatar } : prev,
        );
      }
    };

    window.addEventListener("avatarUpdated", handler);
    return () => window.removeEventListener("avatarUpdated", handler);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadLayoutData() {
      try {
        const [meResponse, unreadResponse] = await Promise.all([
          axiosClient.get("/me").catch(() => null),
          axiosClient.get("/notifications/unread-count").catch(() => null),
        ]);

        if (!mounted) return;

        setUser(meResponse?.data || null);
        setUnreadCount(unreadResponse?.data?.count || 0);
      } catch {
        if (!mounted) return;
        setUser(null);
        setUnreadCount(0);
      }
    }

    loadLayoutData();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isPosPage) {
      setHeaderContent(null);
    }
  }, [isPosPage]);

  async function fetchUnreadCount() {
    try {
      const response = await axiosClient.get("/notifications/unread-count");
      setUnreadCount(response.data.count || 0);
    } catch {
      setUnreadCount(0);
    }
  }

  async function fetchNotifications() {
    setLoadingNotifications(true);

    try {
      const response = await axiosClient.get("/notifications");
      setNotifications(response.data.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }

  async function markAsRead(notificationId) {
    try {
      await axiosClient.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
      fetchUnreadCount();
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  }

  async function markAllAsRead() {
    try {
      await axiosClient.post("/notifications/mark-all-read");
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true })),
      );
      fetchUnreadCount();
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  }

  async function toggleLike(notificationId, event) {
    event.stopPropagation();

    try {
      const response = await axiosClient.post(
        `/notifications/${notificationId}/like`,
      );
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isLiked: response.data.isLiked,
                likeCount: response.data.likeCount,
              }
            : notification,
        ),
      );
    } catch (error) {
      console.error("Failed to toggle notification like", error);
    }
  }

  function toggleNotifications() {
    if (!notificationOpen) {
      fetchNotifications();
    }

    setNotificationOpen((prev) => !prev);
  }

  function goToProfile() {
    setProfileOpen(false);
    navigate("/profile");
  }

  function onLogout() {
    setProfileOpen(false);
    axiosClient
      .post("/logout")
      .catch(() => null)
      .finally(() => {
        navigate("/login", { replace: true });
      });
  }

  function openNotification(notification) {
    if (!isNotificationRead(notification)) {
      markAsRead(notification.id);
    }
  }

  const unreadLabel =
    unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã được xem";

  return (
    <div className={`admin-layout ${isPosPage ? "pos-layout-mode" : ""}`}>
      <Sidebar />

      <div className="admin-content">
        <header
          className={`admin-header ${isPosPage ? "admin-header-pos" : ""} ${
            isProductPage ? "admin-header--products" : ""
          }`}
        >
          <div className="admin-header__surface">
            <div className="admin-header-left">
              {isPosPage ? (
                <div className="admin-header-slot">{headerContent}</div>
              ) : (
                <div className="admin-header-context">
                  <span className="admin-header-title">
                    {currentPage.title}
                  </span>
                </div>
              )}
            </div>

            <div className="admin-header-right">
              <div className="notification-dropdown-wrap" ref={notificationRef}>
                <button
                  type="button"
                  className="header-icon-btn"
                  aria-label="Thông báo"
                  aria-expanded={notificationOpen}
                  aria-haspopup="dialog"
                  onClick={toggleNotifications}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="header-icon"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="header-badge">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <div>
                        <h3>Thông báo</h3>
                        <p>{unreadLabel}</p>
                      </div>

                      {unreadCount > 0 && (
                        <button
                          type="button"
                          className="notification-mark-all"
                          onClick={markAllAsRead}
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>

                    <div className="notification-dropdown-body">
                      {loadingNotifications ? (
                        <div className="notification-loading">
                          Đang tải thông báo...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="notification-empty">
                          Không có thông báo mới trong lúc này.
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const read = isNotificationRead(notification);
                          const liked = isNotificationLiked(notification);
                          const likeCount = getNotificationLikes(notification);
                          const notificationType =
                            getNotificationType(notification);

                          return (
                            <article
                              key={notification.id}
                              className={`notification-item ${read ? "is-read" : "is-unread"}`}
                              onClick={() => openNotification(notification)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  openNotification(notification);
                                }
                              }}
                              tabIndex={0}
                              role="button"
                            >
                              <div
                                className={`notification-type notification-type--${notificationType}`}
                              >
                                <NotificationTypeIcon type={notificationType} />
                              </div>

                              <div className="notification-item-body">
                                <p className="notification-msg">
                                  {notification.message}
                                </p>

                                <div className="notification-item-footer">
                                  <span className="notification-time">
                                    {formatNotificationTime(
                                      getNotificationDate(notification),
                                    )}
                                  </span>

                                  <button
                                    type="button"
                                    className={`notification-like-btn ${liked ? "is-liked" : ""}`}
                                    onClick={(event) =>
                                      toggleLike(notification.id, event)
                                    }
                                    title={liked ? "Bỏ thích" : "Thích"}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill={liked ? "currentColor" : "none"}
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                    {likeCount > 0 && <span>{likeCount}</span>}
                                  </button>
                                </div>
                              </div>

                              {!read && (
                                <span
                                  className="notification-unread-dot"
                                  title="Chưa đọc"
                                />
                              )}
                            </article>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="profile-dropdown-wrap" ref={profileRef}>
                <button
                  type="button"
                  className="profile-trigger"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() => setProfileOpen((prev) => !prev)}
                >
                  <div className="profile-avatar">
                    {user?.avatar ? (
                      <img
                        src={toAbsUrl(user.avatar)}
                        alt={user?.name || "User"}
                      />
                    ) : (
                      <span>{getInitial(user?.name)}</span>
                    )}
                  </div>

                  <div className="profile-meta">
                    <span className="profile-name">
                      {user?.name || "Người dùng"}
                    </span>
                    <span className="profile-role">
                      {getRoleLabel(user?.roles)}
                    </span>
                  </div>

                  <svg
                    viewBox="0 0 20 20"
                    className="profile-caret"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 7.5 10 12.5 15 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-user">
                      <div className="profile-dropdown-avatar">
                        {user?.avatar ? (
                          <img
                            src={toAbsUrl(user.avatar)}
                            alt={user?.name || "User"}
                          />
                        ) : (
                          <span>{getInitial(user?.name)}</span>
                        )}
                      </div>

                      <div className="profile-dropdown-info">
                        <div className="profile-dropdown-name">
                          {user?.name || "Người dùng"}
                        </div>
                        <div className="profile-dropdown-email">
                          {user?.email || "user@example.com"}
                        </div>
                        <div className="profile-dropdown-role">
                          {getRoleLabel(user?.roles)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="profile-dropdown-item"
                      onClick={goToProfile}
                    >
                      Hồ sơ người dùng
                    </button>

                    <button
                      type="button"
                      className="profile-dropdown-item logout-item"
                      onClick={onLogout}
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main
          className={`admin-main ${isPosPage ? "admin-main-pos" : ""} ${
            isProductPage ? "admin-main--products" : ""
          }`}
        >
          {isPosPage ? (
            <Outlet context={{ setHeaderContent }} />
          ) : (
            <div
              className={`admin-main-shell ${
                isProductPage ? "admin-main-shell--products" : ""
              }`}
            >
              <Outlet context={{ setHeaderContent }} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
