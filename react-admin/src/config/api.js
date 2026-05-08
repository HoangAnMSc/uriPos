const DEFAULT_STOREFRONT_URL = "http://localhost:5174";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function resolveApiOrigin() {
  const rawSupabaseUrl = trimTrailingSlash(
    import.meta.env.VITE_SUPABASE_URL?.trim() || "",
  );
  if (rawSupabaseUrl) {
    return rawSupabaseUrl;
  }

  const rawApiOrigin = trimTrailingSlash(
    import.meta.env.VITE_API_ORIGIN?.trim() || "",
  );
  if (rawApiOrigin) {
    return rawApiOrigin;
  }

  return "";
}

function resolveStorefrontUrl() {
  const rawStorefrontUrl = trimTrailingSlash(
    import.meta.env.VITE_STOREFRONT_URL?.trim() || "",
  );
  return rawStorefrontUrl || DEFAULT_STOREFRONT_URL;
}

export const API_ORIGIN = resolveApiOrigin();
export const API_BASE_URL = API_ORIGIN;
export const STOREFRONT_URL = resolveStorefrontUrl();
