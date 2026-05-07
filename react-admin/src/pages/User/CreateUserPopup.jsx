import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { can } from "../../auth/permission";
import { useMsg } from "../../components/MsgContext/MsgContext";

export default function CreateUserPopup({ open, onClose, onCreated }) {
  const { showSuccess, showDanger } = useMsg();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const init = async () => {
      setName("");
      setEmail("");
      setPassword("");
      setRoleId("");

      try {
        const res = await axiosClient.get("/roles");
        setRoles(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch {
        setRoles([]);
      }
    };

    init();
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!can("user.create")) return;

    setLoading(true);

    try {
      await axiosClient.post("/users", {
        name,
        email,
        password,
        role_ids: roleId ? [Number(roleId)] : [],
      });

      onCreated && onCreated();
      onClose && onClose();
      showSuccess("Tạo người dùng mới thành công.");
    } catch (e2) {
      showDanger(e2?.response?.data?.message || "Create user failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="card-popup" onClick={onClose}>
      <div className="popup-sm" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2 className="popup-title">Tạo người dùng mới</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} className="popup-body">
          <div className="popup-field">
            <div className="popup-label">Tên</div>
            <input
              className="popup-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Họ và tên"
              required
            />
          </div>

          <div className="popup-field">
            <div className="popup-label">Email</div>
            <input
              className="popup-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Your email address"
              required
            />
          </div>

          <div className="popup-field">
            <div className="popup-label">Mật khẩu</div>
            <input
              className="popup-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              minLength={6}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <div className="popup-field">
            <div className="popup-label">Vai trò</div>

            {roles.length === 0 ? (
              <div className="popup-note">
                Hiện tại chưa có vai trò, hãy tạo vai trò trước !!!
              </div>
            ) : (
              <select
                className="popup-select"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={!can("user.create")}
                required
              >
                <option value="" disabled>
                  Hãy chọn vai trò
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="popup-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Hủy
            </button>

            <button
              type="submit"
              disabled={!can("user.create") || loading || roles.length === 0}
              className="btn_success"
            >
              {loading ? "Đang tạo..." : "Tạo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
