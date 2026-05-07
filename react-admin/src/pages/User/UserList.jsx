import React, { useEffect, useState } from "react";
import axiosClient from "/src/api/axiosClient";
import { can } from "/src/auth/permission";
import { useMsg } from "../../components/MsgContext/MsgContext";
import { SkeletonListRows } from "../../components/Loading/Loading";
import CreateUserPopup from "./CreateUserPopup";
import EditUserPopup from "./EditUserPopup";

function formatOfflineDuration(offlineSince, nowTick) {
  if (!offlineSince) {
    return "Chua dang nhap";
  }

  const diffMs = Math.max(0, nowTick - new Date(offlineSince).getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  if (totalSeconds < 60) {
    return `Offline ${totalSeconds} giay`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainSeconds = totalSeconds % 60;

  if (totalMinutes < 60) {
    if (remainSeconds === 0) {
      return `Offline ${totalMinutes} phut`;
    }

    return `Offline ${totalMinutes} phut ${remainSeconds} giay`;
  }

  const totalHours = Math.floor(totalMinutes / 60);

  if (totalHours < 24) {
    const remainMinutes = totalMinutes % 60;

    if (remainMinutes === 0) {
      return `Offline ${totalHours} gio`;
    }

    return `Offline ${totalHours} gio ${remainMinutes} phut`;
  }

  const totalDays = Math.floor(totalHours / 24);
  return `Offline ${totalDays} ngay`;
}

function renderUserStatus(user, nowTick) {
  if (user?.is_online) {
    return {
      label: "Online",
      className: "ul-status online",
    };
  }

  return {
    label: formatOfflineDuration(user?.offline_since, nowTick),
    className: "ul-status offline",
  };
}

export default function UserList() {
  const { showSuccess, showDanger } = useMsg();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [meId, setMeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [showCreateUserPopup, setShowCreateUserPopup] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [statusSnapshotAt, setStatusSnapshotAt] = useState(() => Date.now());

  const load = async (showSpinner = true, showError = true) => {
    if (showSpinner) {
      setLoading(true);
    }

    try {
      const [uRes, rRes, meRes] = await Promise.all([
        axiosClient.get("/users"),
        axiosClient.get("/roles"),
        axiosClient.get("/me"),
      ]);

      setUsers(uRes.data?.data || []);
      setRoles(rRes.data?.data || []);
      setMeId(meRes.data?.id ?? null);
      setStatusSnapshotAt(Date.now());
    } catch (error) {
      if (showError) {
        showDanger(error?.response?.data?.message || "Load failed");
      }
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateUserRole = async (userId, roleId) => {
    if (!can("user.update")) return;

    setSavingUserId(userId);

    try {
      const res = await axiosClient.put(`/users/${userId}/roles`, {
        role_ids: roleId ? [roleId] : [],
      });

      const updatedUser = res.data?.data || null;

      setUsers((previous) =>
        previous.map((user) =>
          user.id === userId
            ? {
                ...user,
                ...(updatedUser || {}),
              }
            : user,
        ),
      );

      showSuccess("Thay doi vai tro thanh cong");
    } catch (error) {
      showDanger(error?.response?.data?.message || "Update failed");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!can("user.delete")) return;
    if (String(user.id) === String(meId)) {
      showDanger("Khong the xoa tai khoan dang dang nhap");
      return;
    }

    const ok = window.confirm(
      `Ban co chac muon xoa nguoi dung ${user.name || user.email} khong?`,
    );

    if (!ok) return;

    setDeletingUserId(user.id);

    try {
      await axiosClient.delete(`/users/${user.id}`);
      setUsers((previous) => previous.filter((item) => item.id !== user.id));
      showSuccess("Xoa nguoi dung thanh cong");
    } catch (error) {
      showDanger(error?.response?.data?.message || "Delete failed");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleUpdatedUser = (updatedUser) => {
    if (!updatedUser?.id) return;

    setUsers((previous) =>
      previous.map((user) =>
        user.id === updatedUser.id
          ? {
              ...user,
              ...updatedUser,
            }
          : user,
      ),
    );
  };

  const getUserRoleId = (user) => {
    if (!user.roles || user.roles.length === 0) return "";
    const role = roles.find((item) => item.name === user.roles[0]);
    return role ? role.id : "";
  };

  return (
    <div className="ul-wrap">
      <div className="ul-head">
        <h2 className="ul-title">Danh sach nguoi dung quan tri</h2>

        {can("user.create") && (
          <button
            className="btn_add"
            onClick={() => setShowCreateUserPopup(true)}
          >
            Tao nguoi dung moi
          </button>
        )}
      </div>

      <CreateUserPopup
        open={showCreateUserPopup}
        onClose={() => setShowCreateUserPopup(false)}
        onCreated={() => void load(false)}
      />

      <EditUserPopup
        open={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUpdated={handleUpdatedUser}
      />

      {loading ? (
        <SkeletonListRows rows={5} />
      ) : (
        <div className="card-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Hanh dong</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => {
                const status = renderUserStatus(user, statusSnapshotAt);
                const isCurrentUser = String(user.id) === String(meId);

                return (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>

                    <td>
                      <select
                        className="ul-select"
                        value={getUserRoleId(user)}
                        onChange={(event) =>
                          updateUserRole(user.id, Number(event.target.value))
                        }
                        disabled={!can("user.update") || savingUserId === user.id}
                      >
                        <option value="">No role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <span className={status.className}>{status.label}</span>
                    </td>

                    <td>
                      <div className="table-action">
                        <button
                          type="button"
                          className="btn_edit"
                          onClick={() => setEditingUser(user)}
                          disabled={!can("user.update")}
                        >
                          Sua
                        </button>
                        <button
                          type="button"
                          className="btn_delete"
                          onClick={() => handleDeleteUser(user)}
                          disabled={
                            !can("user.delete") ||
                            deletingUserId === user.id ||
                            isCurrentUser
                          }
                        >
                          {deletingUserId === user.id ? "Dang xoa..." : "Xoa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td className="ul-td" colSpan={5}>
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
