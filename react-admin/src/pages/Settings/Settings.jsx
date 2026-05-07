import { useEffect, useRef, useState } from "react";
import { useMsg } from "../../components/MsgContext/MsgContext";
import { useAppSettings } from "../../context/AppSettingsContext";

const HEX_PATTERN = /^#([A-F0-9]{6})$/i;
const H_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

const RADIUS_OPTIONS = [
  { value: "sm", label: "Nhẹ" },
  { value: "md", label: "Tiêu chuẩn" },
  { value: "lg", label: "Mềm hơn" },
];

const SIDEBAR_PRESETS = [
  { key: "dark", label: "Than chì" },
  { key: "green", label: "Xanh rêu" },
  { key: "blue", label: "Xanh biển" },
  { key: "purple", label: "Tím trầm" },
  { key: "custom", label: "HEX riêng" },
];

function normalizeHexInput(value) {
  const cleaned = String(value ?? "")
    .toUpperCase()
    .replace(/[^#A-F0-9]/g, "");
  const withoutHash = cleaned.replace(/#/g, "");

  return `#${withoutHash}`.slice(0, 7);
}

function isValidHex(value) {
  return HEX_PATTERN.test(value);
}

function buildHexDrafts(settings) {
  return {
    accentColor: settings.accentColor,
    sidebarActiveColor: settings.sidebarActiveColor,
    sidebarCustomColor: settings.sidebarCustomColor,
  };
}

function HexField({
  label,
  value,
  inputValue,
  onChange,
  onPickerChange,
  onBlur,
  disabled = false,
}) {
  return (
    <label className={`settings-hex-field${disabled ? " is-disabled" : ""}`}>
      <span className="settings-hex-label">{label}</span>
      <span className="settings-hex-control">
        <span className="settings-hex-picker-wrap">
          <input
            type="color"
            className="settings-hex-picker"
            value={value}
            onChange={onPickerChange}
            disabled={disabled}
            aria-label={`${label} color picker`}
          />
        </span>
        <input
          type="text"
          className="form-input settings-hex-input"
          value={inputValue}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="#16A34A"
          spellCheck={false}
          disabled={disabled}
        />
      </span>
    </label>
  );
}

export default function Settings() {
  const { showSuccess, showDanger } = useMsg();
  const {
    settings,
    update,
    reset,
    save,
    loading,
    saving,
    dirty,
    FONT_OPTIONS,
    SIDEBAR_COLORS,
  } = useAppSettings();
  const [hexDrafts, setHexDrafts] = useState(() => buildHexDrafts(settings));
  const logoInputRef = useRef(null);

  useEffect(() => {
    setHexDrafts(buildHexDrafts(settings));
  }, [
    settings.accentColor,
    settings.sidebarActiveColor,
    settings.sidebarCustomColor,
  ]);

  const handleSave = async () => {
    const result = await save();

    if (result.success) {
      showSuccess("Đã lưu cài đặt giao diện.");
      return;
    }

    showDanger(result.message || "Không thể lưu cài đặt giao diện.");
  };

  const handleReset = () => {
    reset();
    showSuccess("Đã đưa về cấu hình mặc định. Nhấn Lưu để ghi xuống database.");
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      update({ logoUrl: loadEvent.target?.result || "" });
    };
    reader.readAsDataURL(file);
  };

  const handleFontSize = (tag, value) => {
    const number = Math.min(60, Math.max(10, Number(value)));
    update({ fontSizes: { ...settings.fontSizes, [tag]: number } });
  };

  const applyHexValue = (field, value) => {
    const nextValue = normalizeHexInput(value);

    setHexDrafts((previous) => ({ ...previous, [field]: nextValue }));

    if (isValidHex(nextValue)) {
      update({ [field]: nextValue });
    }
  };

  const handleHexChange = (field) => (event) => {
    applyHexValue(field, event.target.value);
  };

  const handleHexPicker = (field) => (event) => {
    applyHexValue(field, event.target.value);
  };

  const handleHexBlur = (field, fallback) => () => {
    setHexDrafts((previous) => {
      const value = previous[field];

      return {
        ...previous,
        [field]: isValidHex(value) ? value : fallback,
      };
    });
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="card">
          <div className="card-body">
            <p className="settings-empty">Đang tải cài đặt giao diện...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Cài đặt giao diện</h1>
          <p className="settings-subtitle">
            Toàn bộ tùy chỉnh ở đây được lưu vào database. Màu sắc dùng mã HEX
            và vẫn có thể bấm trực tiếp để mở bảng chọn màu.
          </p>
        </div>

        <div className="settings-header-actions">
          <button className="btn btn-ghost" onClick={handleReset} disabled={saving}>
            Đặt lại mặc định
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "Đang lưu..." : dirty ? "Lưu thay đổi" : "Đã đồng bộ"}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="card">
          <div className="card-header">
            <h3>Giao diện</h3>
          </div>
          <div className="card-body">
            <div className="settings-field">
              <label className="settings-label">Chế độ màu</label>
              <div className="settings-toggle-group">
                {[
                  { value: "light", label: "Sáng" },
                  { value: "dark", label: "Tối" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`settings-toggle ${settings.theme === option.value ? "is-active" : ""}`}
                    onClick={() => update({ theme: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-label">Bo góc hệ thống</label>
              <div className="settings-toggle-group">
                {RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`settings-toggle ${settings.borderRadius === option.value ? "is-active" : ""}`}
                    onClick={() => update({ borderRadius: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-label">Màu nhấn</label>
              <HexField
                label="Accent HEX"
                value={settings.accentColor}
                inputValue={hexDrafts.accentColor}
                onChange={handleHexChange("accentColor")}
                onPickerChange={handleHexPicker("accentColor")}
                onBlur={handleHexBlur("accentColor", settings.accentColor)}
              />
              <p className="settings-hint">
                Nhập mã HEX hoặc bấm ô màu để chọn nhanh.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Sidebar</h3>
          </div>
          <div className="card-body">
            <div className="settings-field">
              <label className="settings-label">Preset màu</label>
              <div className="settings-sidebar-presets">
                {SIDEBAR_PRESETS.map((preset) => {
                  const previewColor = preset.key === "custom"
                    ? settings.sidebarCustomColor
                    : SIDEBAR_COLORS[preset.key];

                  return (
                    <button
                      key={preset.key}
                      type="button"
                      className={`settings-sidebar-preset ${settings.sidebarColor === preset.key ? "is-active" : ""}`}
                      onClick={() => update({ sidebarColor: preset.key })}
                    >
                      <span
                        className="settings-sidebar-swatch"
                        style={{ background: previewColor }}
                      />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-label">Màu sidebar</label>
              <HexField
                label="Sidebar HEX"
                value={settings.sidebarCustomColor}
                inputValue={hexDrafts.sidebarCustomColor}
                onChange={handleHexChange("sidebarCustomColor")}
                onPickerChange={handleHexPicker("sidebarCustomColor")}
                onBlur={handleHexBlur("sidebarCustomColor", settings.sidebarCustomColor)}
                disabled={settings.sidebarColor !== "custom"}
              />
              <p className="settings-hint">
                Chọn preset <strong>HEX riêng</strong> nếu bạn muốn dùng một màu tùy chỉnh cho sidebar.
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label">Màu active menu</label>
              <HexField
                label="Active HEX"
                value={settings.sidebarActiveColor}
                inputValue={hexDrafts.sidebarActiveColor}
                onChange={handleHexChange("sidebarActiveColor")}
                onPickerChange={handleHexPicker("sidebarActiveColor")}
                onBlur={handleHexBlur("sidebarActiveColor", settings.sidebarActiveColor)}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Thương hiệu</h3>
          </div>
          <div className="card-body">
            <div className="settings-field">
              <label className="settings-label">Logo sidebar</label>
              <div className="settings-logo-row">
                <div className="settings-logo-preview">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" />
                  ) : (
                    <span>{settings.logoText || "A"}</span>
                  )}
                </div>
                <div className="settings-logo-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => logoInputRef.current?.click()}>
                    Tải ảnh lên
                  </button>
                  {settings.logoUrl && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ logoUrl: "" })}>
                      Xóa ảnh
                    </button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
              <p className="settings-hint">
                Ảnh hoặc chữ logo sẽ được lưu cùng bộ cài đặt giao diện trong database.
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label">Ký tự logo</label>
              <input
                className="form-input"
                value={settings.logoText}
                maxLength={3}
                onChange={(event) => update({ logoText: event.target.value.toUpperCase() })}
                placeholder="A"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Tên thương hiệu</label>
              <input
                className="form-input"
                value={settings.brandName}
                onChange={(event) => update({ brandName: event.target.value })}
                placeholder="APOS PANEL"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Typography</h3>
          </div>
          <div className="card-body">
            <div className="settings-field">
              <label className="settings-label">Font chữ</label>
              <select
                className="form-select"
                value={settings.fontFamily}
                onChange={(event) => update({ fontFamily: event.target.value })}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
              <p
                className="settings-hint settings-font-preview"
                style={{
                  fontFamily: settings.fontFamily === "system-ui"
                    ? "system-ui"
                    : `"${settings.fontFamily}", sans-serif`,
                }}
              >
                Xin chào, Apple-inspired admin interface.
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label">Cỡ chữ tiêu đề</label>
              <div className="settings-font-sizes">
                {H_TAGS.map((tag) => (
                  <div key={tag} className="settings-font-size-row">
                    <span className="settings-font-size-tag">{tag.toUpperCase()}</span>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      value={settings.fontSizes[tag]}
                      onChange={(event) => handleFontSize(tag, event.target.value)}
                      className="settings-range"
                    />
                    <span className="settings-font-size-val">{settings.fontSizes[tag]}px</span>
                    <span
                      className="settings-font-size-preview"
                      style={{
                        fontSize: `${settings.fontSizes[tag]}px`,
                        fontFamily: settings.fontFamily === "system-ui"
                          ? "system-ui"
                          : `"${settings.fontFamily}", sans-serif`,
                      }}
                    >
                      Aa
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
