import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { can } from "../../auth/permission";
import "./ProductList.css";

const FILE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api/v1", "")
  : "http://127.0.0.1:8000";

const EMPTY_FORM = {
  sku: "",
  name: "",
  thumbnail: "",
  contentStructureId: "",
  price: "",
  quantity: "1",
  shortDesc: "",
  isPublish: true,
  fieldValues: {},
};

function money(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });
}

function getApiMessage(error, fallback = "Request failed") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function normalizeProduct(product) {
  return {
    id: String(product?.id ?? "").trim(),
    sku: product?.sku || "",
    name: product?.name || "",
    thumbnail: product?.thumbnail || "",
    contentStructureId: String(
      product?.contentStructureId ?? product?.content_structure_id ?? "",
    ),
    price: Number(product?.price || 0),
    quantity: Number(product?.quantity || 0),
    shortDesc: product?.shortDesc ?? product?.short_desc ?? "",
    isPublish: Boolean(product?.isPublish ?? product?.publish ?? false),
    fieldValues: product?.fieldValues || product?.field_values || {},
  };
}

function toAbsoluteImageUrl(value) {
  if (!value || typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("blob:")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) return `${FILE_BASE}${trimmed}`;
  return `${FILE_BASE}/${trimmed}`;
}

function isImageValue(value) {
  if (!value || typeof value !== "string") return false;
  const normalized = value.toLowerCase().trim();

  return (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(normalized)
  );
}

function isCloudinaryUrl(value) {
  return /^https?:\/\/res\.cloudinary\.com\//i.test(String(value || "").trim());
}

function optimizeImageUrl(value, options = {}) {
  const absoluteUrl = toAbsoluteImageUrl(value);

  if (
    !absoluteUrl ||
    !isCloudinaryUrl(absoluteUrl) ||
    !absoluteUrl.includes("/upload/")
  ) {
    return absoluteUrl;
  }

  const transforms = ["f_auto", "q_auto", "dpr_auto"];

  if (options.width) transforms.push(`w_${Math.round(options.width)}`);
  if (options.height) transforms.push(`h_${Math.round(options.height)}`);

  if (options.fit === "contain") {
    transforms.push("c_fit");
  } else if (options.width && options.height) {
    transforms.push("c_fill", "g_auto");
  }

  return absoluteUrl.replace("/upload/", `/upload/${transforms.join(",")}/`);
}

function getProductPrimaryImage(product, options = {}) {
  if (isImageValue(product?.thumbnail)) {
    return optimizeImageUrl(product.thumbnail, options);
  }

  return "";
}

function getFieldBySlug(structure, key) {
  const fields = Array.isArray(structure?.fields) ? structure.fields : [];
  return (
    fields.find((field) => String(field?.slug || "") === String(key)) || null
  );
}

function getFieldLabel(structure, key) {
  return getFieldBySlug(structure, key)?.name || key;
}

function getProductMetaLabel(product, structure) {
  const fieldValues = product?.fieldValues || {};
  const preferredKeys = [
    "color",
    "colour",
    "variant",
    "style",
    "material",
    "size",
    "model",
    "flavor",
    "flavour",
  ];

  const entries = Object.entries(fieldValues);

  for (const [key, value] of entries) {
    const field = getFieldBySlug(structure, key);
    const lookup = `${key} ${field?.name || ""}`.toLowerCase();
    const rendered = renderStaticValue(value);

    if (
      rendered &&
      preferredKeys.some((token) => lookup.includes(token)) &&
      !isImageValue(rendered)
    ) {
      return rendered;
    }
  }

  for (const [, value] of entries) {
    const rendered = renderStaticValue(value);

    if (
      rendered &&
      !isImageValue(rendered) &&
      rendered.length <= 32 &&
      rendered !== "Yes" &&
      rendered !== "No"
    ) {
      return rendered;
    }
  }

  return structure?.name || "";
}

function renderStaticValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") return "";
  return String(value);
}

function getStockText(quantity) {
  const total = Number(quantity || 0);
  if (total <= 0) return "Out of stock";
  if (total === 1) return "1 stock";
  return `${total} stocks`;
}

async function uploadDynamicFieldImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await axiosClient.post(
    "/content-fields/upload-image",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data?.url || "";
}

async function uploadProductMedia(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await axiosClient.post("/product-media", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data?.data || null;
}

async function resolveFieldValuesForSubmit(fieldValues, structureFields) {
  const result = {};

  for (const field of structureFields) {
    const slug = field.slug;
    const rawValue = fieldValues?.[slug];
    const type = String(field.type || "").toLowerCase();

    if (type === "image") {
      if (rawValue?.file instanceof File) {
        result[slug] = await uploadDynamicFieldImage(rawValue.file);
      } else if (typeof rawValue === "string") {
        result[slug] = rawValue;
      } else {
        result[slug] = "";
      }
      continue;
    }

    result[slug] = rawValue;
  }

  return result;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="prdIcon">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M20 20L16.65 16.65"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="prdIcon">
      <path
        d="M21 12A9 9 0 1 1 18.36 5.64"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3V9H15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="prdIcon">
      <path
        d="M12 21A2.5 2.5 0 0 0 14.45 19H9.55A2.5 2.5 0 0 0 12 21Z"
        fill="currentColor"
      />
      <path
        d="M19 16V11A7 7 0 1 0 5 11V16L3 18V19H21V18L19 16Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="prdIcon">
      <path
        d="M12 5V19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="prdIcon">
      <path
        d="M3 6H21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 6V4A1 1 0 0 1 9 3H15A1 1 0 0 1 16 4V6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M19 6L18 20A1 1 0 0 1 17 21H7A1 1 0 0 1 6 20L5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 11V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 11V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="prdIcon">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="M21 16L16 11L7 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="prdIcon">
      <path
        d="M12 16V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 9L12 5L16 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 19H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="prdIcon">
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="prdIcon">
      <path
        d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12L20 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 12L4 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 12V21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Popup({ open, title, onClose, children, footer, size = "md" }) {
  if (!open) return null;

  const sizeClass =
    {
      sm: "popup-sm",
      md: "popup-md",
      lg: "popup-lg",
      xl: "popup-xl",
    }[size] || "popup-md";

  const popup = (
    <div className="card-popup" onClick={onClose}>
      <div className={sizeClass} onClick={(event) => event.stopPropagation()}>
        <div className="popup-header">
          <h3 className="popup-title">{title}</h3>
          <button
            type="button"
            className="popup-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="popup-body">{children}</div>

        {footer ? <div className="popup-footer">{footer}</div> : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return popup;
  }

  return createPortal(popup, document.body);
}

function DynamicField({ field, value, onChange }) {
  const type = String(field.type || "text").toLowerCase();

  if (type === "number") {
    return (
      <input
        className="popup-input"
        type="number"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (
    type === "multi_line" ||
    type === "textarea" ||
    type === "wysiwyg" ||
    type === "html"
  ) {
    return (
      <textarea
        className="popup-textarea"
        rows={4}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (type === "date") {
    return (
      <input
        className="popup-input"
        type="date"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (type === "radio") {
    const options = Array.isArray(field.options) ? field.options : [];

    return (
      <div className="prdChoiceGrid">
        {options.map((option, index) => {
          const optionValue =
            typeof option === "string"
              ? option
              : (option?.value ?? option?.label ?? "");
          const optionLabel =
            typeof option === "string"
              ? option
              : (option?.label ?? option?.value ?? "");

          return (
            <button
              key={`${field.slug}-${index}`}
              type="button"
              className={`prdChoiceCard ${
                String(value ?? "") === String(optionValue) ? "is-active" : ""
              }`}
              onClick={() => onChange(optionValue)}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "checkbox") {
    const options = Array.isArray(field.options) ? field.options : [];

    if (options.length > 0) {
      const current = Array.isArray(value) ? value : [];

      return (
        <div className="prdChoiceGrid">
          {options.map((option, index) => {
            const optionValue =
              typeof option === "string"
                ? option
                : (option?.value ?? option?.label ?? "");
            const optionLabel =
              typeof option === "string"
                ? option
                : (option?.label ?? option?.value ?? "");
            const active = current.includes(optionValue);

            return (
              <button
                key={`${field.slug}-${index}`}
                type="button"
                className={`prdChoiceCard ${active ? "is-active" : ""}`}
                onClick={() => {
                  if (active) {
                    onChange(current.filter((item) => item !== optionValue));
                  } else {
                    onChange([...current, optionValue]);
                  }
                }}
              >
                {optionLabel}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <label className="prdInlineCheck">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{field.hint || field.name}</span>
      </label>
    );
  }

  if (type === "image") {
    const previewSrc =
      value?.preview ||
      (typeof value === "string" && isImageValue(value)
        ? toAbsoluteImageUrl(value)
        : "");

    return (
      <div className="prdDynamicImage">
        <input
          className="popup-input"
          type="file"
          accept="image/*"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
        {previewSrc ? (
          <div className="prdDynamicImagePreview">
            <img src={previewSrc} alt={field.name || "Preview"} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <input
      className="popup-input"
      type="text"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ProductEditor({
  form,
  setForm,
  structures,
  structureFields,
  onOpenMedia,
}) {
  function setField(key, value) {
    setForm((previous) => {
      const next = { ...previous, [key]: value };

      if (key === "quantity" && Number(value || 0) <= 0) {
        next.isPublish = false;
      }

      if (key === "contentStructureId") {
        next.fieldValues = {};
      }

      return next;
    });
  }

  function setDynamicField(slug, value) {
    if (value instanceof File) {
      const preview = URL.createObjectURL(value);

      setForm((previous) => {
        const oldValue = previous.fieldValues?.[slug];
        if (oldValue?.preview?.startsWith?.("blob:")) {
          URL.revokeObjectURL(oldValue.preview);
        }

        return {
          ...previous,
          fieldValues: {
            ...previous.fieldValues,
            [slug]: { file: value, preview },
          },
        };
      });
      return;
    }

    setForm((previous) => ({
      ...previous,
      fieldValues: {
        ...previous.fieldValues,
        [slug]: value,
      },
    }));
  }

  const thumbnailPreview = isImageValue(form.thumbnail)
    ? optimizeImageUrl(form.thumbnail, { width: 140, height: 140 })
    : "";
  const quantityLocked = Number(form.quantity || 0) <= 0;
  return (
    <div className="prdEditor">
      <div className="prdField">
        <span className="prdLabel">Media</span>
        <button type="button" className="prdMediaTrigger" onClick={onOpenMedia}>
          <div className="prdMediaTriggerThumb">
            {thumbnailPreview ? (
              <img src={thumbnailPreview} alt="Selected media" />
            ) : (
              <ImageIcon />
            )}
          </div>
          <div className="prdMediaTriggerText">
            <strong>{thumbnailPreview ? "Change Media" : "Add Media"}</strong>
          </div>
          <ChevronRightIcon />
        </button>
      </div>

      <div className="prdField">
        <label className="prdLabel popup-label">Product Title</label>
        <input
          className="popup-input"
          value={form.name}
          placeholder="Enter product title"
          onChange={(event) => setField("name", event.target.value)}
        />
      </div>

      <div className="prdField">
        <label className="prdLabel popup-label">Status</label>
        <div className="prdStatusSwitch">
          <button
            type="button"
            className={`prdStatusOption ${form.isPublish ? "is-active" : ""}`}
            disabled={quantityLocked}
            onClick={() => setField("isPublish", true)}
          >
            Active
          </button>
          <button
            type="button"
            className={`prdStatusOption ${!form.isPublish ? "is-active" : ""}`}
            onClick={() => setField("isPublish", false)}
          >
            Inactive
          </button>
        </div>
        {quantityLocked ? (
          <p className="prdHint popup-note">
            Quantity must be above 0 to enable Active.
          </p>
        ) : null}
      </div>

      <div className="prdField">
        <label className="prdLabel popup-label">Descriptions</label>
        <textarea
          className="popup-textarea"
          rows={4}
          value={form.shortDesc}
          placeholder="Product description"
          onChange={(event) => setField("shortDesc", event.target.value)}
        />
      </div>

      <div className="prdEditorGrid">
        <div className="prdField">
          <label className="prdLabel popup-label">Category</label>
          <select
            className="popup-select"
            value={form.contentStructureId}
            onChange={(event) =>
              setField("contentStructureId", event.target.value)
            }
          >
            <option value="">Select category</option>
            {structures.map((structure) => (
              <option key={structure.id} value={structure.id}>
                {structure.name}
              </option>
            ))}
          </select>
        </div>

        <div className="prdField">
          <label className="prdLabel popup-label">Price</label>
          <input
            className="popup-input"
            type="number"
            min="0"
            value={form.price}
            placeholder="0"
            onChange={(event) => setField("price", event.target.value)}
          />
        </div>

        <div className="prdField">
          <label className="prdLabel popup-label">Quantity</label>
          <input
            className="popup-input"
            type="number"
            min="0"
            value={form.quantity}
            placeholder="0"
            onChange={(event) => setField("quantity", event.target.value)}
          />
        </div>

        <div className="prdField">
          <label className="prdLabel popup-label">SKU</label>
          <input
            className="popup-input"
            value={form.sku}
            placeholder="SKU code"
            onChange={(event) => setField("sku", event.target.value)}
          />
        </div>
      </div>

      {structureFields.length > 0 ? (
        <div className="prdField prdFieldBlock">
          <div className="prdSectionHead">
            <div>
              <strong>Additional Fields</strong>
              <span>
                These fields come from the selected content structure.
              </span>
            </div>
          </div>
          <div className="prdExtraFields">
            {structureFields.map((field) => (
              <div
                key={field.id}
                className={`prdField ${
                  field.type === "multi_line" ||
                  field.type === "textarea" ||
                  field.type === "image" ||
                  field.type === "wysiwyg" ||
                  field.type === "html"
                    ? "prdFieldFull"
                    : ""
                }`}
              >
                <label className="prdLabel popup-label">
                  {field.name}
                  {field.required ? " *" : ""}
                </label>
                <DynamicField
                  field={field}
                  value={form.fieldValues?.[field.slug]}
                  onChange={(value) => setDynamicField(field.slug, value)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MediaPickerModal({ open, selectedUrl, canUpload, onClose, onApply }) {
  const [tab, setTab] = useState("library");
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState("");

  useEffect(() => {
    if (!open) return;

    setSelected(selectedUrl || "");
    setTab("library");
    setError("");
    void fetchLibrary(true);
  }, [open, selectedUrl]);

  useEffect(() => {
    return () => {
      if (uploadPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(uploadPreview);
      }
    };
  }, [uploadPreview]);

  async function fetchLibrary(reset = false) {
    try {
      setLoading(true);
      setError("");

      const response = await axiosClient.get("/product-media", {
        params: {
          limit: 18,
          next_cursor: reset ? undefined : nextCursor || undefined,
        },
      });

      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      const cursor = response.data?.next_cursor || null;

      setItems((previous) => {
        if (reset) return data;

        const merged = [...previous];
        data.forEach((item) => {
          if (!merged.some((entry) => entry.id === item.id)) {
            merged.push(item);
          }
        });
        return merged;
      });
      setNextCursor(cursor);
    } catch (requestError) {
      setError(
        getApiMessage(requestError, "Unable to load Cloudinary library"),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(file) {
    if (uploadPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(uploadPreview);
    }

    if (!file) {
      setUploadFile(null);
      setUploadPreview("");
      return;
    }

    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  }

  async function handlePrimaryAction() {
    if (tab === "upload") {
      if (!uploadFile) {
        setError("Please select an image to upload.");
        return;
      }

      try {
        setSaving(true);
        setError("");

        const uploaded = await uploadProductMedia(uploadFile);
        if (!uploaded?.url) {
          throw new Error("Upload did not return an image URL.");
        }

        setItems((previous) => [
          uploaded,
          ...previous.filter((item) => item.id !== uploaded.id),
        ]);
        setSelected(uploaded.url);
        setTab("library");
        handleFileChange(null);
      } catch (requestError) {
        setError(getApiMessage(requestError, "Upload failed"));
      } finally {
        setSaving(false);
      }

      return;
    }

    onApply(selected);
    onClose();
  }

  const footer = (
    <>
      <button
        type="button"
        className="btn-secondary"
        onClick={onClose}
        disabled={saving}
      >
        Cancel
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={handlePrimaryAction}
        disabled={saving || (tab === "upload" ? !uploadFile : !selected)}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </>
  );

  return (
    <Popup
      open={open}
      title="Add Media"
      onClose={onClose}
      size="lg"
      footer={footer}
    >
      <div className="prdMediaTabs">
        <button
          type="button"
          className={`prdMediaTab ${tab === "library" ? "is-active" : ""}`}
          onClick={() => setTab("library")}
        >
          Content Library
        </button>
        {canUpload ? (
          <button
            type="button"
            className={`prdMediaTab ${tab === "upload" ? "is-active" : ""}`}
            onClick={() => setTab("upload")}
          >
            Upload New
          </button>
        ) : null}
      </div>

      {error ? <div className="prdInlineAlert">{error}</div> : null}

      {tab === "library" ? (
        <>
          <div className="prdMediaMeta">
            <span>Selected {selected ? 1 : 0}</span>
            <button
              type="button"
              className="prdTextButton"
              onClick={() => setSelected("")}
              disabled={!selected}
            >
              Unselect all
            </button>
          </div>

          {loading && items.length === 0 ? (
            <div className="prdMediaLoading">Loading media...</div>
          ) : items.length === 0 ? (
            <div className="prdMediaEmpty">
              <ImageIcon />
              <p>No images in Cloudinary yet.</p>
            </div>
          ) : (
            <div className="prdMediaGrid">
              {items.map((item) => {
                const image = optimizeImageUrl(item.url, {
                  width: 180,
                  height: 180,
                });
                const active = selected === item.url;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`prdMediaCard ${active ? "is-selected" : ""}`}
                    onClick={() => setSelected(item.url)}
                  >
                    <img src={image} alt={item.public_id || "Media"} />
                    <span className="prdMediaCheck">{active ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
          )}

          {nextCursor ? (
            <button
              type="button"
              className="prdLoadMore"
              onClick={() => fetchLibrary(false)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          ) : null}
        </>
      ) : (
        <div className="prdUploadBox">
          <label className="prdUploadDrop">
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                handleFileChange(event.target.files?.[0] || null)
              }
            />
            <div className="prdUploadDropInner">
              <UploadIcon />
              <strong>Upload a new image</strong>
              <span>Choose an image file and save it to Cloudinary.</span>
            </div>
          </label>

          {uploadPreview ? (
            <div className="prdUploadPreview">
              <img src={uploadPreview} alt="Upload preview" />
            </div>
          ) : null}
        </div>
      )}
    </Popup>
  );
}

export default function ProductListView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [mobileUser, setMobileUser] = useState(null);
  const [mobileUnreadCount, setMobileUnreadCount] = useState(0);

  const [products, setProducts] = useState([]);
  const [contentStructures, setContentStructures] = useState([]);

  const [query, setQuery] = useState("");
  const [publishFilter, setPublishFilter] = useState("all");
  const [activeContentStructureId, setActiveContentStructureId] =
    useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [editorForm, setEditorForm] = useState(EMPTY_FORM);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const canViewProduct = can("product.view");
  const canCreateProduct = can("product.create");
  const canUpdateProduct = can("product.update");
  const canDeleteProduct = can("product.delete");
  const canManageMedia = canCreateProduct || canUpdateProduct;

  const contentStructureMap = useMemo(() => {
    const map = new Map();
    contentStructures.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [contentStructures]);

  const editorStructureFields = useMemo(() => {
    return (
      contentStructureMap.get(String(editorForm.contentStructureId))?.fields ||
      []
    );
  }, [contentStructureMap, editorForm.contentStructureId]);

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMobileChrome() {
      try {
        const [meResponse, unreadResponse] = await Promise.all([
          axiosClient.get("/me").catch(() => null),
          axiosClient.get("/notifications/unread-count").catch(() => null),
        ]);

        if (!active) return;

        setMobileUser(meResponse?.data || null);
        setMobileUnreadCount(Number(unreadResponse?.data?.count || 0));
      } catch {
        if (!active) return;
        setMobileUser(null);
        setMobileUnreadCount(0);
      }
    }

    void loadMobileChrome();

    return () => {
      active = false;
    };
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [productResponse, structureResponse] = await Promise.all([
        axiosClient.get("/products"),
        axiosClient.get("/content-structures"),
      ]);

      const productList = Array.isArray(productResponse.data)
        ? productResponse.data
        : productResponse.data?.data || [];

      const structureList = Array.isArray(structureResponse.data)
        ? structureResponse.data
        : structureResponse.data?.data || [];

      setProducts(productList.map(normalizeProduct));
      setContentStructures(
        structureList.map((structure) => ({
          id: String(structure.id),
          name: structure.name || "",
          slug: structure.slug || "",
          fields: Array.isArray(structure.fields) ? structure.fields : [],
        })),
      );
    } catch (requestError) {
      setError(getApiMessage(requestError, "Unable to load products"));
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const structure = contentStructureMap.get(
        String(product.contentStructureId),
      );
      const structureOk =
        activeContentStructureId === "all" ||
        product.contentStructureId === activeContentStructureId;
      const publishOk =
        publishFilter === "all" ||
        (publishFilter === "published"
          ? product.isPublish
          : !product.isPublish);

      const haystack = `${product.name} ${product.sku} ${product.shortDesc} ${
        structure?.name || ""
      }`.toLowerCase();

      return (
        structureOk &&
        publishOk &&
        (!normalizedQuery || haystack.includes(normalizedQuery))
      );
    });
  }, [
    activeContentStructureId,
    contentStructureMap,
    products,
    publishFilter,
    query,
  ]);

  function openCreateEditor() {
    setEditorMode("create");
    setSelectedProduct(null);
    setEditorForm({ ...EMPTY_FORM });
    setEditorOpen(true);
  }

  function openEditEditor(product) {
    setEditorMode("edit");
    setSelectedProduct(product);
    setEditorForm({
      sku: product.sku || "",
      name: product.name || "",
      thumbnail: product.thumbnail || "",
      contentStructureId: product.contentStructureId || "",
      price: String(product.price ?? ""),
      quantity: String(product.quantity ?? 0),
      shortDesc: product.shortDesc || "",
      isPublish: Boolean(product.isPublish),
      fieldValues: product.fieldValues || {},
    });
    setEditorOpen(true);
  }

  function openDetail(product) {
    setSelectedProduct(product);
    setDetailOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedProduct(null);
  }

  async function submitEditor() {
    try {
      setWorking(true);
      setError("");

      const quantity = Number(editorForm.quantity || 0);
      const price = Number(editorForm.price || 0);

      if (!editorForm.name.trim() || !editorForm.sku.trim()) {
        setError("Product title and SKU are required.");
        return;
      }

      const payload = {
        sku: editorForm.sku.trim(),
        name: editorForm.name.trim(),
        thumbnail:
          typeof editorForm.thumbnail === "string" ? editorForm.thumbnail : "",
        content_structure_id: editorForm.contentStructureId
          ? Number(editorForm.contentStructureId)
          : null,
        price,
        quantity,
        short_desc: editorForm.shortDesc.trim() || null,
        publish: quantity > 0 ? Boolean(editorForm.isPublish) : false,
        field_values: await resolveFieldValuesForSubmit(
          editorForm.fieldValues,
          editorStructureFields,
        ),
      };

      if (editorMode === "edit") {
        if (!selectedProduct?.id) {
          setError("Invalid product id");
          return;
        }
        await axiosClient.patch(`/products/${selectedProduct.id}`, payload);
      } else {
        await axiosClient.post("/products", payload);
      }

      setEditorOpen(false);
      setMediaOpen(false);
      await loadAll();
    } catch (requestError) {
      setError(
        getApiMessage(
          requestError,
          editorMode === "edit"
            ? "Unable to update product"
            : "Unable to create product",
        ),
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete(product) {
    if (!product?.id) {
      setError("Invalid product id");
      return;
    }

    if (!window.confirm(`Delete product "${product.name}"?`)) {
      return;
    }

    try {
      setWorking(true);
      setError("");
      await axiosClient.delete(`/products/${product.id}`);
      await loadAll();
    } catch (requestError) {
      setError(getApiMessage(requestError, "Unable to delete product"));
    } finally {
      setWorking(false);
    }
  }

  const structureOptions = [
    { id: "all", name: "Category" },
    ...contentStructures.map((structure) => ({
      id: structure.id,
      name: structure.name,
    })),
  ];

  const hasFilters =
    Boolean(query.trim()) ||
    publishFilter !== "all" ||
    activeContentStructureId !== "all";

  const editorTitle = editorMode === "edit" ? "Edit Product" : "Create Product";
  const editorActionText =
    editorMode === "edit" ? "Save Product" : "Add Product";
  const totalLabel = loading
    ? "Loading products..."
    : `${filteredProducts.length}${
        products.length !== filteredProducts.length
          ? ` / ${products.length}`
          : ""
      } products`;
  const editorFooter = (
    <>
      <button
        type="button"
        className="btn-secondary"
        onClick={closeEditor}
        disabled={working}
      >
        Cancel
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={submitEditor}
        disabled={working}
      >
        {working ? "Saving..." : editorActionText}
      </button>
    </>
  );

  return (
    <div className="prdPage">
      <div className="prdToolbar">
        <label className="prdSearch">
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
          />
        </label>

        <button
          type="button"
          className="prdIconButton"
          onClick={() => loadAll()}
          disabled={loading || working}
          title="Refresh"
        >
          <RefreshIcon />
        </button>

        {canCreateProduct ? (
          <button
            type="button"
            className="btn_add"
            onClick={openCreateEditor}
            title="Create Product"
          >
            <PlusIcon />
          </button>
        ) : null}
      </div>

      <div className="prdFilters">
        <select
          className="prdFilterSelect"
          value={publishFilter}
          onChange={(event) => setPublishFilter(event.target.value)}
        >
          <option value="all">Status</option>
          <option value="published">Active</option>
          <option value="hidden">Inactive</option>
        </select>

        <select
          className="prdFilterSelect"
          value={activeContentStructureId}
          onChange={(event) => setActiveContentStructureId(event.target.value)}
        >
          {structureOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className="prdMetaBar">
        <span>{totalLabel}</span>
        {hasFilters ? (
          <button
            type="button"
            className="prdTextButton"
            onClick={() => {
              setQuery("");
              setPublishFilter("all");
              setActiveContentStructureId("all");
            }}
          >
            Reset
          </button>
        ) : null}
      </div>

      {error ? <div className="prdPageAlert">{error}</div> : null}

      {loading ? (
        <div className="prdList">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="prdSkeletonCard" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="prdEmpty">
          <div className="prdEmptyIcon">
            <ProductIcon />
          </div>
          <h3>No products found</h3>
          <p>Try another search or filter.</p>
        </div>
      ) : (
        <div className="prdList">
          {filteredProducts.map((product) => {
            const structure = contentStructureMap.get(
              String(product.contentStructureId),
            );
            const image = getProductPrimaryImage(product, {
              width: 180,
              height: 180,
            });
            const metaLabel = getProductMetaLabel(product, structure);

            return (
              <article key={product.id} className="prdCard">
                <button
                  type="button"
                  className="prdCardButton"
                  onClick={() => {
                    if (canUpdateProduct) {
                      openEditEditor(product);
                    } else if (canViewProduct) {
                      openDetail(product);
                    }
                  }}
                >
                  <div className="prdCardThumb">
                    {image ? (
                      <img src={image} alt={product.name} loading="lazy" />
                    ) : (
                      <ProductIcon />
                    )}
                  </div>
                  <div className="prdCardBody">
                    <div className="prdCardTags">
                      <span
                        className={`prdStatusPill ${
                          product.isPublish ? "is-active" : "is-hidden"
                        }`}
                      >
                        {product.isPublish ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <h3>{product.name}</h3>
                    <div className="prdCardMeta">
                      <strong>{money(product.price)}</strong>
                      {metaLabel ? <span>{metaLabel}</span> : null}
                      <span>{getStockText(product.quantity)}</span>
                    </div>
                  </div>
                  <div className="prdCardArrow">
                    <ChevronRightIcon />
                  </div>
                </button>
                {canDeleteProduct ? (
                  <button
                    type="button"
                    className="prdDeleteButton"
                    onClick={() => handleDelete(product)}
                    disabled={working}
                    title="Delete product"
                  >
                    <TrashIcon />
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <Popup
        open={editorOpen}
        title={editorTitle}
        onClose={closeEditor}
        size="md"
        footer={editorFooter}
      >
        <ProductEditor
          form={editorForm}
          setForm={setEditorForm}
          structures={contentStructures}
          structureFields={editorStructureFields}
          onOpenMedia={() => setMediaOpen(true)}
        />
      </Popup>

      <MediaPickerModal
        open={mediaOpen}
        selectedUrl={editorForm.thumbnail}
        canUpload={canManageMedia}
        onClose={() => setMediaOpen(false)}
        onApply={(url) =>
          setEditorForm((previous) => ({
            ...previous,
            thumbnail: url || "",
          }))
        }
      />

      <Popup
        open={detailOpen}
        title="Product Detail"
        onClose={closeDetail}
        size="md"
        footer={
          <button type="button" className="btn-primary" onClick={closeDetail}>
            Close
          </button>
        }
      >
        {selectedProduct
          ? (() => {
              const structure = contentStructureMap.get(
                String(selectedProduct.contentStructureId),
              );
              const image = getProductPrimaryImage(selectedProduct, {
                width: 720,
                height: 720,
                fit: "contain",
              });
              const dynamicEntries = Object.entries(
                selectedProduct.fieldValues || {},
              ).filter(
                ([, value]) =>
                  value !== "" && value !== null && value !== undefined,
              );

              return (
                <div className="prdDetail">
                  {image ? (
                    <div className="prdDetailImage">
                      <img src={image} alt={selectedProduct.name} />
                    </div>
                  ) : null}

                  <div className="prdDetailGrid">
                    <div>
                      <strong>SKU</strong>
                      <span>{selectedProduct.sku || "-"}</span>
                    </div>
                    <div>
                      <strong>Name</strong>
                      <span>{selectedProduct.name}</span>
                    </div>
                    <div>
                      <strong>Category</strong>
                      <span>{structure?.name || "-"}</span>
                    </div>
                    <div>
                      <strong>Price</strong>
                      <span>{money(selectedProduct.price)}</span>
                    </div>
                    <div>
                      <strong>Quantity</strong>
                      <span>{selectedProduct.quantity}</span>
                    </div>
                    <div>
                      <strong>Status</strong>
                      <span>
                        {selectedProduct.isPublish ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {selectedProduct.shortDesc ? (
                    <div className="prdDetailBlock">
                      <strong>Description</strong>
                      <p>{selectedProduct.shortDesc}</p>
                    </div>
                  ) : null}

                  {dynamicEntries.length > 0 ? (
                    <div className="prdDetailBlock">
                      <strong>Additional Fields</strong>
                      <div className="prdDetailFields">
                        {dynamicEntries.map(([key, value]) => (
                          <div key={key} className="prdDetailFieldRow">
                            <span>{getFieldLabel(structure, key)}</span>
                            <strong>{renderStaticValue(value)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()
          : null}
      </Popup>
    </div>
  );
}
