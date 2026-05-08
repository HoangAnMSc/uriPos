import {
  CUSTOMER_DATA_KEY,
  STORAGE_BUCKET_FALLBACK,
} from "./constants";

export class ApiError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = {
      status,
      data: {
        message,
        ...extra,
      },
    };
  }
}

export function createSupabaseGetter(createClient, env) {
  let client = null;

  return function getSupabase() {
    if (client) {
      return client;
    }

    const url = String(env?.VITE_SUPABASE_URL || "").trim();
    const anonKey = String(env?.VITE_SUPABASE_ANON_KEY || "").trim();

    if (!url || !anonKey) {
      throw new ApiError(
        "Supabase chua duoc cau hinh. Vui long them VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY.",
        500,
      );
    }

    client = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return client;
  };
}

export function ok(data) {
  return { data };
}

export function readJsonStorage(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readStorage(key) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(key) || "";
}

export function writeStorage(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  if (value === undefined || value === null || value === "") {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, String(value));
}

export function removeStorage(key) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}

export function createSessionToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function sha256(value) {
  const text = String(value ?? "");

  if (!crypto?.subtle) {
    throw new ApiError("Trinh duyet hien tai khong ho tro ma hoa mat khau.", 500);
  }

  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadPublicFile(getSupabase, env, file, folder) {
  if (!(file instanceof File)) {
    throw new ApiError("File upload khong hop le.", 422);
  }

  const supabase = getSupabase();
  const bucket = String(env?.VITE_SUPABASE_STORAGE_BUCKET || "").trim()
    || STORAGE_BUCKET_FALLBACK;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectPath = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw toApiError(uploadError, "Khong the tai tep len Supabase Storage.");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return {
    bucket,
    path: objectPath,
    url: data?.publicUrl || "",
  };
}

export async function uploadCloudinaryFile(env, file, folder) {
  if (!(file instanceof File)) {
    throw new ApiError("File upload khong hop le.", 422);
  }

  const cloudName = String(env?.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
  const uploadPreset = String(env?.VITE_CLOUDINARY_UPLOAD_PRESET || "").trim();

  if (!cloudName || !uploadPreset) {
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const baseFolder = String(env?.VITE_CLOUDINARY_FOLDER || "").trim();
  const targetFolder = [baseFolder, folder].filter(Boolean).join("/");
  if (targetFolder) {
    formData.append("folder", targetFolder);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || "Khong the tai anh len Cloudinary.",
      response.status,
    );
  }

  return {
    bucket: cloudName,
    path: data.public_id || "",
    publicId: data.public_id || "",
    url: data.secure_url || data.url || "",
  };
}

export async function uploadImageFile(getSupabase, env, file, folder) {
  const cloudinaryUpload = await uploadCloudinaryFile(env, file, folder);
  if (cloudinaryUpload) {
    return cloudinaryUpload;
  }

  return uploadPublicFile(getSupabase, env, file, folder);
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function groupBy(list, keySelector) {
  return list.reduce((map, item) => {
    const key = keySelector(item);
    const bucket = map.get(key) || [];
    bucket.push(item);
    map.set(key, bucket);
    return map;
  }, new Map());
}

export function sortByCreatedDesc(list) {
  return [...list].sort((left, right) => {
    const leftTime = new Date(left?.created_at || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.created_at || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

export function pickCustomerSession() {
  const customer = readJsonStorage(CUSTOMER_DATA_KEY, null);

  if (!customer?.id) {
    throw new ApiError("Vui long dang nhap de tiep tuc.", 401);
  }

  return customer;
}

export function getQueryValue(config, key, fallback = "") {
  const value = config?.params?.[key];
  return value === undefined || value === null ? fallback : value;
}

export function normalizePhone(value) {
  return String(value || "").replace(/[^0-9]/g, "").slice(0, 10);
}

export function sanitizePoints(value) {
  const points = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(points) && points > 0 ? points : 0;
}

export function resolveCustomerRank(points, rules = []) {
  const normalizedPoints = sanitizePoints(points);
  const normalizedRules = ensureArray(rules)
    .map((rule) => ({
      name: String(rule?.name || "").trim(),
      min_points: sanitizePoints(rule?.min_points),
    }))
    .filter((rule) => rule.name)
    .sort((left, right) => left.min_points - right.min_points);

  let current = normalizedRules[0]?.name || "";

  normalizedRules.forEach((rule) => {
    if (normalizedPoints >= rule.min_points) {
      current = rule.name;
    }
  });

  return current;
}

export function calculatePaymentStatus(total, paid) {
  const normalizedTotal = Number(total || 0);
  const normalizedPaid = Number(paid || 0);

  if (normalizedPaid >= normalizedTotal && normalizedTotal > 0) {
    return "paid";
  }

  if (normalizedPaid > 0) {
    return "partial";
  }

  return "unpaid";
}

export function buildOrderCode(id) {
  return `ORD-${String(id).padStart(6, "0")}`;
}

export function normalizeSupabaseError(error, fallbackMessage) {
  const message = error?.message || fallbackMessage || "Supabase request failed";

  if (
    /relation .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message)
  ) {
    return new ApiError(
      "Supabase schema chua san sang. Hay chay file backend/supabase/schema.sql truoc.",
      500,
    );
  }

  return new ApiError(message, 500);
}

export function toApiError(error, fallbackMessage = "Request failed") {
  if (error instanceof ApiError) {
    return error;
  }

  return normalizeSupabaseError(error, fallbackMessage);
}

export async function unwrap(promise, fallbackMessage) {
  const { data, error } = await promise;

  if (error) {
    throw toApiError(error, fallbackMessage);
  }

  return data;
}
