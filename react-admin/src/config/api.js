const DEFAULT_API_ORIGIN = "http://127.0.0.1:8000";
const DEFAULT_STOREFRONT_URL = "http://localhost:5174";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  const rawApiUrl = trimTrailingSlash(import.meta.env.VITE_API_URL?.trim() || "");
  if (rawApiUrl) {
    return rawApiUrl.endsWith("/api/v1") ? rawApiUrl : `${rawApiUrl}/api/v1`;
  }

  const rawApiOrigin = trimTrailingSlash(import.meta.env.VITE_API_ORIGIN?.trim() || "");
  if (rawApiOrigin) {
    return `${rawApiOrigin}/api/v1`;
  }

  return `${DEFAULT_API_ORIGIN}/api/v1`;
}

function resolveStorefrontUrl() {
  const rawStorefrontUrl = trimTrailingSlash(import.meta.env.VITE_STOREFRONT_URL?.trim() || "");
  return rawStorefrontUrl || DEFAULT_STOREFRONT_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");
export const STOREFRONT_URL = resolveStorefrontUrl();
