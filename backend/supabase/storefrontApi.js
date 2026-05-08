import {
  CUSTOMER_DATA_KEY,
  CUSTOMER_TOKEN_KEY,
  DEFAULT_CUSTOMER_RANK_RULES,
} from "./constants";
import {
  ApiError,
  createSessionToken,
  createSupabaseGetter,
  ensureArray,
  normalizePhone,
  ok,
  pickCustomerSession,
  readJsonStorage,
  removeStorage,
  resolveCustomerRank,
  sanitizePoints,
  toApiError,
  unwrap,
  writeJsonStorage,
} from "./common";

function cleanPath(path) {
  const normalized = String(path || "").trim();
  const value = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

function ensureText(value, fallback = "") {
  const nextValue = String(value ?? "").trim();
  return nextValue || fallback;
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }
  return false;
}

function formatProductRow(row) {
  return {
    id: row.id,
    _id: row.id,
    sku: row.sku || "",
    name: row.name || "",
    thumbnail: row.thumbnail || "",
    image: row.thumbnail || "",
    content_structure_id: row.content_structure_id,
    contentStructureId:
      row.content_structure_id === null || row.content_structure_id === undefined
        ? ""
        : String(row.content_structure_id),
    price: asNumber(row.price),
    quantity: asNumber(row.quantity),
    short_desc: row.short_desc || "",
    shortDesc: row.short_desc || "",
    publish: normalizeBoolean(row.publish),
    isPublish: normalizeBoolean(row.publish),
    field_values: row.field_values || {},
    fieldValues: row.field_values || {},
  };
}

function formatContentStructureRow(row, fields = []) {
  return {
    ...row,
    fields: [...fields].sort((left, right) => {
      const leftOrder = asNumber(left.sort_order);
      const rightOrder = asNumber(right.sort_order);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return asNumber(left.id) - asNumber(right.id);
    }),
  };
}

function formatCustomerRow(row) {
  return {
    id: row.id,
    name: row.name || "",
    phone: row.phone || "",
    address: row.address || "",
    loyalty_points: sanitizePoints(row.loyalty_points),
    rank: row.rank || "",
    avatar: row.avatar || "",
  };
}

function formatMessageRow(row, adminUserMap, customer) {
  const isCustomer = row.sender_type === "customer";
  const adminSender = row.sender_user_id ? adminUserMap.get(row.sender_user_id) : null;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: isCustomer ? "customer" : "user",
    senderName: isCustomer ? customer?.name || "Ban" : adminSender?.name || "Admin",
    senderAvatar: isCustomer ? customer?.avatar || "" : adminSender?.avatar || "",
    message: row.message || "",
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

function setCustomerSession(response) {
  if (typeof window === "undefined") {
    return response;
  }

  if (response?.token) {
    window.localStorage.setItem(CUSTOMER_TOKEN_KEY, response.token);
  }

  if (response?.customer) {
    writeJsonStorage(CUSTOMER_DATA_KEY, response.customer);
  }

  return response;
}

async function ensureAppSettingsRow(supabase) {
  const rows = await unwrap(
    supabase.from("app_settings").select("*").order("id", { ascending: true }).limit(1),
    "Khong the doc app settings cho storefront.",
  );

  if (rows.length > 0) {
    return rows[0];
  }

  return {
    customer_rank_rules: DEFAULT_CUSTOMER_RANK_RULES,
  };
}

async function listContentStructures(supabase) {
  const [structures, fields] = await Promise.all([
    unwrap(
      supabase
        .from("content_structures")
        .select("*")
        .order("created_at", { ascending: false }),
      "Khong the doc content structures.",
    ),
    unwrap(
      supabase.from("content_fields").select("*"),
      "Khong the doc content fields.",
    ),
  ]);

  const fieldsByStructure = fields.reduce((map, field) => {
    const bucket = map.get(field.content_structure_id) || [];
    bucket.push(field);
    map.set(field.content_structure_id, bucket);
    return map;
  }, new Map());

  return structures.map((structure) =>
    formatContentStructureRow(
      structure,
      ensureArray(fieldsByStructure.get(structure.id)),
    ),
  );
}

async function fetchCustomerConversation(supabase, customerId, createIfMissing = false) {
  const conversation = await unwrap(
    supabase
      .from("conversations")
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle(),
    "Khong the doc conversation cua customer.",
  );

  if (conversation || !createIfMissing) {
    return conversation;
  }

  return unwrap(
    supabase
      .from("conversations")
      .insert({ customer_id: customerId })
      .select("*")
      .single(),
    "Khong the tao conversation cho customer.",
  );
}

async function fetchCustomerMessages(supabase, customer) {
  const conversation = await fetchCustomerConversation(supabase, customer.id, false);

  if (!conversation) {
    return [];
  }

  const [messages, adminUsers] = await Promise.all([
    unwrap(
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true }),
      "Khong the doc messages cua customer.",
    ),
    unwrap(
      supabase.from("admin_users").select("id, name, avatar"),
      "Khong the doc admin users cho customer chat.",
    ),
  ]);
  const adminUserMap = new Map(adminUsers.map((user) => [user.id, user]));

  return messages.map((message) =>
    formatMessageRow(message, adminUserMap, customer),
  );
}

async function handleCustomerRegister(supabase, payload) {
  const name = ensureText(payload?.name);
  const phone = normalizePhone(payload?.phone);

  if (!name || phone.length !== 10) {
    throw new ApiError("Thong tin dang ky khach hang chua hop le.", 422);
  }

  const duplicate = await unwrap(
    supabase.from("customers").select("id").eq("phone", phone).maybeSingle(),
    "Khong the kiem tra so dien thoai khach hang.",
  );

  if (duplicate) {
    throw new ApiError("So dien thoai da ton tai.", 409);
  }

  const settings = await ensureAppSettingsRow(supabase);
  const customer = await unwrap(
    supabase
      .from("customers")
      .insert({
        name,
        phone,
        address: "",
        loyalty_points: 0,
        rank: resolveCustomerRank(0, settings.customer_rank_rules),
      })
      .select("*")
      .single(),
    "Khong the tao customer moi.",
  );

  return setCustomerSession({
    success: true,
    token: createSessionToken(),
    customer: formatCustomerRow(customer),
  });
}

async function handleCustomerLogin(supabase, payload) {
  const phone = normalizePhone(payload?.phone);
  if (phone.length !== 10) {
    throw new ApiError("So dien thoai phai gom 10 chu so.", 422);
  }

  const customer = await unwrap(
    supabase.from("customers").select("*").eq("phone", phone).maybeSingle(),
    "Khong the tim customer dang nhap.",
  );

  if (!customer) {
    throw new ApiError("Khong tim thay khach hang voi so dien thoai nay.", 404);
  }

  return setCustomerSession({
    success: true,
    token: createSessionToken(),
    customer: formatCustomerRow(customer),
  });
}

async function handleCustomerLogout() {
  removeStorage(CUSTOMER_TOKEN_KEY);
  removeStorage(CUSTOMER_DATA_KEY);
  return { success: true };
}

async function handlePublicProducts(supabase) {
  const rows = await unwrap(
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    "Khong the doc products cong khai.",
  );

  return rows.map(formatProductRow);
}

async function handlePublicContentStructures(supabase) {
  return listContentStructures(supabase);
}

async function handleCustomerCartList(supabase, customer) {
  const rows = await unwrap(
    supabase
      .from("cart_items")
      .select("*")
      .eq("customer_id", customer.id)
      .order("updated_at", { ascending: false }),
    "Khong the doc gio hang khach hang.",
  );

  return rows.map((row) => ({
    productId: row.product_id,
    quantity: asNumber(row.quantity),
  }));
}

async function handleCustomerCartUpsert(supabase, customer, payload) {
  const productId = Number(payload?.product_id);
  const quantity = asNumber(payload?.quantity);

  if (!productId) {
    throw new ApiError("San pham gio hang khong hop le.", 422);
  }

  if (quantity <= 0) {
    await unwrap(
      supabase
        .from("cart_items")
        .delete()
        .eq("customer_id", customer.id)
        .eq("product_id", productId),
      "Khong the xoa san pham khoi gio hang.",
    );
    return { success: true };
  }

  const existing = await unwrap(
    supabase
      .from("cart_items")
      .select("id")
      .eq("customer_id", customer.id)
      .eq("product_id", productId)
      .maybeSingle(),
    "Khong the kiem tra gio hang hien tai.",
  );

  if (existing) {
    await unwrap(
      supabase
        .from("cart_items")
        .update({
          quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id),
      "Khong the cap nhat gio hang.",
    );
  } else {
    await unwrap(
      supabase.from("cart_items").insert({
        customer_id: customer.id,
        product_id: productId,
        quantity,
      }),
      "Khong the them san pham vao gio hang.",
    );
  }

  return { success: true };
}

async function handleCustomerCartClear(supabase, customer) {
  await unwrap(
    supabase.from("cart_items").delete().eq("customer_id", customer.id),
    "Khong the xoa toan bo gio hang.",
  );
  return { success: true };
}

async function handleCustomerMessagesList(supabase, customer) {
  return fetchCustomerMessages(supabase, customer);
}

async function handleCustomerUnreadCount(supabase, customer) {
  const conversation = await fetchCustomerConversation(supabase, customer.id, false);

  if (!conversation) {
    return { count: 0 };
  }

  const rows = await unwrap(
    supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation.id)
      .eq("sender_type", "user")
      .eq("is_read", false),
    "Khong the doc so tin nhan chua doc cua customer.",
  );

  return { count: rows.length };
}

async function handleCustomerMarkRead(supabase, customer) {
  const conversation = await fetchCustomerConversation(supabase, customer.id, false);

  if (!conversation) {
    return { success: true };
  }

  await unwrap(
    supabase
      .from("messages")
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq("conversation_id", conversation.id)
      .eq("sender_type", "user"),
    "Khong the danh dau tin nhan da doc.",
  );

  return { success: true };
}

async function handleCustomerSendMessage(supabase, customer, payload) {
  const message = ensureText(payload?.message);
  if (!message) {
    throw new ApiError("Tin nhan khong duoc de trong.", 422);
  }

  const conversation = await fetchCustomerConversation(supabase, customer.id, true);
  const inserted = await unwrap(
    supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_type: "customer",
        sender_user_id: null,
        sender_customer_id: customer.id,
        message,
        is_read: false,
      })
      .select("*")
      .single(),
    "Khong the gui tin nhan tu customer.",
  );

  await unwrap(
    supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id),
    "Khong the cap nhat hoi thoai cua customer.",
  );

  const adminUserMap = new Map();
  return formatMessageRow(inserted, adminUserMap, customer);
}

export function createStorefrontApi({ createClient, env }) {
  const getSupabase = createSupabaseGetter(createClient, env);

  async function request(method, path, payload) {
    try {
      const supabase = getSupabase();
      const clean = cleanPath(path);
      const upperMethod = String(method || "GET").toUpperCase();

      if (upperMethod === "POST" && clean === "/customer/register") {
        return ok(await handleCustomerRegister(supabase, payload));
      }

      if (upperMethod === "POST" && clean === "/customer/login") {
        return ok(await handleCustomerLogin(supabase, payload));
      }

      if (upperMethod === "POST" && clean === "/customer/logout") {
        return ok(await handleCustomerLogout());
      }

      if (upperMethod === "GET" && clean === "/public/products") {
        return ok(await handlePublicProducts(supabase));
      }

      if (upperMethod === "GET" && clean === "/public/content-structures") {
        return ok({ data: await handlePublicContentStructures(supabase) });
      }

      if (clean.startsWith("/customer/")) {
        const customer = pickCustomerSession();

        if (upperMethod === "GET" && clean === "/customer/me") {
          const currentCustomer = readJsonStorage(CUSTOMER_DATA_KEY, customer);
          return ok(formatCustomerRow(currentCustomer));
        }

        if (upperMethod === "GET" && clean === "/customer/cart") {
          return ok({ data: await handleCustomerCartList(supabase, customer) });
        }

        if (upperMethod === "POST" && clean === "/customer/cart") {
          return ok(await handleCustomerCartUpsert(supabase, customer, payload));
        }

        if (upperMethod === "DELETE" && clean === "/customer/cart") {
          return ok(await handleCustomerCartClear(supabase, customer));
        }

        if (upperMethod === "GET" && clean === "/customer/messages") {
          return ok({ data: await handleCustomerMessagesList(supabase, customer) });
        }

        if (upperMethod === "GET" && clean === "/customer/unread-count") {
          return ok(await handleCustomerUnreadCount(supabase, customer));
        }

        if (upperMethod === "POST" && clean === "/customer/messages/mark-read") {
          return ok(await handleCustomerMarkRead(supabase, customer));
        }

        if (upperMethod === "POST" && clean === "/customer/messages") {
          return ok({ data: await handleCustomerSendMessage(supabase, customer, payload) });
        }
      }

      throw new ApiError(`Endpoint ${upperMethod} ${clean} chua duoc ho tro.`, 404);
    } catch (error) {
      throw toApiError(error);
    }
  }

  return {
    get(path, config) {
      return request("GET", path, undefined, config);
    },
    post(path, data, config) {
      return request("POST", path, data, config);
    },
    patch(path, data, config) {
      return request("PATCH", path, data, config);
    },
    put(path, data, config) {
      return request("PUT", path, data, config);
    },
    delete(path, config) {
      return request("DELETE", path, undefined, config);
    },
  };
}
