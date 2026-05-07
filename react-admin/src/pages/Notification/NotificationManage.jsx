import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useMsg } from "../../components/MsgContext/MsgContext";
import { can } from "../../auth/permission";
import { Spinner } from "../../components/Loading/Loading";

const TYPE_OPTIONS = [
  { value: "info",    label: "Thông tin",  icon: "ℹ️" },
  { value: "success", label: "Thành công", icon: "✅" },
  { value: "warning", label: "Cảnh báo",  icon: "⚠️" },
  { value: "error",   label: "Lỗi",       icon: "❌" },
];

const RECIPIENT_MODES = [
  { value: "all",  label: "Tất cả" },
  { value: "role", label: "Theo vai trò" },
  { value: "user", label: "Chọn người dùng" },
];

const EMPTY_FORM = { message: "", type: "info", recipientMode: "all", roleIds: [], userIds: [] };

export default function NotificationManage() {
  const { showSuccess, showDanger } = useMsg();

  const [tab, setTab] = useState("list"); // "list" | "create"
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  // Edit popup
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Likers popup
  const [likersOpen, setLikersOpen] = useState(false);
  const [likers, setLikers] = useState([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const [likersNotif, setLikersNotif] = useState(null);

  useEffect(() => {
    axiosClient.get("/roles").then((r) => setRoles(r.data?.data || [])).catch(() => {});
    axiosClient.get("/users").then((r) => setUsers(r.data?.data || [])).catch(() => {});
    fetchList();
  }, []);

  async function fetchList() {
    setListLoading(true);
    try {
      const res = await axiosClient.get("/notifications/all");
      setNotifications(res.data?.data || []);
    } catch { } finally {
      setListLoading(false);
    }
  }

  function toggleId(key, id) {
    setForm((p) => ({
      ...p,
      [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.message.trim()) { showDanger("Vui lòng nhập nội dung"); return; }
    if (form.recipientMode === "role" && form.roleIds.length === 0) { showDanger("Chọn ít nhất một vai trò"); return; }
    if (form.recipientMode === "user" && form.userIds.length === 0) { showDanger("Chọn ít nhất một người nhận"); return; }

    setLoading(true);
    try {
      await axiosClient.post("/notifications", {
        message: form.message,
        type: form.type,
        sendToAll: form.recipientMode === "all",
        roleIds: form.recipientMode === "role" ? form.roleIds : [],
        userIds: form.recipientMode === "user" ? form.userIds : [],
      });
      showSuccess("Gửi thông báo thành công");
      setForm(EMPTY_FORM);
      setTab("list");
      fetchList();
    } catch { showDanger("Gửi thông báo thất bại"); }
    finally { setLoading(false); }
  }

  // Edit
  function openEdit(n) {
    setEditItem({
      id: n.id,
      message: n.message,
      type: n.type,
      recipientMode: n.recipientType || "all",   // chính xác từ DB
      userIds: n.recipientType === "user" ? (n.recipientIds || []) : [],
      roleIds: n.recipientType === "role" ? (n.recipientIds || []) : [],
    });
    setEditOpen(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editItem.message.trim()) return;
    if (editItem.recipientMode === "user" && editItem.userIds.length === 0) {
      showDanger("Chọn ít nhất một người nhận"); return;
    }
    setEditSaving(true);
    try {
      await axiosClient.patch(`/notifications/${editItem.id}`, {
        message: editItem.message,
        type: editItem.type,
        sendToAll: editItem.recipientMode === "all",
        roleIds: editItem.recipientMode === "role" ? editItem.roleIds : [],
        userIds: editItem.recipientMode === "user" ? editItem.userIds : [],
      });
      showSuccess("Cập nhật thành công");
      setEditOpen(false);
      fetchList();
    } catch { showDanger("Cập nhật thất bại"); }
    finally { setEditSaving(false); }
  }

  function toggleEditId(key, id) {
    setEditItem((p) => ({
      ...p,
      [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id],
    }));
  }

  async function deleteNotif(id) {
    if (!window.confirm("Xóa thông báo này?")) return;
    try {
      await axiosClient.delete(`/notifications/${id}`);
      showSuccess("Đã xóa");
      fetchList();
    } catch { showDanger("Xóa thất bại"); }
  }

  // Likers
  async function openLikers(n) {
    setLikersNotif(n);
    setLikersOpen(true);
    setLikersLoading(true);
    try {
      const res = await axiosClient.get(`/notifications/${n.id}/likers`);
      setLikers(res.data?.data || []);
    } catch { setLikers([]); }
    finally { setLikersLoading(false); }
  }

  const typeIcon = (t) => TYPE_OPTIONS.find((x) => x.value === t)?.icon || "ℹ️";

  return (
    <div className="nm-page">
      <div className="nm-wrap">

        {/* Tabs */}
        <div className="nm-tabs">
          <button className={`nm-tab ${tab === "list" ? "is-active" : ""}`} onClick={() => setTab("list")}>
            Danh sách thông báo
          </button>
          {can("notification.create") && (
            <button className={`nm-tab ${tab === "create" ? "is-active" : ""}`} onClick={() => setTab("create")}>
              + Tạo thông báo
            </button>
          )}
        </div>

        {/* ── LIST ── */}
        {tab === "list" && (
          <div className="nm-card">
            {listLoading ? (
              <div className="nm-list-loading"><Spinner size={20} /> Đang tải...</div>
            ) : notifications.length === 0 ? (
              <div className="nm-empty">Chưa có thông báo nào</div>
            ) : (
              <div className="nm-list">
                {notifications.map((n) => (
                  <div key={n.id} className="nm-list-item">
                    <div className="nm-list-icon">{typeIcon(n.type)}</div>
                    <div className="nm-list-body">
                      <p className="nm-list-msg">{n.message}</p>
                      <div className="nm-list-meta">
                        <span>{new Date(n.createdAt).toLocaleString("vi-VN")}</span>
                        <span>·</span>
                        <span>{n.recipientCount} người nhận</span>
                        <span>·</span>
                        <span>{n.readCount} đã đọc</span>
                        <span>·</span>
                        <button className="nm-likers-btn" onClick={() => openLikers(n)}>
                          ❤️ {n.likeCount}
                        </button>
                      </div>
                    </div>
                    <div className="nm-list-actions">
                      {can("notification.update") && (
                        <button className="nm-action-btn" onClick={() => openEdit(n)} title="Sửa">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      )}
                      {can("notification.delete") && (
                        <button className="nm-action-btn danger" onClick={() => deleteNotif(n.id)} title="Xóa">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CREATE ── */}
        {tab === "create" && (
          <div className="nm-card">
            <form onSubmit={handleSubmit}>
              <div className="popup-field">
                <label className="nm-label">Loại thông báo</label>
                <select className="nm-select" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>

              <div className="popup-field">
                <label className="nm-label">Nội dung</label>
                <textarea className="nm-textarea" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} placeholder="Nhập nội dung thông báo..." rows={4} />
              </div>

              <div className="popup-field">
                <label className="nm-label">Người nhận</label>
                <div className="nm-recipient-tabs">
                  {RECIPIENT_MODES.map((m) => (
                    <button key={m.value} type="button" className={`nm-recipient-tab ${form.recipientMode === m.value ? "is-active" : ""}`} onClick={() => setForm((p) => ({ ...p, recipientMode: m.value }))}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {form.recipientMode === "role" && (
                  <div className="nm-check-list">
                    {roles.map((r) => (
                      <label key={r.id} className="nm-check-item">
                        <input type="checkbox" checked={form.roleIds.includes(r.id)} onChange={() => toggleId("roleIds", r.id)} />
                        <span className="nm-check-name">{r.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {form.recipientMode === "user" && (
                  <div className="nm-check-list">
                    {users.map((u) => (
                      <label key={u.id} className="nm-check-item">
                        <input type="checkbox" checked={form.userIds.includes(u.id)} onChange={() => toggleId("userIds", u.id)} />
                        <span className="nm-check-name">{u.name}</span>
                        <span className="nm-check-sub">{u.email}</span>
                      </label>
                    ))}
                  </div>
                )}

                {form.recipientMode === "all" && (
                  <div className="nm-all-hint">Thông báo sẽ được gửi đến tất cả người dùng trong hệ thống</div>
                )}
              </div>

              <div className="nm-footer">
                <button type="submit" className="nm-submit-btn" disabled={loading}>
                  {loading ? <><Spinner size={15} color="#fff" /> Đang gửi...</> : "Gửi thông báo"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Edit popup ── */}
      {editOpen && editItem && (
        <div className="card-popup" onClick={() => setEditOpen(false)}>
          <div className="popup-md" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Sửa thông báo</h3>
              <button onClick={() => setEditOpen(false)}>✕</button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="nm-field">
                <label className="nm-label">Loại</label>
                <select className="popup-select" value={editItem.type} onChange={(e) => setEditItem((p) => ({ ...p, type: e.target.value }))}>
                  {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div className="nm-field">
                <label className="nm-label">Nội dung</label>
                <textarea className="popup-textarea" value={editItem.message} onChange={(e) => setEditItem((p) => ({ ...p, message: e.target.value }))} rows={3} />
              </div>
              <div className="nm-field">
                <label className="nm-label">Người nhận</label>
                <div className="nm-recipient-tabs">
                  {RECIPIENT_MODES.map((m) => (
                    <button key={m.value} type="button"
                      className={`nm-recipient-tab ${editItem.recipientMode === m.value ? "is-active" : ""}`}
                      onClick={() => setEditItem((p) => ({ ...p, recipientMode: m.value }))}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {editItem.recipientMode === "role" && (
                  <div className="nm-check-list">
                    {roles.map((r) => (
                      <label key={r.id} className="nm-check-item">
                        <input type="checkbox" checked={editItem.roleIds.includes(r.id)} onChange={() => toggleEditId("roleIds", r.id)} />
                        <span className="nm-check-name">{r.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {editItem.recipientMode === "user" && (
                  <div className="nm-check-list" style={{ maxHeight: 200, overflowY: "auto" }}>
                    {users.map((u) => (
                      <label key={u.id} className="nm-check-item">
                        <input type="checkbox" checked={editItem.userIds.includes(u.id)} onChange={() => toggleEditId("userIds", u.id)} />
                        <span className="nm-check-name">{u.name}</span>
                        <span className="nm-check-sub">{u.email}</span>
                      </label>
                    ))}
                  </div>
                )}

                {editItem.recipientMode === "all" && (
                  <div className="nm-all-hint">Gửi đến tất cả người dùng trong hệ thống</div>
                )}
              </div>
              <div className="popup-footer">
                <button type="button" onClick={() => setEditOpen(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={editSaving}>
                  {editSaving ? <><Spinner size={14} color="#fff" /> Đang lưu...</> : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Likers popup ── */}
      {likersOpen && (
        <div className="card-popup" onClick={() => setLikersOpen(false)}>
          <div className="popup-md" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>❤️ Người đã thích ({likers.length})</h3>
              <button onClick={() => setLikersOpen(false)}>✕</button>
            </div>
            <div className="popup-body">
            {likersLoading ? (
              <div className="nm-list-loading"><Spinner size={18} /> Đang tải...</div>
            ) : likers.length === 0 ? (
              <div className="nm-empty">Chưa có ai thích thông báo này</div>
            ) : (
              <div className="nm-likers-list">
                {likers.map((l) => (
                  <div key={l.id} className="nm-liker-item">
                    <div className="nm-liker-avatar">{l.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="nm-liker-name">{l.name}</div>
                      <div className="nm-liker-email">{l.email}</div>
                    </div>
                    <span className="nm-liker-time">{new Date(l.likedAt).toLocaleString("vi-VN")}</span>
                  </div>
                ))}
              </div>
            )}
            </div>
            <div className="popup-footer">
              <button type="button" onClick={() => setLikersOpen(false)}>ÄÃ³ng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
