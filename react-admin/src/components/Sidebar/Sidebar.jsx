import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { can } from "../../auth/permission";
import { useAppSettings } from "../../context/AppSettingsContext";
import { buildMobileNav, buildSidebarGroups } from "../../config/adminNavigation";
import "./Sidebar.css";

const STORAGE_KEY = "admin-sidebar";
const TOP_PAGE_URL = import.meta.env.PROD
  ? "https://web.hoanganmsc.online"
  : "http://localhost:5174/";

const Icon = ({ name }) => {
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
          <path d="M9.5 20v-5.5h5V20" />
        </svg>
      );

    case "pos":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M6 4.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z" />
          <path d="M8 8h8" />
          <path d="M8 11.5h3" />
          <path d="M14 11.5h2" />
          <path d="M8 15h2" />
          <path d="M12 15h4" />
        </svg>
      );

    case "box":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 21v-9.5" />
          <path d="M20 7.5L12 12 4 7.5" />
        </svg>
      );

    case "content":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <rect x="3.5" y="4" width="17" height="16" rx="2" ry="2" />
          <path d="M8.5 4v16" />
          <path d="M11 8h6" />
          <path d="M11 12h6" />
          <path d="M11 16h4" />
        </svg>
      );

    case "payment":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
          <path d="M3 9.5h18" />
          <path d="M7 14.5h3" />
          <path d="M12 14.5h5" />
        </svg>
      );

    case "receipt":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2-3-2z" />
          <path d="M8 10h8" />
          <path d="M8 14h5" />
        </svg>
      );

    case "discount":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M18.5 5.5l-13 13" />
          <circle cx="8" cy="8" r="2" />
          <circle cx="16" cy="16" r="2" />
        </svg>
      );

    case "shield":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M12 3l7 3.5V12c0 4.7-2.8 7.6-7 9c-4.2-1.4-7-4.3-7-9V6.5L12 3z" />
          <path d="M9.2 12.2l1.8 1.8 3.8-4" />
        </svg>
      );

    case "users":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <circle cx="9" cy="8" r="3" />
          <path d="M4 18a5 5 0 0 1 10 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M14.5 18a4 4 0 0 1 6 0" />
        </svg>
      );

    case "bell":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z" />
        </svg>
      );

    case "chat":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );

    case "user":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        </svg>
      );

    case "external":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M14 5h5v5" />
          <path d="M10 14L19 5" />
          <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
        </svg>
      );

    case "settings":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );

    case "collapse-open":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M4 5.5h16" />
          <path d="M4 18.5h16" />
          <path d="M9 12h11" />
          <path d="M6 9l-3 3 3 3" />
        </svg>
      );

    case "collapse-close":
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <path d="M4 5.5h16" />
          <path d="M4 18.5h16" />
          <path d="M4 12h11" />
          <path d="M18 9l3 3-3 3" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" className="sidebar-ic" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
  }
};

export default function Sidebar() {
  const location = useLocation();
  const { settings } = useAppSettings();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "collapsed";
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", onResize);
    onResize();

    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!can("chat.view")) return undefined;

    const fetchUnread = async () => {
      try {
        const response = await axiosClient.get("/chat/unread-count");
        setChatUnread(response.data.count || 0);
      } catch {
        setChatUnread(0);
      }
    };

    fetchUnread();
    const timer = setInterval(fetchUnread, 5000);

    return () => clearInterval(timer);
  }, []);

  const sidebarGroups = useMemo(
    () => buildSidebarGroups(can, { chatUnread }),
    [chatUnread],
  );

  const mobileNav = useMemo(
    () => buildMobileNav(can, { chatUnread }),
    [chatUnread],
  );

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const toggleCollapse = () => {
    const nextValue = !collapsed;
    setCollapsed(nextValue);
    localStorage.setItem(STORAGE_KEY, nextValue ? "collapsed" : "");
  };

  if (isMobile) {
    if (!mobileNav.length) return null;

    return (
      <nav
        className="mobileBottomNav"
        style={{ gridTemplateColumns: `repeat(${mobileNav.length}, minmax(0, 1fr))` }}
        aria-label="Mobile navigation"
      >
        {mobileNav.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`mobileBottomNav__item${item.center ? " mobileBottomNav__item--center" : ""}${isActive(item.path) ? " is-active" : ""}`}
            aria-current={isActive(item.path) ? "page" : undefined}
          >
            <span className="mobileBottomNav__icon" style={{ position: "relative" }}>
              <Icon name={item.icon} />
              {item.badge > 0 && (
                <span className="mobileBottomNav__badge">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </span>
            {!item.center && (
              <span className="mobileBottomNav__text">{item.navLabel}</span>
            )}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__inner">
        <div className="sidebar__ambient" aria-hidden="true" />

        <div className="sidebar__head">
          <Link to="/dashboard" className="sidebar__brand" aria-label="Admin">
            <div className="sidebar__logo">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                settings.logoText || "A"
              )}
            </div>

            <div className="sidebar__brandText">
              <div className="sidebar__title">{settings.brandName || "APOS PANEL"}</div>
            </div>
          </Link>
        </div>

        <div className="sidebar__body">
          {sidebarGroups.map((group) => (
            <section className="sidebar__group" key={group.label}>
              <div className="sidebar__sectionLabel">{group.label}</div>

              <nav className="sidebar__nav" aria-label={group.label}>
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar__link ${isActive(item.path) ? "is-active" : ""}`}
                    title={collapsed ? item.navLabel : undefined}
                    aria-current={isActive(item.path) ? "page" : undefined}
                  >
                    <span className="sidebar__linkIcon">
                      <Icon name={item.icon} />
                      {item.badge > 0 && (
                        <span className="sidebar__badge">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </span>
                    <span className="sidebar__linkText">{item.navLabel}</span>
                  </Link>
                ))}
              </nav>
            </section>
          ))}
        </div>

        <div className="sidebar__foot">
          <a
            href={TOP_PAGE_URL}
            target="_blank"
            rel="noreferrer"
            className="sidebar__topBtn"
            title={collapsed ? "Top Page" : undefined}
          >
            <span className="sidebar__topBtnIcon">
              <Icon name="external" />
            </span>
            <span className="sidebar__topBtnText">Top Page</span>
          </a>

          <Link
            to="/settings"
            className={`sidebar__topBtn ${isActive("/settings") ? "is-active" : ""}`}
            title={collapsed ? "Cài đặt" : undefined}
          >
            <span className="sidebar__topBtnIcon">
              <Icon name="settings" />
            </span>
            <span className="sidebar__topBtnText">Cài đặt</span>
          </Link>

          <button
            type="button"
            className="sidebar__collapseBtn"
            onClick={toggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            <span className="sidebar__collapseIcon">
              <Icon name={collapsed ? "collapse-close" : "collapse-open"} />
            </span>
            <span className="sidebar__collapseText">
              {collapsed ? "Mở rộng" : "Thu gọn"}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
