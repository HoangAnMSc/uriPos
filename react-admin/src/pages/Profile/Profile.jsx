import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { can } from "../../auth/permission";
import { refreshPermissions } from "../../auth/storage";
import { PageLoader, Spinner } from "../../components/Loading/Loading";
import { API_ORIGIN, STOREFRONT_URL } from "../../config/api";

function toAbsUrl(v) {
  if (!v) return "";
  if (v.startsWith("http")) return v;
  return `${API_ORIGIN}${v.startsWith("/") ? "" : "/"}${v}`;
}

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ orders: 0, revenue: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    axiosClient.get("/me").then((res) => setUser(res.data)).catch(() => {});
    if (can("order.view") || can("order.create") || can("order.update") || can("order.delete")) {
      axiosClient.get("/orders").then((res) => {
        const orders = res.data.data || [];
        const revenue = orders.reduce((s, o) => s + (o.paid_amount || 0), 0);
        setStats({ orders: orders.length, revenue });
      }).catch(() => {});
    }
  }, []);

  function handleLogout() {
    axiosClient.post("/logout").finally(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("permissions");
      localStorage.removeItem("roles");
      navigate("/login");
    });
  }

  async function handleRefreshPermissions() {
    setRefreshing(true);
    const success = await refreshPermissions(axiosClient);
    setRefreshing(false);
    if (success) {
      alert("Đã làm mới quyền thành công! Vui lòng tải lại trang.");
      window.location.reload();
    } else {
      alert("Làm mới quyền thất bại!");
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview ngay
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploading(true);

    try {
      // 1. Upload file lấy URL
      const formData = new FormData();
      formData.append("image", file);
      const uploadRes = await axiosClient.post("/content-fields/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = uploadRes.data?.url || "";

      // 2. Lưu URL vào database
      await axiosClient.patch("/me/avatar", { avatar: url });

      setUser((prev) => ({ ...prev, avatar: url }));
      // Notify Layout để cập nhật avatar trên header
      window.dispatchEvent(new CustomEvent("avatarUpdated", { detail: { avatar: url } }));
    } catch {
      // Revert preview nếu lỗi
    } finally {
      setAvatarPreview(null);
      setUploading(false);
    }
  }

  if (!user) {
    return <div className="profile-page"><PageLoader /></div>;
  }

  const menuItems = [
    { icon: "home",    title: "Tổng quan",    to: "/dashboard",    permissions: ["dashboard.view"] },
    { icon: "receipt", title: "Đơn hàng",     to: "/orders",       permissions: ["order.view", "order.create", "order.update", "order.delete"] },
    { icon: "pos",     title: "POS",           to: "/pos",          permissions: ["pos.access"] },
    { icon: "box",     title: "Sản phẩm",      to: "/products",     permissions: ["product.view", "product.create", "product.update", "product.delete"] },
    { icon: "users",   title: "Khách hàng",    to: "/customers",    permissions: ["customer.view", "customer.create", "customer.update", "customer.delete"] },
    { icon: "content", title: "Nội dung",      to: "/content",      permissions: ["content.view", "content.create", "content.update", "content.delete"] },
    { icon: "discount", title: "Mã giảm giá", to: "/discountCodes", permissions: ["discount.view", "discount.create", "discount.update", "discount.delete"] },
    { icon: "payment", title: "Thanh toán", to: "/payment", permissions: ["payment.view", "payment.update"] },
    { icon: "user", title: "Người dùng", to: "/user-list", permissions: ["user.view", "user.create", "user.update", "user.delete"] },
    { icon: "shield", title: "Vai trò", to: "/role-list", permissions: ["role.view", "role.create", "role.update", "role.delete"] },
    { icon: "bell", title: "Thông báo", to: "/notifications", permissions: ["notification.view", "notification.create", "notification.update", "notification.delete"] },
    { icon: "chat", title: "Tin nhắn", to: "/chat", permissions: ["chat.view", "chat.reply", "chat.delete"] },
  ].filter((item) => item.permissions.some(p => can(p)));

  const fmt = (n) => Number(n).toLocaleString("vi-VN") + "đ";
  const avatarSrc = avatarPreview || toAbsUrl(user.avatar);
  const roleText = Array.isArray(user.roles) ? user.roles.join(", ") : (user.roles || "Admin");

  return (
    <div className="profile-page">

      {/* ── Hero ── */}
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar-ring">
            {avatarSrc ? (
              <img src={avatarSrc} alt={user.name} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-letter">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <button
            className="profile-avatar-edit"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Đổi ảnh đại diện"
          >
            {uploading ? <Spinner size={12} color="#fff" /> : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
        </div>

        <div className="profile-hero-name">{user.name}</div>
        <div className="profile-hero-role">{roleText}</div>
        <div className="profile-hero-email">{user.email}</div>
      </div>

      {/* ── Stats ── */}
      <div className="profile-stats-row">
        <div className="profile-stat-pill">
          <span className="profile-stat-pill-val">{stats.orders}</span>
          <span className="profile-stat-pill-label">Đơn hàng</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat-pill">
          <span className="profile-stat-pill-val green">{fmt(stats.revenue)}</span>
          <span className="profile-stat-pill-label">Doanh thu</span>
        </div>
      </div>

      {/* ── Menu chức năng ── */}
      <div className="profile-section-title">Chức năng</div>
      <div className="profile-menu">
        {menuItems.map((item, i) => (
          <Link key={i} to={item.to} className="profile-menu-item">
            <span className="profile-menu-icon-wrap">
              <MenuIcon name={item.icon} />
            </span>
            <span className="profile-menu-title">{item.title}</span>
            <svg className="profile-menu-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        ))}
      </div>

      {/* ── Tài khoản ── */}
      <div className="profile-section-title">Tài khoản</div>
      <div className="profile-menu">
        <a href={STOREFRONT_URL} target="_blank" rel="noreferrer" className="profile-menu-item">
          <span className="profile-menu-icon-wrap blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 5h5v5"/><path d="M10 14L19 5"/>
              <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>
            </svg>
          </span>
          <span className="profile-menu-title">Top Page</span>
          <svg className="profile-menu-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>
        <Link to="/settings" className="profile-menu-item">
          <span className="profile-menu-icon-wrap gray">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </span>
          <span className="profile-menu-title">Cài đặt</span>
          <svg className="profile-menu-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
        <button className="profile-menu-item" onClick={handleRefreshPermissions} disabled={refreshing}>
          <span className="profile-menu-icon-wrap green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </span>
          <span className="profile-menu-title">{refreshing ? "Đang làm mới..." : "Làm mới quyền"}</span>
          <svg className="profile-menu-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        <button className="profile-menu-item danger" onClick={handleLogout}>
          <span className="profile-menu-icon-wrap red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span className="profile-menu-title">Đăng xuất</span>
          <svg className="profile-menu-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

    </div>
  );
}

function MenuIcon({ name }) {
  const props = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "home": return <svg {...props}><path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/></svg>;
    case "receipt": return <svg {...props}><path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2-3-2z"/><path d="M9 9h6M9 13h4"/></svg>;
    case "pos": return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h4M14 12h2M8 16h2"/></svg>;
    case "box": return <svg {...props}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 21v-9.5M20 7.5L12 12 4 7.5"/></svg>;
    case "users": return <svg {...props}><circle cx="9" cy="8" r="3"/><path d="M4 18a5 5 0 0 1 10 0"/><circle cx="17" cy="9" r="2.5"/><path d="M14.5 18a4 4 0 0 1 6 0"/></svg>;
    case "content": return <svg {...props}><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M8.5 4v16M11 8h6M11 12h6M11 16h4"/></svg>;
    case "discount": return <svg {...props}><path d="M18.5 5.5l-13 13"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/></svg>;
    case "payment": return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9.5h18M7 14.5h3M12 14.5h5"/></svg>;
    case "user": return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>;
    case "shield": return <svg {...props}><path d="M12 3l7 3.5V12c0 4.7-2.8 7.6-7 9c-4.2-1.4-7-4.3-7-9V6.5L12 3z"/><path d="M9.2 12.2l1.8 1.8 3.8-4"/></svg>;
    case "bell": return <svg {...props}><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z"/></svg>;
    case "chat": return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="8"/></svg>;
  }
}
