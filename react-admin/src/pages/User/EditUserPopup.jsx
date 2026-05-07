import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { can } from "../../auth/permission";
import { useMsg } from "../../components/MsgContext/MsgContext";

export default function EditUserPopup({ open, user, onClose, onUpdated }) {
  const { showSuccess, showDanger } = useMsg();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    setName(user.name || "");
    setEmail(user.email || "");
    setPassword("");
  }, [open, user]);

  const submit = async (event) => {
    event.preventDefault();
    if (!can("user.update") || !user) return;

    setLoading(true);

    try {
      const payload = {
        name,
        email,
      };

      if (password.trim()) {
        payload.password = password;
      }

      const res = await axiosClient.patch(`/users/${user.id}`, payload);
      onUpdated && onUpdated(res.data?.data || null);
      onClose && onClose();
      showSuccess("Cap nhat nguoi dung thanh cong");
    } catch (error) {
      showDanger(error?.response?.data?.message || "Update user failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !user) return null;

  return (
    <div className="card-popup" onClick={onClose}>
      <div className="popup-sm" onClick={(event) => event.stopPropagation()}>
        <div className="popup-header">
          <h2 className="popup-title">Chinh sua nguoi dung</h2>
          <button type="button" onClick={onClose}>
            Dong
          </button>
        </div>

        <form onSubmit={submit} className="popup-body">
          <div className="popup-field">
            <div className="popup-label">Ten</div>
            <input
              className="popup-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ho va ten"
              required
            />
          </div>

          <div className="popup-field">
            <div className="popup-label">Email</div>
            <input
              className="popup-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Your email address"
              required
            />
          </div>

          <div className="popup-field">
            <div className="popup-label">Mat khau moi</div>
            <input
              className="popup-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={6}
              placeholder="Bo trong neu khong doi"
            />
          </div>

          <div className="popup-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Huy
            </button>

            <button
              type="submit"
              disabled={!can("user.update") || loading}
              className="btn_success"
            >
              {loading ? "Dang luu..." : "Cap nhat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
