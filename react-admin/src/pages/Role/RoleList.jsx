import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { can } from "../../auth/permission";
import { useMsg } from "../../components/MsgContext/MsgContext";
import { SkeletonListRows } from "../../components/Loading/Loading";
import { PERMISSION_GROUPS } from "../../config/adminNavigation";

function groupPermissionsBySection(permissions) {
  const groups = PERMISSION_GROUPS.map((group) => ({
    label: group.label,
    prefixes: group.prefixes,
    permissions: [],
  }));
  const otherPermissions = [];

  permissions.forEach((permission) => {
    const targetGroup = groups.find((group) =>
      group.prefixes.some((prefix) => permission.name.startsWith(prefix)),
    );

    if (targetGroup) {
      targetGroup.permissions.push(permission);
    } else {
      otherPermissions.push(permission);
    }
  });

  const visibleGroups = groups
    .filter((group) => group.permissions.length > 0)
    .map((group) => [group.label, group.permissions]);

  if (otherPermissions.length > 0) {
    visibleGroups.push(["Khac", otherPermissions]);
  }

  return visibleGroups;
}

export default function RoleList() {
  const { showSuccess, showDanger } = useMsg();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSelected, setCreateSelected] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSelected, setEditSelected] = useState([]);

  const activeRole = useMemo(
    () => roles.find((role) => role.id === activeRoleId) || null,
    [roles, activeRoleId],
  );

  const groupedPermissions = useMemo(
    () => groupPermissionsBySection(permissions),
    [permissions],
  );

  const load = async () => {
    setLoading(true);

    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        axiosClient.get("/roles"),
        axiosClient.get("/permissions"),
      ]);

      setRoles(Array.isArray(rolesRes.data?.data) ? rolesRes.data.data : []);
      setPermissions(
        Array.isArray(permissionsRes.data?.data) ? permissionsRes.data.data : [],
      );
    } catch (error) {
      showDanger(error?.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = (list, setList, id) => {
    setList((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  };

  const openCreate = () => {
    setCreateName("");
    setCreateSelected([]);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateName("");
    setCreateSelected([]);
  };

  const openEdit = (role) => {
    setActiveRoleId(role.id);
    setEditName(role.name || "");
    setEditSelected((role.permissions || []).map((permission) => permission.id));
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setActiveRoleId(null);
    setEditName("");
    setEditSelected([]);
  };

  const createRole = async (event) => {
    event.preventDefault();

    if (!can("role.create")) {
      showDanger("Ban khong co quyen tao vai tro moi");
      return;
    }

    if (!createName.trim()) return;

    setSaving(true);

    try {
      await axiosClient.post("/roles", {
        name: createName.trim(),
        permission_ids: createSelected,
      });

      closeCreate();
      await load();
      showSuccess("Tao vai tro thanh cong");
    } catch (error) {
      showDanger(error?.response?.data?.message || "Tao vai tro that bai");
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (event) => {
    event.preventDefault();

    if (!can("role.update")) {
      showDanger("Ban khong co quyen chinh sua vai tro");
      return;
    }

    if (!activeRoleId || !editName.trim()) return;

    setSaving(true);

    try {
      await axiosClient.put(`/roles/${activeRoleId}`, {
        name: editName.trim(),
        permission_ids: editSelected,
      });

      closeEdit();
      await load();
      showSuccess("Cap nhat vai tro thanh cong");
    } catch (error) {
      showDanger(error?.response?.data?.message || "Cap nhat vai tro that bai");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (role) => {
    if (!can("role.delete")) {
      showDanger("Ban khong co quyen xoa vai tro");
      return;
    }

    const ok = window.confirm(`Ban co chac muon xoa vai tro "${role.name}" khong?`);
    if (!ok) return;

    setSaving(true);

    try {
      await axiosClient.delete(`/roles/${role.id}`);
      await load();
      showSuccess("Xoa vai tro thanh cong");
    } catch (error) {
      showDanger(error?.response?.data?.message || "Xoa vai tro that bai");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rl-wrap">
      <div className="rl-head">
        <h2>Danh sach vai tro</h2>

        <button
          className="btn_add"
          onClick={openCreate}
          disabled={saving || !can("role.create")}
          title={!can("role.create") ? "Khong co quyen" : ""}
        >
          Them vai tro
        </button>
      </div>

      {loading ? (
        <SkeletonListRows rows={4} />
      ) : (
        <div className="card-table">
          <table>
            <thead>
              <tr>
                <th>Vai tro</th>
                <th>So quyen</th>
                <th>Quyen tieu bieu</th>
                <th>Thao tac</th>
              </tr>
            </thead>

            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td>{(role.permissions || []).length}</td>
                  <td>
                    {(role.permissions || [])
                      .slice(0, 3)
                      .map((permission) => permission.name)
                      .join(", ")}
                    {(role.permissions || []).length > 3 ? ", ..." : ""}
                  </td>
                  <td>
                    <div className="table-action">
                      <button
                        className="btn_edit"
                        onClick={() => openEdit(role)}
                        disabled={saving || !can("role.update")}
                      >
                        Sua
                      </button>

                      <button
                        className="btn_delete"
                        onClick={() => deleteRole(role)}
                        disabled={saving || !can("role.delete")}
                      >
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {roles.length === 0 && (
                <tr>
                  <td colSpan={4}>Khong co vai tro nao</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="card-popup" onClick={closeCreate}>
          <div className="popup-md" onClick={(event) => event.stopPropagation()}>
            <div className="popup-header">
              <div className="popup-title">Tao vai tro moi</div>
              <button type="button" onClick={closeCreate}>
                Dong
              </button>
            </div>

            <form onSubmit={createRole} className="popup-body">
              <div className="popup-field">
                <div className="popup-label">Ten vai tro</div>
                <input
                  className="popup-input"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Nhap ten vai tro"
                  required
                  disabled={!can("role.create") || saving}
                />
              </div>

              <div className="popup-label">Phan quyen</div>

              <div className="popup-checkbox-grouped">
                {groupedPermissions.map(([groupName, groupPermissions]) => (
                  <div key={groupName} className="permission-group">
                    <div className="permission-group-title">{groupName}</div>
                    <div className="permission-group-items">
                      {groupPermissions.map((permission) => (
                        <label key={permission.id} className="popup-check">
                          <input
                            type="checkbox"
                            checked={createSelected.includes(permission.id)}
                            onChange={() =>
                              toggle(createSelected, setCreateSelected, permission.id)
                            }
                            disabled={!can("role.create") || saving}
                          />
                          <span>{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="popup-footer">
                <button type="button" onClick={closeCreate} disabled={saving}>
                  Huy
                </button>

                <button
                  type="submit"
                  className="btn_success"
                  disabled={saving || !can("role.create") || !createName.trim()}
                >
                  {saving ? "Dang tao..." : "Tao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && activeRole && (
        <div className="card-popup" onClick={closeEdit}>
          <div className="popup-lg" onClick={(event) => event.stopPropagation()}>
            <div className="popup-header">
              <div className="popup-title">Chinh sua vai tro</div>
              <button type="button" onClick={closeEdit}>
                Dong
              </button>
            </div>

            <form onSubmit={updateRole} className="popup-body">
              <div className="popup-field">
                <div className="popup-label">Ten vai tro</div>
                <input
                  className="popup-input"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Nhap ten vai tro"
                  required
                  disabled={!can("role.update") || saving}
                />
              </div>

              <div className="popup-label">Phan quyen</div>

              <div className="popup-checkbox-grouped">
                {groupedPermissions.map(([groupName, groupPermissions]) => (
                  <div key={groupName} className="permission-group">
                    <div className="permission-group-title">{groupName}</div>
                    <div className="permission-group-items">
                      {groupPermissions.map((permission) => (
                        <label key={permission.id} className="popup-check">
                          <input
                            type="checkbox"
                            checked={editSelected.includes(permission.id)}
                            onChange={() =>
                              toggle(editSelected, setEditSelected, permission.id)
                            }
                            disabled={!can("role.update") || saving}
                          />
                          <span>{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="popup-footer">
                <button type="button" onClick={closeEdit} disabled={saving}>
                  Huy
                </button>

                <button
                  type="submit"
                  className="btn_warning"
                  disabled={saving || !can("role.update") || !editName.trim()}
                >
                  {saving ? "Dang cap nhat..." : "Cap nhat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
