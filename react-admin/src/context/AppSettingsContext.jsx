import { createContext, useContext, useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { getToken } from "../auth/storage";

const HEX_PATTERN = /^#([A-F0-9]{6})$/i;
const HEADING_KEYS = ["h1", "h2", "h3", "h4", "h5", "h6"];
const BORDER_RADIUS_SCALE = {
  sm: { xs: "2px", sm: "4px", md: "8px", lg: "12px", xl: "16px", "2xl": "20px" },
  md: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "20px", "2xl": "24px" },
  lg: { xs: "6px", sm: "12px", md: "16px", lg: "20px", xl: "24px", "2xl": "32px" },
};

const DEFAULTS = {
  theme: "light",
  logoUrl: "",
  logoText: "A",
  brandName: "APOS PANEL",
  fontFamily: "Inter",
  fontSizes: { h1: 34, h2: 28, h3: 24, h4: 20, h5: 17, h6: 15 },
  sidebarColor: "dark",
  sidebarCustomColor: "#1C1C1E",
  sidebarActiveColor: "#16A34A",
  accentColor: "#16A34A",
  borderRadius: "md",
};

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Quicksand", label: "Quicksand" },
  { value: "Outfit", label: "Outfit" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "system-ui", label: "System UI" },
];

const FONT_STACKS = {
  Inter: '"Inter", sans-serif',
  Quicksand: '"Quicksand", sans-serif',
  Outfit: '"Outfit", sans-serif',
  Montserrat: '"Montserrat", sans-serif',
  "system-ui": 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const SIDEBAR_COLORS = {
  dark: "#1C1C1E",
  green: "#052E16",
  blue: "#0C1A2E",
  purple: "#1A0533",
};

const AppSettingsContext = createContext(null);

function normalizeHex(value, fallback) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return HEX_PATTERN.test(normalized) ? normalized : fallback;
}

function clampHeadingSize(value, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(60, Math.max(10, Math.round(number)));
}

function sanitizeFontSizes(fontSizes = {}) {
  return HEADING_KEYS.reduce((accumulator, key) => {
    accumulator[key] = clampHeadingSize(fontSizes[key], DEFAULTS.fontSizes[key]);
    return accumulator;
  }, {});
}

function sanitizeSettings(input = {}) {
  const sidebarCustomColor = normalizeHex(
    input.sidebarCustomColor ?? input.sidebarCustomFrom ?? input.sidebarCustomTo,
    DEFAULTS.sidebarCustomColor,
  );

  return {
    theme: input.theme === "dark" ? "dark" : "light",
    logoUrl: String(input.logoUrl ?? "").trim(),
    logoText: String(input.logoText ?? DEFAULTS.logoText).trim().toUpperCase().slice(0, 3) || DEFAULTS.logoText,
    brandName: String(input.brandName ?? DEFAULTS.brandName).trim() || DEFAULTS.brandName,
    fontFamily: FONT_OPTIONS.some((option) => option.value === input.fontFamily)
      ? input.fontFamily
      : DEFAULTS.fontFamily,
    fontSizes: sanitizeFontSizes(input.fontSizes ?? DEFAULTS.fontSizes),
    sidebarColor: Object.prototype.hasOwnProperty.call(SIDEBAR_COLORS, input.sidebarColor) || input.sidebarColor === "custom"
      ? input.sidebarColor
      : DEFAULTS.sidebarColor,
    sidebarCustomColor,
    sidebarActiveColor: normalizeHex(input.sidebarActiveColor, DEFAULTS.sidebarActiveColor),
    accentColor: normalizeHex(input.accentColor, DEFAULTS.accentColor),
    borderRadius: ["sm", "md", "lg"].includes(input.borderRadius) ? input.borderRadius : DEFAULTS.borderRadius,
  };
}

function mergeSettings(base, patch) {
  return sanitizeSettings({
    ...base,
    ...patch,
    fontSizes: patch.fontSizes ? { ...base.fontSizes, ...patch.fontSizes } : base.fontSizes,
  });
}

function mapApiToSettings(payload = {}) {
  return sanitizeSettings({
    theme: payload.theme,
    logoUrl: payload.logo_url ?? payload.logoUrl,
    logoText: payload.logo_text ?? payload.logoText,
    brandName: payload.brand_name ?? payload.brandName,
    fontFamily: payload.font_family ?? payload.fontFamily,
    fontSizes: payload.font_sizes ?? payload.fontSizes,
    sidebarColor: payload.sidebar_color ?? payload.sidebarColor,
    sidebarCustomColor: payload.sidebar_custom_color ?? payload.sidebarCustomColor,
    sidebarCustomFrom: payload.sidebar_custom_from ?? payload.sidebarCustomFrom,
    sidebarCustomTo: payload.sidebar_custom_to ?? payload.sidebarCustomTo,
    sidebarActiveColor: payload.sidebar_active_color ?? payload.sidebarActiveColor,
    accentColor: payload.accent_color ?? payload.accentColor,
    borderRadius: payload.border_radius ?? payload.borderRadius,
  });
}

function mapSettingsToApi(input) {
  const settings = sanitizeSettings(input);

  return {
    theme: settings.theme,
    logo_url: settings.logoUrl,
    logo_text: settings.logoText,
    brand_name: settings.brandName,
    font_family: settings.fontFamily,
    font_sizes: settings.fontSizes,
    sidebar_color: settings.sidebarColor,
    sidebar_custom_from: settings.sidebarCustomColor,
    sidebar_custom_to: settings.sidebarCustomColor,
    sidebar_active_color: settings.sidebarActiveColor,
    accent_color: settings.accentColor,
    border_radius: settings.borderRadius,
  };
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex, DEFAULTS.accentColor).slice(1);

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function AppSettingsProvider({ children }) {
  const [authToken, setAuthToken] = useState(() => getToken());
  const [settings, setSettings] = useState(DEFAULTS);
  const [persistedSettings, setPersistedSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncToken = () => {
      setAuthToken(getToken());
    };

    window.addEventListener("auth-token-changed", syncToken);
    window.addEventListener("focus", syncToken);

    return () => {
      window.removeEventListener("auth-token-changed", syncToken);
      window.removeEventListener("focus", syncToken);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchSettings = async () => {
      if (!authToken) {
        setLoading(false);
        setSettings(DEFAULTS);
        setPersistedSettings(DEFAULTS);
        return;
      }

      setLoading(true);

      try {
        const response = await axiosClient.get("/app-settings");
        const nextSettings = mapApiToSettings(response.data?.data ?? response.data);

        if (!active) return;

        setSettings(nextSettings);
        setPersistedSettings(nextSettings);
      } catch {
        if (!active) return;

        setSettings(DEFAULTS);
        setPersistedSettings(DEFAULTS);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      active = false;
    };
  }, [authToken]);

  useEffect(() => {
    const root = document.documentElement;
    const fontSizes = settings.fontSizes;
    const sidebarColor = settings.sidebarColor === "custom"
      ? settings.sidebarCustomColor
      : SIDEBAR_COLORS[settings.sidebarColor] || SIDEBAR_COLORS.dark;
    const radius = BORDER_RADIUS_SCALE[settings.borderRadius] || BORDER_RADIUS_SCALE.md;

    root.setAttribute("data-theme", settings.theme);
    root.style.setProperty("--app-font-family", FONT_STACKS[settings.fontFamily] || FONT_STACKS.Inter);
    root.style.setProperty("--app-h1", `${fontSizes.h1}px`);
    root.style.setProperty("--app-h2", `${fontSizes.h2}px`);
    root.style.setProperty("--app-h3", `${fontSizes.h3}px`);
    root.style.setProperty("--app-h4", `${fontSizes.h4}px`);
    root.style.setProperty("--app-h5", `${fontSizes.h5}px`);
    root.style.setProperty("--app-h6", `${fontSizes.h6}px`);
    root.style.setProperty("--sidebar-bg", sidebarColor);
    root.style.setProperty("--sidebar-from", sidebarColor);
    root.style.setProperty("--sidebar-to", sidebarColor);
    root.style.setProperty("--accent", settings.accentColor);
    root.style.setProperty("--accent-light", hexToRgba(settings.accentColor, 0.12));
    root.style.setProperty("--accent-ring", hexToRgba(settings.accentColor, 0.24));
    root.style.setProperty("--sidebar-active", settings.sidebarActiveColor || settings.accentColor);
    root.style.setProperty("--r-xs", radius.xs);
    root.style.setProperty("--r-sm", radius.sm);
    root.style.setProperty("--r-md", radius.md);
    root.style.setProperty("--r-lg", radius.lg);
    root.style.setProperty("--r-xl", radius.xl);
    root.style.setProperty("--r-2xl", radius["2xl"]);
    root.style.removeProperty("--admin-main-padding");
    root.style.removeProperty("--dur-fast");
    root.style.removeProperty("--dur-base");
    root.style.removeProperty("--dur-slow");
  }, [settings]);

  const update = (patch) => {
    setSettings((previous) => mergeSettings(previous, patch));
  };

  const reset = () => {
    setSettings(DEFAULTS);
  };

  const save = async () => {
    if (!authToken) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    setSaving(true);

    try {
      const response = await axiosClient.patch("/app-settings", mapSettingsToApi(settings));
      const nextSettings = mapApiToSettings(response.data?.data ?? response.data);

      setSettings(nextSettings);
      setPersistedSettings(nextSettings);

      return { success: true, data: nextSettings };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, "Không thể lưu cài đặt giao diện."),
      };
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify(settings) !== JSON.stringify(persistedSettings);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        update,
        reset,
        save,
        loading,
        saving,
        dirty,
        FONT_OPTIONS,
        SIDEBAR_COLORS,
        DEFAULTS,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
