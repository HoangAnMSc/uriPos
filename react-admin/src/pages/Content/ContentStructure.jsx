import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useMsg } from "../../components/MsgContext/MsgContext";
import { SkeletonTableRows } from "../../components/Loading/Loading";

const FIELD_TYPES = [
  { value: "single_line", label: "Single line text" },
  { value: "multi_line", label: "Three line text" },
  { value: "wysiwyg", label: "WYSIWYG editor" },
  { value: "html", label: "HTML code" },
  { value: "image", label: "Image upload" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
];

const EMPTY_STRUCTURE = { id: null, name: "", slug: "" };
const EMPTY_FIELD = {
  id: null,
  name: "",
  slug: "",
  type: "single_line",
  required: false,
  description: "",
  optionsText: "",
};

const typeMap = Object.fromEntries(FIELD_TYPES.map((x) => [x.value, x.label]));

function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isSelectionType(type) {
  return type === "radio" || type === "checkbox";
}

function parseOptions(text) {
  return String(text || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function getApiMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

function includesText(hay, needle) {
  const h = String(hay || "").toLowerCase();
  const n = String(needle || "")
    .trim()
    .toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

function sortFields(fields) {
  return [...(fields || [])].sort((a, b) => {
    const ao = Number(a.sort_order ?? 0);
    const bo = Number(b.sort_order ?? 0);
    if (ao !== bo) return ao - bo;
    return Number(a.id) - Number(b.id);
  });
}

function getFieldIcon(type) {
  switch (type) {
    case "date":
      return "📅";
    case "image":
      return "🖼️";
    case "number":
      return "123";
    case "radio":
      return "◉";
    case "checkbox":
      return "☑";
    case "wysiwyg":
      return "✍";
    case "html":
      return "</>";
    case "multi_line":
      return "≣";
    default:
      return "T";
  }
}

function normalizeStructure(data) {
  return {
    ...data,
    fields: Array.isArray(data?.fields) ? data.fields : [],
  };
}

function normalizeFieldToDraft(field) {
  return {
    id: field?.id || null,
    name: field?.name || "",
    slug: field?.slug || "",
    type: field?.type || "single_line",
    required: !!field?.required,
    description: field?.description || "",
    optionsText: Array.isArray(field?.options)
      ? field.options
          .map((opt) =>
            typeof opt === "string" ? opt : opt?.label || opt?.value || "",
          )
          .filter(Boolean)
          .join("\n")
      : "",
  };
}

function Popup({ open, title, onClose, children, footer, size = "popup-md" }) {
  if (!open) return null;

  return (
    <div className="card-popup" onClick={onClose}>
      <div className={size} onClick={(event) => event.stopPropagation()}>
        <div className="popup-header">
          <h3 className="popup-title">{title}</h3>
          <button type="button" className="popup-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="popup-body">{children}</div>

        {footer ? <div className="popup-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

function StructurePopup({
  open,
  title,
  draft,
  setDraft,
  saving,
  onClose,
  onSubmit,
}) {
  return (
    <Popup
      open={open}
      title={title}
      onClose={onClose}
      size="popup-sm"
      footer={
        <>
          <button onClick={onClose} disabled={saving} type="button">
            Đóng
          </button>
          <button
            className="btn_success"
            onClick={onSubmit}
            disabled={
              saving ||
              !String(draft?.name || "").trim() ||
              !String(draft?.slug || "").trim()
            }
            type="button"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </>
      }
    >
      <div className="popup-field">
        <label className="popup-label">Tên cấu trúc nội dung</label>
        <input
          className="popup-input"
          value={draft?.name || ""}
          onChange={(e) => {
            const v = e.target.value;
            setDraft((prev) => ({
              ...(prev || {}),
              name: v,
              slug: prev?.slug ? prev.slug : slugify(v),
            }));
          }}
          placeholder="Example: Topics"
        />
      </div>

      <div className="popup-field">
        <label className="popup-label">Slug</label>
        <input
          className="popup-input"
          value={draft?.slug || ""}
          onChange={(e) =>
            setDraft((prev) => ({
              ...(prev || {}),
              slug: e.target.value,
            }))
          }
          placeholder="Example: topics"
        />
      </div>
    </Popup>
  );
}

function FieldPopup({
  open,
  draft,
  setDraft,
  saving,
  onClose,
  onSubmit,
  isEdit,
}) {
  return (
    <Popup
      open={open}
      title={isEdit ? "Sửa field" : "Thêm field"}
      onClose={onClose}
      size="popup-md"
    >
      {!draft ? null : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="popup-field">
            <label className="popup-label">Field name</label>
            <input
              className="popup-input"
              value={draft.name}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((prev) => ({
                  ...(prev || {}),
                  name: v,
                  slug: prev?.slug ? prev.slug : slugify(v),
                }));
              }}
            />
          </div>

          <div className="popup-field">
            <label className="popup-label">Slug</label>
            <input
              className="popup-input"
              value={draft.slug}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...(prev || {}),
                  slug: e.target.value,
                }))
              }
            />
          </div>

          <div className="popup-field">
            <label className="popup-label">Field settings</label>
            <select
              className="popup-select"
              value={draft.type}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...(prev || {}),
                  type: e.target.value,
                  optionsText: isSelectionType(e.target.value)
                    ? prev?.optionsText || ""
                    : "",
                }))
              }
            >
              {FIELD_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="popup-field">
            <label className="popup-label">Flags</label>
            <label className="popup-check">
              <input
                type="checkbox"
                checked={!!draft.required}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...(prev || {}),
                    required: e.target.checked,
                  }))
                }
              />
              Required
            </label>
          </div>

          <div className="popup-field">
            <label className="popup-label">Description</label>
            <input
              className="popup-input"
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...(prev || {}),
                  description: e.target.value,
                }))
              }
              placeholder="Optional"
            />
          </div>

          {isSelectionType(draft.type) ? (
            <div className="popup-field">
              <label className="popup-label">Options</label>
              <textarea
                className="popup-textarea"
                value={draft.optionsText}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...(prev || {}),
                    optionsText: e.target.value,
                  }))
                }
                placeholder={
                  "One option per line\nOption 1\nOption 2\nOption 3"
                }
              />
            </div>
          ) : null}

          <div className="popup-footer">
            <button onClick={onClose} disabled={saving} type="button">
              Đóng
            </button>
            <button
              className="btn_edit"
              disabled={
                saving ||
                !String(draft.name || "").trim() ||
                !String(draft.slug || "").trim()
              }
              type="submit"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      )}
    </Popup>
  );
}

export default function ContentStructure() {
  const { showSuccess, showDanger } = useMsg();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [structures, setStructures] = useState([]);
  const [structureQuery, setStructureQuery] = useState("");
  const [fieldQuery, setFieldQuery] = useState("");

  const [structurePopupOpen, setStructurePopupOpen] = useState(false);
  const [structureDraft, setStructureDraft] = useState(EMPTY_STRUCTURE);

  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState("structure");

  const [fieldPopupOpen, setFieldPopupOpen] = useState(false);
  const [fieldDraft, setFieldDraft] = useState(null);

  const editingStructure = useMemo(() => {
    if (!structureDraft?.id) return null;
    return (
      structures.find((s) => String(s.id) === String(structureDraft.id)) || null
    );
  }, [structures, structureDraft]);

  const filteredStructures = useMemo(() => {
    const q = structureQuery.trim().toLowerCase();
    if (!q) return structures;
    return structures.filter(
      (s) =>
        includesText(s.name, q) ||
        includesText(s.slug, q) ||
        includesText(s.id, q),
    );
  }, [structures, structureQuery]);

  const filteredFields = useMemo(() => {
    const q = fieldQuery.trim().toLowerCase();
    const list = sortFields(editingStructure?.fields || []);
    if (!q) return list;

    return list.filter(
      (f) =>
        includesText(f.name, q) ||
        includesText(f.slug, q) ||
        includesText(f.type, q) ||
        includesText(typeMap[f.type], q) ||
        includesText(f.description, q) ||
        includesText(f.id, q),
    );
  }, [editingStructure, fieldQuery]);

  useEffect(() => {
    loadStructures();
  }, []);

  async function loadStructures() {
    setLoading(true);
    try {
      const res = await axiosClient.get("/content-structures");
      const list = res?.data?.data || [];
      setStructures(list.map(normalizeStructure));
    } catch (e) {
      showDanger(getApiMessage(e, "Failed to load content structures"));
    } finally {
      setLoading(false);
    }
  }

  function openCreateStructure() {
    setStructureDraft({ ...EMPTY_STRUCTURE });
    setStructurePopupOpen(true);
  }

  function closeStructurePopup() {
    setStructurePopupOpen(false);
    setStructureDraft({ ...EMPTY_STRUCTURE });
  }

  function openEditStructure(structure) {
    setStructureDraft({
      id: structure.id,
      name: structure.name || "",
      slug: structure.slug || "",
    });
    setEditTab("structure");
    setEditOpen(true);
    setFieldQuery("");
  }

  function closeEditStructure() {
    setEditOpen(false);
    setEditTab("structure");
    setStructureDraft({ ...EMPTY_STRUCTURE });
    setFieldQuery("");
  }

  function openAddField() {
    if (!editingStructure) return;
    setFieldDraft({ ...EMPTY_FIELD });
    setFieldPopupOpen(true);
  }

  function openEditField(field) {
    setFieldDraft(normalizeFieldToDraft(field));
    setFieldPopupOpen(true);
  }

  function closeFieldPopup() {
    setFieldPopupOpen(false);
    setFieldDraft(null);
  }

  async function saveStructure() {
    const name = String(structureDraft?.name || "").trim();
    const slug = String(structureDraft?.slug || "").trim() || slugify(name);
    if (!name || !slug) return;

    setSaving(true);
    try {
      if (structureDraft?.id) {
        const res = await axiosClient.put(
          `/content-structures/${structureDraft.id}`,
          { name, slug },
        );
        const updated = normalizeStructure(res?.data?.data || {});
        setStructures((prev) =>
          prev.map((s) => (String(s.id) === String(updated.id) ? updated : s)),
        );
        setStructureDraft({
          id: updated.id,
          name: updated.name || "",
          slug: updated.slug || "",
        });
        showSuccess("Đã cập nhật structure thành công.");
      } else {
        const res = await axiosClient.post("/content-structures", {
          name,
          slug,
        });
        const created = normalizeStructure(res?.data?.data || {});
        setStructures((prev) => [created, ...prev]);
        closeStructurePopup();
        showSuccess("Đã tạo structure thành công.");
      }
    } catch (e) {
      showDanger(getApiMessage(e, "Save structure failed"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteStructure(structure) {
    if (!structure?.id) return;
    if (!window.confirm(`Delete structure "${structure.name}"?`)) return;

    setSaving(true);
    try {
      await axiosClient.delete(`/content-structures/${structure.id}`);
      setStructures((prev) =>
        prev.filter((s) => String(s.id) !== String(structure.id)),
      );
      if (String(structureDraft?.id) === String(structure.id)) {
        closeEditStructure();
      }
      showSuccess("Đã xóa thành công nội dung.");
    } catch (e) {
      showDanger(getApiMessage(e, "Delete structure failed"));
    } finally {
      setSaving(false);
    }
  }

  async function saveField() {
    if (!editingStructure || !fieldDraft) return;

    const name = String(fieldDraft.name || "").trim();
    const slug = String(fieldDraft.slug || "").trim() || slugify(name);
    const type = String(fieldDraft.type || "").trim();
    if (!name || !slug || !type) return;

    const payload = {
      name,
      slug,
      type,
      required: !!fieldDraft.required,
      description: String(fieldDraft.description || "").trim() || null,
      options: isSelectionType(type)
        ? parseOptions(fieldDraft.optionsText)
        : null,
    };

    setSaving(true);
    try {
      const structureId = editingStructure.id;

      if (fieldDraft.id) {
        const res = await axiosClient.put(
          `/content-structures/${structureId}/fields/${fieldDraft.id}`,
          payload,
        );
        const updated = res?.data?.data;

        setStructures((prev) =>
          prev.map((s) =>
            String(s.id) !== String(structureId)
              ? s
              : {
                  ...s,
                  fields: (s.fields || []).map((f) =>
                    String(f.id) === String(updated.id) ? updated : f,
                  ),
                },
          ),
        );

        showSuccess("Đã cập nhật field.");
      } else {
        const res = await axiosClient.post(
          `/content-structures/${structureId}/fields`,
          payload,
        );
        const created = res?.data?.data;

        setStructures((prev) =>
          prev.map((s) =>
            String(s.id) !== String(structureId)
              ? s
              : {
                  ...s,
                  fields: [...(s.fields || []), created],
                },
          ),
        );

        showSuccess("Đã thêm field.");
      }

      closeFieldPopup();
    } catch (e) {
      showDanger(getApiMessage(e, "Save field failed"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteField(field) {
    if (!editingStructure || !field?.id) return;
    if (!window.confirm(`Delete field "${field.name}"?`)) return;

    setSaving(true);
    try {
      await axiosClient.delete(
        `/content-structures/${editingStructure.id}/fields/${field.id}`,
      );

      setStructures((prev) =>
        prev.map((s) =>
          String(s.id) !== String(editingStructure.id)
            ? s
            : {
                ...s,
                fields: (s.fields || []).filter(
                  (f) => String(f.id) !== String(field.id),
                ),
              },
        ),
      );

      showSuccess("Đã xóa field.");
    } catch (e) {
      showDanger(getApiMessage(e, "Delete field failed"));
    } finally {
      setSaving(false);
    }
  }

  async function moveField(fieldId, direction) {
    if (!editingStructure) return;

    const structureId = editingStructure.id;
    const list = sortFields(editingStructure.fields || []);
    const index = list.findIndex((f) => String(f.id) === String(fieldId));
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const swapped = [...list];
    [swapped[index], swapped[targetIndex]] = [
      swapped[targetIndex],
      swapped[index],
    ];

    const orders = swapped.map((f, i) => ({
      id: f.id,
      sort_order: i + 1,
    }));

    setSaving(true);
    try {
      await axiosClient.post(
        `/content-structures/${structureId}/fields-reorder`,
        { orders },
      );

      const normalized = swapped.map((f, i) => ({
        ...f,
        sort_order: i + 1,
      }));

      setStructures((prev) =>
        prev.map((s) =>
          String(s.id) === String(structureId)
            ? { ...s, fields: normalized }
            : s,
        ),
      );

      showSuccess("Đã cập nhật thứ tự field.");
    } catch (e) {
      showDanger(getApiMessage(e, "Reorder failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="csPage">
      <div className="csCardHeader">
        <h2>Cấu trúc nội dung dữ liệu</h2>
        <button
          className="btn_add"
          onClick={openCreateStructure}
          disabled={saving}
          type="button"
        >
          Tạo mới
        </button>
      </div>

      <div style={{ padding: "10px 0" }}>
        <input
          value={structureQuery}
          onChange={(e) => setStructureQuery(e.target.value)}
          placeholder="Search structures by name, slug, id"
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        />
      </div>

      <div className="csCardBody">
        {loading ? (
          <div className="card-table">
            <table>
              <thead><tr><th>Tên cấu trúc</th><th>Mã cấu trúc</th><th>Hành động</th></tr></thead>
              <tbody><SkeletonTableRows rows={4} cols={3} /></tbody>
            </table>
          </div>
        ) : filteredStructures.length === 0 ? (
          <div className="csPlaceholder">
            <div className="csPlaceholderTitle">Không tìm thấy kết quả</div>
            <div className="csPlaceholderText">
              Thử tìm kiếm bằng từ khóa khác
            </div>
          </div>
        ) : (
          <div className="card-table">
            <table>
              <thead>
                <tr>
                  <th>Tên cấu trúc</th>
                  <th>Mã cấu trúc</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredStructures.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.slug}</td>
                    <td className="table-action">
                      <button
                        className="btn_edit"
                        onClick={() => openEditStructure(s)}
                        disabled={saving}
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="btn_delete"
                        onClick={() => deleteStructure(s)}
                        disabled={saving}
                        type="button"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StructurePopup
        open={structurePopupOpen}
        title="Tạo cấu trúc nội dung mới"
        draft={structureDraft}
        setDraft={setStructureDraft}
        saving={saving}
        onClose={closeStructurePopup}
        onSubmit={saveStructure}
      />

      <Popup
        open={editOpen}
        title={
          editingStructure
            ? `Chỉnh sửa: ${editingStructure.name}`
            : "Edit structure"
        }
        onClose={closeEditStructure}
        size="popup-md"
        footer={
          editTab === "structure" ? (
            <>
              <button
                onClick={closeEditStructure}
                disabled={saving}
                type="button"
              >
                Đóng
              </button>
              <button
                className="btn_warning"
                onClick={saveStructure}
                disabled={
                  saving ||
                  !String(structureDraft?.name || "").trim() ||
                  !String(structureDraft?.slug || "").trim()
                }
                type="button"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </>
          ) : (
            <button
              onClick={closeEditStructure}
              disabled={saving}
              type="button"
            >
              Đóng
            </button>
          )
        }
      >
        {!editingStructure ? (
          <div className="csPlaceholder">
            <div className="csPlaceholderTitle">Không tìm thấy structure</div>
          </div>
        ) : (
          <>
            <div className="csModalTabs">
              <button
                className={`csTabBtn ${editTab === "structure" ? "isActive" : ""}`}
                onClick={() => setEditTab("structure")}
                type="button"
              >
                Structure
              </button>
              <button
                className={`csTabBtn ${editTab === "fields" ? "isActive" : ""}`}
                onClick={() => setEditTab("fields")}
                type="button"
              >
                Fields
              </button>
            </div>

            {editTab === "structure" ? (
              <>
                <div className="popup-field">
                  <label className="popup-label">Structure name</label>
                  <input
                    className="popup-input"
                    value={structureDraft?.name || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStructureDraft((prev) => ({
                        ...(prev || {}),
                        name: v,
                        slug: prev?.slug ? prev.slug : slugify(v),
                      }));
                    }}
                  />
                </div>

                <div className="popup-field">
                  <label className="popup-label">Slug</label>
                  <input
                    className="popup-input"
                    value={structureDraft?.slug || ""}
                    onChange={(e) =>
                      setStructureDraft((prev) => ({
                        ...(prev || {}),
                        slug: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="popup-header" style={{ padding: 0 }}>
                  <h4 className="popup-title">Thiết lập Field</h4>
                  <button
                    className="btn_add"
                    onClick={openAddField}
                    disabled={saving}
                    type="button"
                  >
                    Thêm field
                  </button>
                </div>

                <div className="popup-field">
                  <input
                    value={fieldQuery}
                    onChange={(e) => setFieldQuery(e.target.value)}
                    placeholder="Search fields by name, slug, type, description, id"
                    className="popup-search"
                  />
                </div>

                <div className="card-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Field name</th>
                        <th>Field settings</th>
                        <th>Slug</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFields.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="csEmptyRow">No fields found.</div>
                          </td>
                        </tr>
                      ) : (
                        filteredFields.map((f, idx, arr) => (
                          <tr key={f.id}>
                            <td>
                              <div className="csFieldNameRow">
                                <div className="csFieldName">{f.name}</div>
                                {f.required ? (
                                  <span className="csBadge">Required</span>
                                ) : null}
                              </div>
                              {f.description ? (
                                <div className="csFieldHint">
                                  {f.description}
                                </div>
                              ) : null}
                            </td>

                            <td>
                              <div className="csFieldType">
                                <span className="csTypeIcon">
                                  {getFieldIcon(f.type)}
                                </span>
                                <span className="csTypeLabel">
                                  {typeMap[f.type] || f.type}
                                </span>
                                {isSelectionType(f.type) &&
                                (f.options || []).length ? (
                                  <span className="csTypeNote">
                                    {(f.options || []).length} options
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            <td>
                              <div className="csSlugMono">{f.slug}</div>
                            </td>

                            <td>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => moveField(f.id, "up")}
                                  disabled={idx === 0 || saving}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveField(f.id, "down")}
                                  disabled={idx === arr.length - 1 || saving}
                                >
                                  ↓
                                </button>
                                <button
                                  onClick={() => openEditField(f)}
                                  disabled={saving}
                                  type="button"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => deleteField(f)}
                                  disabled={saving}
                                  type="button"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </Popup>

      <FieldPopup
        open={fieldPopupOpen}
        draft={fieldDraft}
        setDraft={setFieldDraft}
        saving={saving}
        onClose={closeFieldPopup}
        onSubmit={saveField}
        isEdit={!!fieldDraft?.id}
      />
    </div>
  );
}
