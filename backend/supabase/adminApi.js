import {
  ADMIN_ONLINE_WINDOW_MS,
  ADMIN_USER_ID_KEY,
  DEFAULT_APP_SETTINGS_ROW,
  DEFAULT_CUSTOMER_RANK_RULES,
  DEFAULT_PAYMENT_SETTINGS_ROW,
  DEFAULT_PERMISSION_NAMES,
  DEFAULT_ROLE_DEFINITIONS,
} from "./constants";
import {
  ApiError,
  buildOrderCode,
  calculatePaymentStatus,
  createSessionToken,
  createSupabaseGetter,
  ensureArray,
  getQueryValue,
  groupBy,
  normalizePhone,
  ok,
  readStorage,
  removeStorage,
  resolveCustomerRank,
  sanitizePoints,
  sha256,
  sortByCreatedDesc,
  toApiError,
  unwrap,
  uploadImageFile,
  writeStorage,
} from "./common";

function cleanPath(path) {
  const normalized = String(path || "").trim();
  const value = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function ensureText(value, fallback = "") {
  const nextValue = String(value ?? "").trim();
  return nextValue || fallback;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function formatProductRow(row) {
  return {
    id: row.id,
    sku: row.sku || "",
    name: row.name || "",
    thumbnail: row.thumbnail || "",
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
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatDiscountRow(row) {
  return {
    id: row.id,
    code: row.code || "",
    type: row.type || "percent",
    value: asNumber(row.value),
    minSubtotal: asNumber(row.min_subtotal),
    min_subtotal: asNumber(row.min_subtotal),
    maxDiscount: row.max_discount == null ? null : asNumber(row.max_discount),
    max_discount: row.max_discount == null ? null : asNumber(row.max_discount),
    active: normalizeBoolean(row.active, true),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatContentFieldRow(row) {
  return {
    ...row,
    required: normalizeBoolean(row.required),
    options: ensureArray(row.options),
    sort_order: asNumber(row.sort_order),
  };
}

function formatContentStructureRow(row, fields = []) {
  return {
    ...row,
    fields: [...fields]
      .map(formatContentFieldRow)
      .sort((left, right) => {
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }
        return asNumber(left.id) - asNumber(right.id);
      }),
  };
}

function formatCustomerRow(row) {
  return {
    ...row,
    loyalty_points: sanitizePoints(row.loyalty_points),
    rank: row.rank || "",
  };
}

function formatOrderItemRow(row) {
  return {
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name || "",
    sku: row.sku || "",
    qty: asNumber(row.qty),
    price: asNumber(row.price),
    line_total: asNumber(row.line_total),
    note: row.note || "",
    name: row.product_name || "",
  };
}

function formatOrderRow(orderRow, orderItems = []) {
  const paidAmount = asNumber(orderRow.paid_amount);
  const totalAmount = asNumber(orderRow.total_amount);
  const dueAmount = asNumber(orderRow.due_amount, Math.max(totalAmount - paidAmount, 0));

  return {
    id: orderRow.id,
    code: orderRow.order_no || buildOrderCode(orderRow.id),
    order_no: orderRow.order_no || buildOrderCode(orderRow.id),
    customer_id: orderRow.customer_id,
    customer_name: orderRow.customer_name || "Khach le",
    staff_id: orderRow.staff_id,
    note: orderRow.note || "",
    subtotal: asNumber(orderRow.subtotal),
    discount: asNumber(orderRow.discount),
    grand_total: totalAmount,
    total_amount: totalAmount,
    total: totalAmount,
    paid_amount: paidAmount,
    paid: paidAmount,
    due_amount: dueAmount,
    due: dueAmount,
    payment_method: orderRow.payment_method || "cash",
    payment_status: orderRow.payment_status || calculatePaymentStatus(totalAmount, paidAmount),
    cash_received: asNumber(orderRow.cash_received),
    change_amount: asNumber(orderRow.change_amount),
    created_at: orderRow.created_at,
    invoice_date: orderRow.created_at,
    items: orderItems.map(formatOrderItemRow),
  };
}

function formatNotificationForUser(notification, receipt) {
  return {
    id: notification.id,
    message: notification.message || "",
    type: notification.type || "info",
    createdAt: notification.created_at,
    created_at: notification.created_at,
    isRead: normalizeBoolean(receipt?.is_read),
    is_read: normalizeBoolean(receipt?.is_read),
    isLiked: normalizeBoolean(receipt?.is_liked),
    is_liked: normalizeBoolean(receipt?.is_liked),
    likeCount: asNumber(notification.like_count),
    like_count: asNumber(notification.like_count),
  };
}

function formatNotificationForAdmin(notification, receipts = []) {
  const readCount = receipts.filter((receipt) => normalizeBoolean(receipt.is_read)).length;
  const likeCount = receipts.filter((receipt) => normalizeBoolean(receipt.is_liked)).length;

  return {
    id: notification.id,
    message: notification.message || "",
    type: notification.type || "info",
    recipientType: notification.recipient_type || "all",
    recipientIds: ensureArray(notification.recipient_ids),
    recipientCount: receipts.length,
    readCount,
    likeCount,
    createdAt: notification.created_at,
    created_at: notification.created_at,
  };
}

function formatMessageRow(row, userMap, customerMap) {
  const senderType = row.sender_type || "customer";
  const adminSender = row.sender_user_id ? userMap.get(row.sender_user_id) : null;
  const customerSender = row.sender_customer_id ? customerMap.get(row.sender_customer_id) : null;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType,
    senderName:
      senderType === "user"
        ? adminSender?.name || "Admin"
        : customerSender?.name || "Khach hang",
    senderAvatar:
      senderType === "user"
        ? adminSender?.avatar || ""
        : customerSender?.avatar || "",
    message: row.message || "",
    createdAt: row.created_at,
    created_at: row.created_at,
    isRead: normalizeBoolean(row.is_read),
  };
}

function formatConversationRow(row, customer, messages = []) {
  const orderedMessages = [...messages].sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
  const lastMessage = orderedMessages[0] || null;
  const unreadCount = orderedMessages.filter(
    (message) =>
      message.sender_type === "customer" && !normalizeBoolean(message.is_read),
  ).length;

  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: customer?.name || "Khach hang",
    customerPhone: customer?.phone || "",
    customerAvatar: customer?.avatar || "",
    lastMessage: lastMessage?.message || "",
    lastMessageAt: lastMessage?.created_at || null,
    lastMessageSenderType: lastMessage?.sender_type || "",
    unreadCount,
  };
}

function setAdminUserId(value) {
  writeStorage(ADMIN_USER_ID_KEY, value);
}

function getAdminUserId() {
  return readStorage(ADMIN_USER_ID_KEY);
}

function clearAdminUserId() {
  removeStorage(ADMIN_USER_ID_KEY);
}

async function ensurePermissionSeed(supabase) {
  const existing = await unwrap(
    supabase.from("permissions").select("id, name").order("id", { ascending: true }),
    "Khong the doc bang permissions.",
  );

  if (existing.length > 0) {
    return existing;
  }

  await unwrap(
    supabase
      .from("permissions")
      .insert(DEFAULT_PERMISSION_NAMES.map((name) => ({ name }))),
    "Khong the tao permissions mac dinh.",
  );

  return unwrap(
    supabase.from("permissions").select("id, name").order("id", { ascending: true }),
    "Khong the nap permissions sau khi tao.",
  );
}

async function ensureRoleSeed(supabase) {
  const permissions = await ensurePermissionSeed(supabase);
  const existingRoles = await unwrap(
    supabase.from("roles").select("id, name").order("id", { ascending: true }),
    "Khong the doc bang roles.",
  );

  if (existingRoles.length > 0) {
    return existingRoles;
  }

  await unwrap(
    supabase
      .from("roles")
      .insert(DEFAULT_ROLE_DEFINITIONS.map((role) => ({ name: role.name }))),
    "Khong the tao roles mac dinh.",
  );

  const roles = await unwrap(
    supabase.from("roles").select("id, name").order("id", { ascending: true }),
    "Khong the nap roles sau khi tao.",
  );
  const permissionIdByName = new Map(permissions.map((permission) => [permission.name, permission.id]));
  const roleIdByName = new Map(roles.map((role) => [role.name, role.id]));
  const links = [];

  DEFAULT_ROLE_DEFINITIONS.forEach((roleDefinition) => {
    const roleId = roleIdByName.get(roleDefinition.name);
    roleDefinition.permissions.forEach((permissionName) => {
      const permissionId = permissionIdByName.get(permissionName);

      if (roleId && permissionId) {
        links.push({
          role_id: roleId,
          permission_id: permissionId,
        });
      }
    });
  });

  if (links.length > 0) {
    await unwrap(
      supabase.from("role_permissions").insert(links),
      "Khong the gan quyen mac dinh cho roles.",
    );
  }

  return roles;
}

async function fetchRolesWithPermissions(supabase) {
  await ensureRoleSeed(supabase);

  const [roles, permissions, rolePermissions] = await Promise.all([
    unwrap(
      supabase.from("roles").select("id, name").order("id", { ascending: true }),
      "Khong the doc roles.",
    ),
    unwrap(
      supabase.from("permissions").select("id, name").order("id", { ascending: true }),
      "Khong the doc permissions.",
    ),
    unwrap(
      supabase.from("role_permissions").select("role_id, permission_id"),
      "Khong the doc role permissions.",
    ),
  ]);

  const permissionMap = new Map(permissions.map((permission) => [permission.id, permission]));
  const groupedRolePermissions = groupBy(rolePermissions, (item) => item.role_id);

  return roles.map((role) => ({
    ...role,
    permissions: ensureArray(groupedRolePermissions.get(role.id))
      .map((item) => permissionMap.get(item.permission_id))
      .filter(Boolean),
  }));
}

async function fetchUserRolesMap(supabase, userIds) {
  if (!userIds.length) {
    return new Map();
  }

  const [roles, userRoles] = await Promise.all([
    unwrap(
      supabase.from("roles").select("id, name"),
      "Khong the doc roles cho user.",
    ),
    unwrap(
      supabase.from("user_roles").select("user_id, role_id").in("user_id", userIds),
      "Khong the doc user roles.",
    ),
  ]);

  const roleMap = new Map(roles.map((role) => [role.id, role]));
  const grouped = groupBy(userRoles, (item) => item.user_id);

  return new Map(
    userIds.map((userId) => [
      userId,
      ensureArray(grouped.get(userId))
        .map((item) => roleMap.get(item.role_id))
        .filter(Boolean),
    ]),
  );
}

async function fetchPermissionsForRoleIds(supabase, roleIds) {
  if (!roleIds.length) {
    return [];
  }

  const [rolePermissions, permissions] = await Promise.all([
    unwrap(
      supabase
        .from("role_permissions")
        .select("role_id, permission_id")
        .in("role_id", roleIds),
      "Khong the doc role permissions.",
    ),
    unwrap(
      supabase.from("permissions").select("id, name"),
      "Khong the doc permissions.",
    ),
  ]);

  const permissionMap = new Map(permissions.map((permission) => [permission.id, permission.name]));
  return rolePermissions
    .map((item) => permissionMap.get(item.permission_id))
    .filter(Boolean);
}

async function touchUserActivity(supabase, userId, online = true) {
  const now = new Date().toISOString();
  await unwrap(
    supabase
      .from("admin_users")
      .update({
        is_online: online,
        last_seen_at: now,
        offline_since: online ? null : now,
      })
      .eq("id", userId),
    "Khong the cap nhat trang thai user.",
  );
}

async function resolveCurrentAdminUser(supabase, options = {}) {
  const userId = getAdminUserId();

  if (!userId) {
    throw new ApiError("Phien dang nhap da het han.", 401);
  }

  const userRow = await unwrap(
    supabase
      .from("admin_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle(),
    "Khong the xac thuc nguoi dung hien tai.",
  );

  if (!userRow) {
    clearAdminUserId();
    throw new ApiError("Khong tim thay tai khoan dang dang nhap.", 401);
  }

  if (options.touch !== false) {
    await touchUserActivity(supabase, userRow.id, true);
  }

  const rolesMap = await fetchUserRolesMap(supabase, [userRow.id]);
  const roles = ensureArray(rolesMap.get(userRow.id));
  const permissions = await fetchPermissionsForRoleIds(
    supabase,
    roles.map((role) => role.id),
  );

  return {
    ...userRow,
    roles: roles.map((role) => role.name),
    permissions: [...new Set(permissions)],
  };
}

function assertPermission(user, permissions) {
  const expected = ensureArray(permissions);
  if (expected.length === 0) {
    return;
  }

  const current = new Set(ensureArray(user?.permissions));
  const hasAny = expected.some((permission) => current.has(permission));

  if (!hasAny) {
    throw new ApiError("Ban khong co quyen thuc hien hanh dong nay.", 403);
  }
}

async function ensureAppSettingsRow(supabase) {
  const rows = await unwrap(
    supabase.from("app_settings").select("*").order("id", { ascending: true }).limit(1),
    "Khong the doc app settings.",
  );

  if (rows.length > 0) {
    return rows[0];
  }

  const inserted = await unwrap(
    supabase.from("app_settings").insert(DEFAULT_APP_SETTINGS_ROW).select().single(),
    "Khong the tao app settings mac dinh.",
  );

  return inserted;
}

async function ensurePaymentSettingsRow(supabase) {
  const rows = await unwrap(
    supabase
      .from("payment_settings")
      .select("*")
      .order("id", { ascending: true })
      .limit(1),
    "Khong the doc payment settings.",
  );

  if (rows.length > 0) {
    return rows[0];
  }

  const inserted = await unwrap(
    supabase
      .from("payment_settings")
      .insert(DEFAULT_PAYMENT_SETTINGS_ROW)
      .select()
      .single(),
    "Khong the tao payment settings mac dinh.",
  );

  return inserted;
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

  const fieldsByStructure = groupBy(fields, (field) => field.content_structure_id);
  return structures.map((structure) =>
    formatContentStructureRow(
      structure,
      ensureArray(fieldsByStructure.get(structure.id)),
    ),
  );
}

async function listProducts(supabase) {
  const rows = await unwrap(
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    "Khong the doc products.",
  );

  return rows.map(formatProductRow);
}

async function listCustomers(supabase, searchTerm = "") {
  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  const keyword = ensureText(searchTerm);
  if (keyword) {
    query = query.or(`name.ilike.%${keyword}%,phone.ilike.%${keyword}%`);
  }

  const rows = await unwrap(query, "Khong the doc customers.");
  return rows.map(formatCustomerRow);
}

async function listOrders(supabase) {
  const [orders, orderItems] = await Promise.all([
    unwrap(
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      "Khong the doc orders.",
    ),
    unwrap(
      supabase.from("order_items").select("*"),
      "Khong the doc order items.",
    ),
  ]);

  const itemsByOrderId = groupBy(orderItems, (item) => item.order_id);
  return orders.map((order) =>
    formatOrderRow(order, ensureArray(itemsByOrderId.get(order.id))),
  );
}

async function listNotificationsWithReceipts(supabase) {
  const [notifications, receipts] = await Promise.all([
    unwrap(
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      "Khong the doc notifications.",
    ),
    unwrap(
      supabase.from("notification_receipts").select("*"),
      "Khong the doc notification receipts.",
    ),
  ]);

  return {
    notifications,
    receiptsByNotification: groupBy(receipts, (receipt) => receipt.notification_id),
  };
}

async function listConversationsWithMessages(supabase) {
  const [conversations, messages, customers] = await Promise.all([
    unwrap(
      supabase.from("conversations").select("*").order("updated_at", { ascending: false }),
      "Khong the doc conversations.",
    ),
    unwrap(
      supabase.from("messages").select("*"),
      "Khong the doc messages.",
    ),
    unwrap(
      supabase.from("customers").select("id, name, phone, avatar"),
      "Khong the doc customer data.",
    ),
  ]);

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const messagesByConversation = groupBy(messages, (message) => message.conversation_id);

  return conversations.map((conversation) =>
    formatConversationRow(
      conversation,
      customerMap.get(conversation.customer_id),
      ensureArray(messagesByConversation.get(conversation.id)),
    ),
  );
}

async function fetchConversationMessages(supabase, conversationId, markRead = false) {
  const messages = await unwrap(
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
    "Khong the doc chat messages.",
  );
  const [users, customers] = await Promise.all([
    unwrap(
      supabase.from("admin_users").select("id, name, avatar"),
      "Khong the doc admin users.",
    ),
    unwrap(
      supabase.from("customers").select("id, name, avatar"),
      "Khong the doc customers.",
    ),
  ]);

  if (markRead) {
    const unreadIds = messages
      .filter((message) => message.sender_type === "customer" && !normalizeBoolean(message.is_read))
      .map((message) => message.id);

    if (unreadIds.length > 0) {
      await unwrap(
        supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadIds),
        "Khong the cap nhat trang thai da doc cua tin nhan.",
      );
      messages.forEach((message) => {
        if (unreadIds.includes(message.id)) {
          message.is_read = true;
        }
      });
    }
  }

  const userMap = new Map(users.map((user) => [user.id, user]));
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  return messages.map((message) => formatMessageRow(message, userMap, customerMap));
}

async function handleAdminLogin(supabase, payload) {
  const email = ensureText(payload?.email).toLowerCase();
  const password = String(payload?.password || "");

  if (!email || !password) {
    throw new ApiError("Email va mat khau la bat buoc.", 422);
  }

  const user = await unwrap(
    supabase
      .from("admin_users")
      .select("*")
      .eq("email", email)
      .maybeSingle(),
    "Khong the tim tai khoan admin.",
  );

  if (!user) {
    throw new ApiError("Sai email hoac mat khau.", 401);
  }

  const incomingHash = await sha256(password);
  if (incomingHash !== user.password_hash) {
    throw new ApiError("Sai email hoac mat khau.", 401);
  }

  const rolesMap = await fetchUserRolesMap(supabase, [user.id]);
  const roles = ensureArray(rolesMap.get(user.id));
  const permissions = await fetchPermissionsForRoleIds(
    supabase,
    roles.map((role) => role.id),
  );

  await touchUserActivity(supabase, user.id, true);
  setAdminUserId(user.id);

  return {
    token: createSessionToken(),
    roles: roles.map((role) => role.name),
    permissions: [...new Set(permissions)],
  };
}

async function handleLogout(supabase) {
  const userId = getAdminUserId();

  if (userId) {
    await touchUserActivity(supabase, userId, false);
  }

  clearAdminUserId();
  return { success: true };
}

async function handleMe(supabase) {
  return resolveCurrentAdminUser(supabase, { touch: true });
}

async function handleUpdateAvatar(supabase, currentUser, payload) {
  const avatar = ensureText(payload?.avatar);
  const updated = await unwrap(
    supabase
      .from("admin_users")
      .update({ avatar, updated_at: new Date().toISOString() })
      .eq("id", currentUser.id)
      .select("*")
      .single(),
    "Khong the cap nhat avatar.",
  );

  return {
    ...currentUser,
    avatar: updated.avatar || "",
  };
}

async function handleUsersList(supabase) {
  const users = await unwrap(
    supabase.from("admin_users").select("*").order("created_at", { ascending: false }),
    "Khong the doc users.",
  );
  const rolesMap = await fetchUserRolesMap(
    supabase,
    users.map((user) => user.id),
  );
  const now = Date.now();

  return users.map((user) => {
    const lastSeen = new Date(
      user.last_seen_at || user.updated_at || user.created_at || Date.now(),
    ).getTime();
    const active = normalizeBoolean(user.is_online)
      && now - lastSeen <= ADMIN_ONLINE_WINDOW_MS;

    return {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      avatar: user.avatar || "",
      roles: ensureArray(rolesMap.get(user.id)).map((role) => role.name),
      is_online: active,
      offline_since: active
        ? null
        : user.offline_since || user.last_seen_at || user.updated_at || user.created_at,
    };
  });
}

async function handleCreateUser(supabase, payload) {
  const name = ensureText(payload?.name);
  const email = ensureText(payload?.email).toLowerCase();
  const password = String(payload?.password || "");
  const roleIds = ensureArray(payload?.role_ids).map((value) => Number(value)).filter(Boolean);

  if (!name || !email || password.length < 6) {
    throw new ApiError("Thong tin tao user chua hop le.", 422);
  }

  const existing = await unwrap(
    supabase.from("admin_users").select("id").eq("email", email).maybeSingle(),
    "Khong the kiem tra email ton tai.",
  );

  if (existing) {
    throw new ApiError("Email nay da ton tai.", 422);
  }

  const user = await unwrap(
    supabase
      .from("admin_users")
      .insert({
        name,
        email,
        password_hash: await sha256(password),
        is_online: false,
        offline_since: new Date().toISOString(),
      })
      .select("*")
      .single(),
    "Khong the tao user moi.",
  );

  if (roleIds.length > 0) {
    await unwrap(
      supabase
        .from("user_roles")
        .insert(roleIds.map((roleId) => ({ user_id: user.id, role_id: roleId }))),
      "Khong the gan role cho user moi.",
    );
  }

  return user;
}

async function handleUpdateUser(supabase, userId, payload) {
  const patch = {
    name: ensureText(payload?.name),
    email: ensureText(payload?.email).toLowerCase(),
    updated_at: new Date().toISOString(),
  };

  if (payload?.password) {
    patch.password_hash = await sha256(payload.password);
  }

  const user = await unwrap(
    supabase
      .from("admin_users")
      .update(patch)
      .eq("id", userId)
      .select("*")
      .single(),
    "Khong the cap nhat user.",
  );

  const rolesMap = await fetchUserRolesMap(supabase, [user.id]);
  return {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    avatar: user.avatar || "",
    roles: ensureArray(rolesMap.get(user.id)).map((role) => role.name),
    is_online: normalizeBoolean(user.is_online),
    offline_since: user.offline_since || user.last_seen_at || user.updated_at,
  };
}

async function handleUpdateUserRoles(supabase, userId, payload) {
  const roleIds = ensureArray(payload?.role_ids).map((value) => Number(value)).filter(Boolean);

  await unwrap(
    supabase.from("user_roles").delete().eq("user_id", userId),
    "Khong the xoa role cu cua user.",
  );

  if (roleIds.length > 0) {
    await unwrap(
      supabase
        .from("user_roles")
        .insert(roleIds.map((roleId) => ({ user_id: userId, role_id: roleId }))),
      "Khong the cap nhat role cho user.",
    );
  }

  return handleUsersList(supabase).then((users) =>
    users.find((user) => String(user.id) === String(userId)) || null,
  );
}

async function handleDeleteUser(supabase, userId) {
  await unwrap(
    supabase.from("user_roles").delete().eq("user_id", userId),
    "Khong the xoa user roles.",
  );
  await unwrap(
    supabase.from("notification_receipts").delete().eq("user_id", userId),
    "Khong the xoa notification receipts cua user.",
  );
  await unwrap(
    supabase.from("admin_users").delete().eq("id", userId),
    "Khong the xoa user.",
  );
  return { success: true };
}

async function handleRolesList(supabase) {
  return fetchRolesWithPermissions(supabase);
}

async function handleCreateRole(supabase, payload) {
  const name = ensureText(payload?.name);
  const permissionIds = ensureArray(payload?.permission_ids).map((value) => Number(value)).filter(Boolean);

  if (!name) {
    throw new ApiError("Ten vai tro khong duoc de trong.", 422);
  }

  const role = await unwrap(
    supabase.from("roles").insert({ name }).select("*").single(),
    "Khong the tao role moi.",
  );

  if (permissionIds.length > 0) {
    await unwrap(
      supabase
        .from("role_permissions")
        .insert(permissionIds.map((permissionId) => ({
          role_id: role.id,
          permission_id: permissionId,
        }))),
      "Khong the gan permissions cho role.",
    );
  }

  return role;
}

async function handleUpdateRole(supabase, roleId, payload) {
  const name = ensureText(payload?.name);
  const permissionIds = ensureArray(payload?.permission_ids).map((value) => Number(value)).filter(Boolean);

  await unwrap(
    supabase
      .from("roles")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", roleId),
    "Khong the cap nhat role.",
  );
  await unwrap(
    supabase.from("role_permissions").delete().eq("role_id", roleId),
    "Khong the xoa permission cu cua role.",
  );

  if (permissionIds.length > 0) {
    await unwrap(
      supabase
        .from("role_permissions")
        .insert(permissionIds.map((permissionId) => ({
          role_id: roleId,
          permission_id: permissionId,
        }))),
      "Khong the cap nhat permissions cua role.",
    );
  }

  return { success: true };
}

async function handleDeleteRole(supabase, roleId) {
  await unwrap(
    supabase.from("role_permissions").delete().eq("role_id", roleId),
    "Khong the xoa role permissions.",
  );
  await unwrap(
    supabase.from("user_roles").delete().eq("role_id", roleId),
    "Khong the xoa role assignments.",
  );
  await unwrap(
    supabase.from("roles").delete().eq("id", roleId),
    "Khong the xoa role.",
  );
  return { success: true };
}

async function handlePermissionsList(supabase) {
  return ensurePermissionSeed(supabase);
}

async function handleProductsList(supabase) {
  return listProducts(supabase);
}

async function handleCreateProduct(supabase, payload) {
  const product = await unwrap(
    supabase
      .from("products")
      .insert({
        sku: ensureText(payload?.sku),
        name: ensureText(payload?.name),
        thumbnail: ensureText(payload?.thumbnail),
        content_structure_id: payload?.content_structure_id || null,
        price: asNumber(payload?.price),
        quantity: asNumber(payload?.quantity, 0),
        short_desc: ensureText(payload?.short_desc),
        publish: normalizeBoolean(payload?.publish),
        field_values: payload?.field_values || {},
      })
      .select("*")
      .single(),
    "Khong the tao product.",
  );

  return formatProductRow(product);
}

async function handleUpdateProduct(supabase, productId, payload) {
  const product = await unwrap(
    supabase
      .from("products")
      .update({
        sku: ensureText(payload?.sku),
        name: ensureText(payload?.name),
        thumbnail: ensureText(payload?.thumbnail),
        content_structure_id: payload?.content_structure_id || null,
        price: asNumber(payload?.price),
        quantity: asNumber(payload?.quantity, 0),
        short_desc: ensureText(payload?.short_desc),
        publish: normalizeBoolean(payload?.publish),
        field_values: payload?.field_values || {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .select("*")
      .single(),
    "Khong the cap nhat product.",
  );

  return formatProductRow(product);
}

async function handleDeleteProduct(supabase, productId) {
  await unwrap(
    supabase.from("cart_items").delete().eq("product_id", productId),
    "Khong the xoa cart items cua san pham.",
  );
  await unwrap(
    supabase.from("order_items").delete().eq("product_id", productId),
    "Khong the xoa order items cua san pham.",
  );
  await unwrap(
    supabase.from("products").delete().eq("id", productId),
    "Khong the xoa product.",
  );
  return { success: true };
}

async function handleDiscountsList(supabase) {
  const rows = await unwrap(
    supabase
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false }),
    "Khong the doc ma giam gia.",
  );

  return rows.map(formatDiscountRow);
}

async function handleCreateDiscount(supabase, payload) {
  const code = ensureText(payload?.code).toUpperCase();

  if (!code) {
    throw new ApiError("Ma giam gia la bat buoc.", 422);
  }

  const row = await unwrap(
    supabase
      .from("discount_codes")
      .insert({
        code,
        type: payload?.type === "fixed" ? "fixed" : "percent",
        value: asNumber(payload?.value),
        min_subtotal: asNumber(payload?.minSubtotal ?? payload?.min_subtotal),
        max_discount:
          payload?.maxDiscount === null || payload?.max_discount === null
            ? null
            : asNumber(payload?.maxDiscount ?? payload?.max_discount),
        active: normalizeBoolean(payload?.active, true),
      })
      .select("*")
      .single(),
    "Khong the tao ma giam gia.",
  );

  return formatDiscountRow(row);
}

async function handleUpdateDiscount(supabase, discountId, payload) {
  const patch = { updated_at: new Date().toISOString() };

  if (hasOwn(payload, "code")) patch.code = ensureText(payload.code).toUpperCase();
  if (hasOwn(payload, "type")) patch.type = payload.type === "fixed" ? "fixed" : "percent";
  if (hasOwn(payload, "value")) patch.value = asNumber(payload.value);
  if (hasOwn(payload, "minSubtotal") || hasOwn(payload, "min_subtotal")) {
    patch.min_subtotal = asNumber(payload.minSubtotal ?? payload.min_subtotal);
  }
  if (hasOwn(payload, "maxDiscount") || hasOwn(payload, "max_discount")) {
    const value = hasOwn(payload, "maxDiscount") ? payload.maxDiscount : payload.max_discount;
    patch.max_discount = value === null || value === "" ? null : asNumber(value);
  }
  if (hasOwn(payload, "active")) patch.active = normalizeBoolean(payload.active, true);

  const row = await unwrap(
    supabase
      .from("discount_codes")
      .update(patch)
      .eq("id", discountId)
      .select("*")
      .single(),
    "Khong the cap nhat ma giam gia.",
  );

  return formatDiscountRow(row);
}

async function handleDeleteDiscount(supabase, discountId) {
  await unwrap(
    supabase.from("discount_codes").delete().eq("id", discountId),
    "Khong the xoa ma giam gia.",
  );

  return { success: true };
}

async function handleProductMediaUpload(getSupabase, env, currentUser, payload) {
  const upload = await uploadImageFile(getSupabase, env, payload?.get?.("image") || payload?.image, "product-media");
  const supabase = getSupabase();
  const file = payload?.get?.("image") || payload?.image;

  const media = await unwrap(
    supabase
      .from("product_media")
      .insert({
        url: upload.url,
        bucket: upload.bucket,
        path: upload.path,
        file_name: file?.name || "",
        mime_type: file?.type || "",
        size: file?.size || 0,
        created_by: currentUser.id,
      })
      .select("*")
      .single(),
    "Khong the luu product media.",
  );

  return {
    ...media,
    public_id: upload.publicId || upload.path || "",
  };
}

function formatProductMediaRow(row) {
  return {
    ...row,
    public_id: row.path || "",
  };
}

async function handleProductMediaList(supabase, config) {
  const limit = Math.max(1, Math.min(50, asNumber(getQueryValue(config, "limit", 18), 18)));
  const nextCursor = getQueryValue(config, "next_cursor", "");

  let query = supabase
    .from("product_media")
    .select("*")
    .order("id", { ascending: false })
    .limit(limit);

  if (nextCursor) {
    query = query.lt("id", Number(nextCursor));
  }

  const rows = await unwrap(query, "Khong the doc product media.");
  const cursor = rows.length === limit ? rows[rows.length - 1]?.id || null : null;

  return {
    data: rows.map(formatProductMediaRow),
    next_cursor: cursor,
  };
}

async function handleContentStructuresList(supabase) {
  return listContentStructures(supabase);
}

async function handleCreateContentStructure(supabase, payload) {
  const row = await unwrap(
    supabase
      .from("content_structures")
      .insert({
        name: ensureText(payload?.name),
        slug: ensureText(payload?.slug),
      })
      .select("*")
      .single(),
    "Khong the tao content structure.",
  );

  return formatContentStructureRow(row, []);
}

async function handleUpdateContentStructure(supabase, structureId, payload) {
  const row = await unwrap(
    supabase
      .from("content_structures")
      .update({
        name: ensureText(payload?.name),
        slug: ensureText(payload?.slug),
        updated_at: new Date().toISOString(),
      })
      .eq("id", structureId)
      .select("*")
      .single(),
    "Khong the cap nhat content structure.",
  );

  const fields = await unwrap(
    supabase.from("content_fields").select("*").eq("content_structure_id", structureId),
    "Khong the doc fields cua structure.",
  );

  return formatContentStructureRow(row, fields);
}

async function handleDeleteContentStructure(supabase, structureId) {
  await unwrap(
    supabase.from("content_fields").delete().eq("content_structure_id", structureId),
    "Khong the xoa content fields.",
  );
  await unwrap(
    supabase.from("products").update({ content_structure_id: null }).eq("content_structure_id", structureId),
    "Khong the tach products khoi structure da xoa.",
  );
  await unwrap(
    supabase.from("content_structures").delete().eq("id", structureId),
    "Khong the xoa content structure.",
  );
  return { success: true };
}

async function handleCreateContentField(supabase, structureId, payload) {
  const existingFields = await unwrap(
    supabase.from("content_fields").select("sort_order").eq("content_structure_id", structureId),
    "Khong the doc thu tu field hien tai.",
  );
  const nextSortOrder =
    existingFields.reduce((max, field) => Math.max(max, asNumber(field.sort_order)), 0) + 1;

  return unwrap(
    supabase
      .from("content_fields")
      .insert({
        content_structure_id: structureId,
        name: ensureText(payload?.name),
        slug: ensureText(payload?.slug),
        type: ensureText(payload?.type, "single_line"),
        required: normalizeBoolean(payload?.required),
        description: ensureText(payload?.description),
        options: ensureArray(payload?.options),
        sort_order: nextSortOrder,
      })
      .select("*")
      .single(),
    "Khong the tao content field.",
  );
}

async function handleUpdateContentField(supabase, fieldId, payload) {
  return unwrap(
    supabase
      .from("content_fields")
      .update({
        name: ensureText(payload?.name),
        slug: ensureText(payload?.slug),
        type: ensureText(payload?.type, "single_line"),
        required: normalizeBoolean(payload?.required),
        description: ensureText(payload?.description),
        options: ensureArray(payload?.options),
        updated_at: new Date().toISOString(),
      })
      .eq("id", fieldId)
      .select("*")
      .single(),
    "Khong the cap nhat content field.",
  );
}

async function handleDeleteContentField(supabase, fieldId) {
  await unwrap(
    supabase.from("content_fields").delete().eq("id", fieldId),
    "Khong the xoa content field.",
  );
  return { success: true };
}

async function handleReorderContentFields(supabase, structureId, payload) {
  const orders = ensureArray(payload?.orders);

  await Promise.all(
    orders.map((item) =>
      unwrap(
        supabase
          .from("content_fields")
          .update({ sort_order: asNumber(item?.sort_order) })
          .eq("id", item?.id)
          .eq("content_structure_id", structureId),
        "Khong the cap nhat thu tu content field.",
      ),
    ),
  );

  return { success: true };
}

async function handlePaymentSettingsGet(supabase) {
  return ensurePaymentSettingsRow(supabase);
}

async function handlePaymentSettingsPatch(supabase, payload) {
  const current = await ensurePaymentSettingsRow(supabase);
  return unwrap(
    supabase
      .from("payment_settings")
      .update({
        bank_name: ensureText(payload?.bank_name),
        account_name: ensureText(payload?.account_name),
        account_number: ensureText(payload?.account_number),
        qr_image: ensureText(payload?.qr_image),
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .select("*")
      .single(),
    "Khong the cap nhat payment settings.",
  );
}

async function handleAppSettingsGet(supabase) {
  return ensureAppSettingsRow(supabase);
}

async function handleAppSettingsPatch(supabase, payload) {
  const current = await ensureAppSettingsRow(supabase);
  return unwrap(
    supabase
      .from("app_settings")
      .update({
        theme: ensureText(payload?.theme, DEFAULT_APP_SETTINGS_ROW.theme),
        logo_url: ensureText(payload?.logo_url),
        logo_text: ensureText(payload?.logo_text, DEFAULT_APP_SETTINGS_ROW.logo_text),
        brand_name: ensureText(payload?.brand_name, DEFAULT_APP_SETTINGS_ROW.brand_name),
        font_family: ensureText(payload?.font_family, DEFAULT_APP_SETTINGS_ROW.font_family),
        font_sizes: payload?.font_sizes || DEFAULT_APP_SETTINGS_ROW.font_sizes,
        sidebar_color: ensureText(payload?.sidebar_color, DEFAULT_APP_SETTINGS_ROW.sidebar_color),
        sidebar_custom_from: ensureText(
          payload?.sidebar_custom_from,
          DEFAULT_APP_SETTINGS_ROW.sidebar_custom_from,
        ),
        sidebar_custom_to: ensureText(
          payload?.sidebar_custom_to,
          DEFAULT_APP_SETTINGS_ROW.sidebar_custom_to,
        ),
        sidebar_active_color: ensureText(
          payload?.sidebar_active_color,
          DEFAULT_APP_SETTINGS_ROW.sidebar_active_color,
        ),
        accent_color: ensureText(payload?.accent_color, DEFAULT_APP_SETTINGS_ROW.accent_color),
        border_radius: ensureText(
          payload?.border_radius,
          DEFAULT_APP_SETTINGS_ROW.border_radius,
        ),
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .select("*")
      .single(),
    "Khong the cap nhat app settings.",
  );
}

async function handleCustomerRankSettingsGet(supabase) {
  const settings = await ensureAppSettingsRow(supabase);
  return {
    rules: ensureArray(settings.customer_rank_rules).length
      ? settings.customer_rank_rules
      : DEFAULT_CUSTOMER_RANK_RULES,
    point_exchange_amount: asNumber(
      settings.point_exchange_amount,
      DEFAULT_APP_SETTINGS_ROW.point_exchange_amount,
    ),
  };
}

async function handleCustomerRankSettingsPatch(supabase, payload) {
  const current = await ensureAppSettingsRow(supabase);
  const rules = ensureArray(payload?.rules)
    .map((rule) => ({
      name: ensureText(rule?.name),
      min_points: sanitizePoints(rule?.min_points),
    }))
    .filter((rule) => rule.name)
    .sort((left, right) => left.min_points - right.min_points);

  const updated = await unwrap(
    supabase
      .from("app_settings")
      .update({
        customer_rank_rules: rules,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .select("*")
      .single(),
    "Khong the cap nhat customer rank settings.",
  );

  const customers = await unwrap(
    supabase.from("customers").select("*"),
    "Khong the doc customers de cap nhat rank.",
  );

  await Promise.all(
    customers.map((customer) =>
      unwrap(
        supabase
          .from("customers")
          .update({
            rank: resolveCustomerRank(customer.loyalty_points, rules),
            updated_at: new Date().toISOString(),
          })
          .eq("id", customer.id),
        "Khong the dong bo rank cho customer.",
      ),
    ),
  );

  return {
    rules: updated.customer_rank_rules,
    point_exchange_amount: updated.point_exchange_amount,
  };
}

async function handleCustomerPointSettingsPatch(supabase, payload) {
  const current = await ensureAppSettingsRow(supabase);
  const updated = await unwrap(
    supabase
      .from("app_settings")
      .update({
        point_exchange_amount: asNumber(
          payload?.point_exchange_amount,
          DEFAULT_APP_SETTINGS_ROW.point_exchange_amount,
        ),
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .select("*")
      .single(),
    "Khong the cap nhat point settings.",
  );

  return {
    point_exchange_amount: updated.point_exchange_amount,
  };
}

async function handleCreateCustomer(supabase, payload) {
  const phone = normalizePhone(payload?.phone);
  const name = ensureText(payload?.name);
  const address = ensureText(payload?.address);
  const loyaltyPoints = sanitizePoints(payload?.loyalty_points);
  const settings = await ensureAppSettingsRow(supabase);
  const rank = resolveCustomerRank(loyaltyPoints, settings.customer_rank_rules);

  const duplicate = await unwrap(
    supabase.from("customers").select("id").eq("phone", phone).maybeSingle(),
    "Khong the kiem tra so dien thoai khach hang.",
  );

  if (duplicate) {
    throw new ApiError("So dien thoai da ton tai.", 422, {
      errors: { phone: ["So dien thoai da ton tai"] },
    });
  }

  const customer = await unwrap(
    supabase
      .from("customers")
      .insert({
        name,
        phone,
        address,
        loyalty_points: loyaltyPoints,
        rank,
      })
      .select("*")
      .single(),
    "Khong the tao customer.",
  );

  return formatCustomerRow(customer);
}

async function handleUpdateCustomer(supabase, customerId, payload) {
  const phone = normalizePhone(payload?.phone);
  const name = ensureText(payload?.name);
  const address = ensureText(payload?.address);
  const loyaltyPoints = sanitizePoints(payload?.loyalty_points);
  const settings = await ensureAppSettingsRow(supabase);
  const rank = resolveCustomerRank(loyaltyPoints, settings.customer_rank_rules);

  const duplicate = await unwrap(
    supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .neq("id", customerId)
      .maybeSingle(),
    "Khong the kiem tra so dien thoai khi cap nhat customer.",
  );

  if (duplicate) {
    throw new ApiError("So dien thoai da ton tai.", 422, {
      errors: { phone: ["So dien thoai da ton tai"] },
    });
  }

  const customer = await unwrap(
    supabase
      .from("customers")
      .update({
        name,
        phone,
        address,
        loyalty_points: loyaltyPoints,
        rank,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .select("*")
      .single(),
    "Khong the cap nhat customer.",
  );

  return formatCustomerRow(customer);
}

async function handleDeleteCustomer(supabase, customerId) {
  await unwrap(
    supabase.from("cart_items").delete().eq("customer_id", customerId),
    "Khong the xoa gio hang cua customer.",
  );
  await unwrap(
    supabase.from("conversations").delete().eq("customer_id", customerId),
    "Khong the xoa conversations cua customer.",
  );
  await unwrap(
    supabase.from("orders").update({ customer_id: null }).eq("customer_id", customerId),
    "Khong the cap nhat orders cua customer da xoa.",
  );
  await unwrap(
    supabase.from("customers").delete().eq("id", customerId),
    "Khong the xoa customer.",
  );
  return { success: true };
}

async function handleOrdersList(supabase) {
  return listOrders(supabase);
}

async function handleOrderDetail(supabase, orderId) {
  const orders = await listOrders(supabase);
  const order = orders.find((item) => String(item.id) === String(orderId));

  if (!order) {
    throw new ApiError("Khong tim thay don hang.", 404);
  }

  return order;
}

async function handleCreateOrder(supabase, payload) {
  const items = ensureArray(payload?.items);

  if (items.length === 0) {
    throw new ApiError("Don hang phai co it nhat mot san pham.", 422);
  }

  const productIds = items.map((item) => Number(item.productId)).filter(Boolean);
  const products = await unwrap(
    supabase.from("products").select("*").in("id", productIds),
    "Khong the doc products de tao don hang.",
  );
  const productMap = new Map(products.map((product) => [product.id, product]));

  items.forEach((item) => {
    const product = productMap.get(Number(item.productId));
    if (!product) {
      throw new ApiError("Co san pham khong ton tai trong don.", 422);
    }
    if (asNumber(item.qty) > asNumber(product.quantity)) {
      throw new ApiError(`San pham "${product.name}" khong du ton kho.`, 422);
    }
  });

  const customer =
    payload?.customerId
      ? await unwrap(
          supabase
            .from("customers")
            .select("*")
            .eq("id", payload.customerId)
            .maybeSingle(),
          "Khong the doc customer cua don hang.",
        )
      : null;

  const totals = payload?.totals || {};
  const payment = payload?.payment || {};
  const totalAmount = asNumber(totals.total);
  const paidAmount =
    ensureText(payload?.paymentMethod) === "cash"
      ? asNumber(payment.cashReceived)
      : totalAmount;
  const dueAmount = Math.max(0, totalAmount - paidAmount);
  const paymentStatus = calculatePaymentStatus(totalAmount, paidAmount);

  const insertedOrder = await unwrap(
    supabase
      .from("orders")
      .insert({
        order_no: "",
        customer_id: payload?.customerId || null,
        customer_name: customer?.name || "Khach le",
        staff_id: payload?.staffId || null,
        note: ensureText(payload?.note),
        subtotal: asNumber(totals.subtotal),
        discount: asNumber(totals.discount),
        total_amount: totalAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        payment_method: ensureText(payload?.paymentMethod, "cash"),
        payment_status: paymentStatus,
        cash_received: payload?.paymentMethod === "cash" ? paidAmount : 0,
        change_amount: asNumber(payment.changeAmount),
      })
      .select("*")
      .single(),
    "Khong the tao order.",
  );

  const orderNo = buildOrderCode(insertedOrder.id);
  await unwrap(
    supabase
      .from("orders")
      .update({ order_no: orderNo, updated_at: new Date().toISOString() })
      .eq("id", insertedOrder.id),
    "Khong the cap nhat ma don hang.",
  );

  const orderItems = items.map((item) => {
    const product = productMap.get(Number(item.productId));
    return {
      order_id: insertedOrder.id,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      qty: asNumber(item.qty, 1),
      price: asNumber(item.price, product.price),
      line_total: asNumber(item.qty, 1) * asNumber(item.price, product.price),
      note: ensureText(item.note),
    };
  });

  await unwrap(
    supabase.from("order_items").insert(orderItems),
    "Khong the tao order items.",
  );

  await Promise.all(
    items.map((item) => {
      const product = productMap.get(Number(item.productId));
      return unwrap(
        supabase
          .from("products")
          .update({
            quantity: Math.max(0, asNumber(product.quantity) - asNumber(item.qty, 1)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id),
        "Khong the cap nhat ton kho san pham.",
      );
    }),
  );

  let earnedPoints = 0;
  if (customer) {
    const settings = await ensureAppSettingsRow(supabase);
    const pointExchangeAmount = asNumber(
      settings.point_exchange_amount,
      DEFAULT_APP_SETTINGS_ROW.point_exchange_amount,
    );
    earnedPoints = pointExchangeAmount > 0
      ? Math.floor(totalAmount / pointExchangeAmount)
      : 0;
    const loyaltyPoints = sanitizePoints(customer.loyalty_points) + earnedPoints;
    await unwrap(
      supabase
        .from("customers")
        .update({
          loyalty_points: loyaltyPoints,
          rank: resolveCustomerRank(loyaltyPoints, settings.customer_rank_rules),
          updated_at: new Date().toISOString(),
        })
        .eq("id", customer.id),
      "Khong the cap nhat diem khach hang.",
    );
  }

  return {
    order_no: orderNo,
    earned_points: earnedPoints,
  };
}

function resolveRecipientIds(mode, allUsers, rolesMap, payload) {
  if (mode === "all") {
    return allUsers.map((user) => user.id);
  }

  if (mode === "role") {
    const selectedRoleIds = new Set(
      ensureArray(payload?.roleIds).map((value) => Number(value)).filter(Boolean),
    );

    return allUsers
      .filter((user) => ensureArray(rolesMap.get(user.id)).some((role) => selectedRoleIds.has(role.id)))
      .map((user) => user.id);
  }

  return ensureArray(payload?.userIds).map((value) => Number(value)).filter(Boolean);
}

async function handleNotificationsList(supabase, currentUser) {
  const [notifications, receipts] = await Promise.all([
    unwrap(
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      "Khong the doc notifications cho user.",
    ),
    unwrap(
      supabase
        .from("notification_receipts")
        .select("*")
        .eq("user_id", currentUser.id),
      "Khong the doc notification receipts cua user.",
    ),
  ]);
  const receiptMap = new Map(receipts.map((receipt) => [receipt.notification_id, receipt]));
  const likeCounts = groupBy(
    await unwrap(
      supabase.from("notification_receipts").select("notification_id, is_liked"),
      "Khong the tinh so luot thich notification.",
    ),
    (receipt) => receipt.notification_id,
  );

  return notifications
    .filter((notification) => receiptMap.has(notification.id))
    .map((notification) =>
      formatNotificationForUser(
        {
          ...notification,
          like_count: ensureArray(likeCounts.get(notification.id)).filter((receipt) =>
            normalizeBoolean(receipt.is_liked),
          ).length,
        },
        receiptMap.get(notification.id),
      ),
    );
}

async function handleNotificationsAdminList(supabase) {
  const { notifications, receiptsByNotification } = await listNotificationsWithReceipts(supabase);
  return notifications.map((notification) =>
    formatNotificationForAdmin(
      notification,
      ensureArray(receiptsByNotification.get(notification.id)),
    ),
  );
}

async function handleCreateNotification(supabase, currentUser, payload) {
  const users = await unwrap(
    supabase.from("admin_users").select("id"),
    "Khong the doc users de gui notification.",
  );
  const rolesMap = await fetchUserRolesMap(
    supabase,
    users.map((user) => user.id),
  );
  const recipientType = payload?.sendToAll
    ? "all"
    : ensureArray(payload?.roleIds).length > 0
      ? "role"
      : "user";
  const recipientIds = resolveRecipientIds(recipientType, users, rolesMap, payload);

  const notification = await unwrap(
    supabase
      .from("notifications")
      .insert({
        message: ensureText(payload?.message),
        type: ensureText(payload?.type, "info"),
        recipient_type: recipientType,
        recipient_ids:
          recipientType === "all"
            ? []
            : recipientType === "role"
              ? ensureArray(payload?.roleIds)
              : ensureArray(payload?.userIds),
        created_by: currentUser.id,
      })
      .select("*")
      .single(),
    "Khong the tao notification.",
  );

  if (recipientIds.length > 0) {
    await unwrap(
      supabase.from("notification_receipts").insert(
        recipientIds.map((userId) => ({
          notification_id: notification.id,
          user_id: userId,
          is_read: false,
          is_liked: false,
        })),
      ),
      "Khong the tao notification receipts.",
    );
  }

  return notification;
}

async function handleUpdateNotification(supabase, notificationId, payload) {
  const users = await unwrap(
    supabase.from("admin_users").select("id"),
    "Khong the doc users de cap nhat notification.",
  );
  const rolesMap = await fetchUserRolesMap(
    supabase,
    users.map((user) => user.id),
  );
  const recipientType = payload?.sendToAll
    ? "all"
    : ensureArray(payload?.roleIds).length > 0
      ? "role"
      : "user";
  const recipientIds = resolveRecipientIds(recipientType, users, rolesMap, payload);

  await unwrap(
    supabase
      .from("notifications")
      .update({
        message: ensureText(payload?.message),
        type: ensureText(payload?.type, "info"),
        recipient_type: recipientType,
        recipient_ids:
          recipientType === "all"
            ? []
            : recipientType === "role"
              ? ensureArray(payload?.roleIds)
              : ensureArray(payload?.userIds),
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId),
    "Khong the cap nhat notification.",
  );
  await unwrap(
    supabase.from("notification_receipts").delete().eq("notification_id", notificationId),
    "Khong the xoa notification receipts cu.",
  );

  if (recipientIds.length > 0) {
    await unwrap(
      supabase.from("notification_receipts").insert(
        recipientIds.map((userId) => ({
          notification_id: notificationId,
          user_id: userId,
          is_read: false,
          is_liked: false,
        })),
      ),
      "Khong the tao notification receipts moi.",
    );
  }

  return { success: true };
}

async function handleDeleteNotification(supabase, notificationId) {
  await unwrap(
    supabase.from("notification_receipts").delete().eq("notification_id", notificationId),
    "Khong the xoa notification receipts.",
  );
  await unwrap(
    supabase.from("notifications").delete().eq("id", notificationId),
    "Khong the xoa notification.",
  );
  return { success: true };
}

async function handleNotificationUnreadCount(supabase, currentUser) {
  const receipts = await unwrap(
    supabase
      .from("notification_receipts")
      .select("id, is_read")
      .eq("user_id", currentUser.id),
    "Khong the doc unread notifications.",
  );

  return {
    count: receipts.filter((receipt) => !normalizeBoolean(receipt.is_read)).length,
  };
}

async function handleNotificationMarkRead(supabase, currentUser, notificationId) {
  await unwrap(
    supabase
      .from("notification_receipts")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("notification_id", notificationId)
      .eq("user_id", currentUser.id),
    "Khong the danh dau notification da doc.",
  );

  return { success: true };
}

async function handleNotificationsMarkAllRead(supabase, currentUser) {
  await unwrap(
    supabase
      .from("notification_receipts")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", currentUser.id),
    "Khong the danh dau tat ca notifications da doc.",
  );

  return { success: true };
}

async function handleNotificationToggleLike(supabase, currentUser, notificationId) {
  const receipt = await unwrap(
    supabase
      .from("notification_receipts")
      .select("*")
      .eq("notification_id", notificationId)
      .eq("user_id", currentUser.id)
      .maybeSingle(),
    "Khong the doc receipt de thich notification.",
  );

  if (!receipt) {
    throw new ApiError("Thong bao khong ton tai trong hop thu cua ban.", 404);
  }

  const nextLiked = !normalizeBoolean(receipt.is_liked);
  await unwrap(
    supabase
      .from("notification_receipts")
      .update({
        is_liked: nextLiked,
        liked_at: nextLiked ? new Date().toISOString() : null,
      })
      .eq("id", receipt.id),
    "Khong the cap nhat like notification.",
  );

  const allReceipts = await unwrap(
    supabase
      .from("notification_receipts")
      .select("is_liked")
      .eq("notification_id", notificationId),
    "Khong the tinh tong like notification.",
  );

  return {
    isLiked: nextLiked,
    likeCount: allReceipts.filter((item) => normalizeBoolean(item.is_liked)).length,
  };
}

async function handleNotificationLikers(supabase, notificationId) {
  const [receipts, users] = await Promise.all([
    unwrap(
      supabase
        .from("notification_receipts")
        .select("*")
        .eq("notification_id", notificationId)
        .eq("is_liked", true),
      "Khong the doc danh sach likes notification.",
    ),
    unwrap(
      supabase.from("admin_users").select("id, name, email"),
      "Khong the doc users cho danh sach likes.",
    ),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));

  return receipts
    .map((receipt) => ({
      id: receipt.id,
      name: userMap.get(receipt.user_id)?.name || "User",
      email: userMap.get(receipt.user_id)?.email || "",
      likedAt: receipt.liked_at || receipt.updated_at || receipt.created_at,
    }))
    .sort((left, right) => new Date(right.likedAt).getTime() - new Date(left.likedAt).getTime());
}

async function handleChatConversations(supabase) {
  return listConversationsWithMessages(supabase);
}

async function handleChatMessages(supabase, conversationId) {
  return fetchConversationMessages(supabase, conversationId, true);
}

async function handleChatSendMessage(supabase, currentUser, payload) {
  const conversationId = Number(payload?.conversationId);
  if (!conversationId || !ensureText(payload?.message)) {
    throw new ApiError("Tin nhan khong hop le.", 422);
  }

  const inserted = await unwrap(
    supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "user",
        sender_user_id: currentUser.id,
        sender_customer_id: null,
        message: ensureText(payload?.message),
        is_read: false,
      })
      .select("*")
      .single(),
    "Khong the gui tin nhan admin.",
  );

  await unwrap(
    supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId),
    "Khong the cap nhat thoi gian hoi thoai.",
  );

  const messages = await fetchConversationMessages(supabase, conversationId, false);
  return messages.find((message) => String(message.id) === String(inserted.id)) || null;
}

async function handleChatUpdateMessage(supabase, currentUser, messageId, payload) {
  const existing = await unwrap(
    supabase.from("messages").select("*").eq("id", messageId).maybeSingle(),
    "Khong the doc tin nhan can sua.",
  );

  if (!existing || existing.sender_type !== "user" || existing.sender_user_id !== currentUser.id) {
    throw new ApiError("Ban khong the sua tin nhan nay.", 403);
  }

  const updated = await unwrap(
    supabase
      .from("messages")
      .update({
        message: ensureText(payload?.message),
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select("*")
      .single(),
    "Khong the cap nhat tin nhan.",
  );

  const messages = await fetchConversationMessages(supabase, updated.conversation_id, false);
  return messages.find((message) => String(message.id) === String(updated.id)) || null;
}

async function handleChatDeleteMessage(supabase, currentUser, messageId) {
  const existing = await unwrap(
    supabase.from("messages").select("*").eq("id", messageId).maybeSingle(),
    "Khong the doc tin nhan can xoa.",
  );

  if (!existing) {
    throw new ApiError("Khong tim thay tin nhan.", 404);
  }

  if (existing.sender_type !== "user" || existing.sender_user_id !== currentUser.id) {
    throw new ApiError("Ban khong the xoa tin nhan nay.", 403);
  }

  await unwrap(
    supabase.from("messages").delete().eq("id", messageId),
    "Khong the xoa tin nhan.",
  );
  return { success: true };
}

async function handleChatDeleteConversation(supabase, conversationId) {
  await unwrap(
    supabase.from("messages").delete().eq("conversation_id", conversationId),
    "Khong the xoa cac tin nhan trong hoi thoai.",
  );
  await unwrap(
    supabase.from("conversations").delete().eq("id", conversationId),
    "Khong the xoa hoi thoai.",
  );
  return { success: true };
}

async function handleChatUnreadCount(supabase) {
  const messages = await unwrap(
    supabase
      .from("messages")
      .select("id")
      .eq("sender_type", "customer")
      .eq("is_read", false),
    "Khong the tinh unread chat count.",
  );

  return { count: messages.length };
}

async function handleUploadFieldImage(getSupabase, env, payload) {
  const upload = await uploadImageFile(
    getSupabase,
    env,
    payload?.get?.("image") || payload?.image,
    "content-fields",
  );

  return { url: upload.url };
}

export function createAdminAxiosClient({ createClient, env }) {
  const getSupabase = createSupabaseGetter(createClient, env);

  async function request(method, path, payload, config) {
    try {
      const supabase = getSupabase();
      const clean = cleanPath(path);
      const upperMethod = String(method || "GET").toUpperCase();

      if (upperMethod === "POST" && clean === "/login") {
        return ok(await handleAdminLogin(supabase, payload));
      }

      if (upperMethod === "POST" && clean === "/logout") {
        return ok(await handleLogout(supabase));
      }

      if (upperMethod === "GET" && clean === "/me") {
        return ok(await handleMe(supabase));
      }

      const currentUser = await resolveCurrentAdminUser(supabase, { touch: true });

      if (upperMethod === "PATCH" && clean === "/me/avatar") {
        return ok(await handleUpdateAvatar(supabase, currentUser, payload));
      }

      if (upperMethod === "GET" && clean === "/users") {
        assertPermission(currentUser, ["user.view"]);
        return ok({ data: await handleUsersList(supabase) });
      }

      if (upperMethod === "POST" && clean === "/users") {
        assertPermission(currentUser, ["user.create"]);
        return ok({ data: await handleCreateUser(supabase, payload) });
      }

      const userPatchMatch = clean.match(/^\/users\/(\d+)$/);
      if (userPatchMatch && upperMethod === "PATCH") {
        assertPermission(currentUser, ["user.update"]);
        return ok({
          data: await handleUpdateUser(supabase, Number(userPatchMatch[1]), payload),
        });
      }

      const userDeleteMatch = clean.match(/^\/users\/(\d+)$/);
      if (userDeleteMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["user.delete"]);
        return ok(await handleDeleteUser(supabase, Number(userDeleteMatch[1])));
      }

      const userRoleMatch = clean.match(/^\/users\/(\d+)\/roles$/);
      if (userRoleMatch && upperMethod === "PUT") {
        assertPermission(currentUser, ["user.update"]);
        return ok({
          data: await handleUpdateUserRoles(supabase, Number(userRoleMatch[1]), payload),
        });
      }

      if (upperMethod === "GET" && clean === "/roles") {
        assertPermission(currentUser, ["role.view"]);
        return ok({ data: await handleRolesList(supabase) });
      }

      if (upperMethod === "POST" && clean === "/roles") {
        assertPermission(currentUser, ["role.create"]);
        return ok({ data: await handleCreateRole(supabase, payload) });
      }

      const roleMatch = clean.match(/^\/roles\/(\d+)$/);
      if (roleMatch && upperMethod === "PUT") {
        assertPermission(currentUser, ["role.update"]);
        return ok(await handleUpdateRole(supabase, Number(roleMatch[1]), payload));
      }
      if (roleMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["role.delete"]);
        return ok(await handleDeleteRole(supabase, Number(roleMatch[1])));
      }

      if (upperMethod === "GET" && clean === "/permissions") {
        assertPermission(currentUser, ["role.view"]);
        return ok({ data: await handlePermissionsList(supabase) });
      }

      if (upperMethod === "GET" && clean === "/products") {
        assertPermission(currentUser, ["product.view"]);
        return ok({ data: await handleProductsList(supabase) });
      }

      if (upperMethod === "POST" && clean === "/products") {
        assertPermission(currentUser, ["product.create"]);
        return ok({ data: await handleCreateProduct(supabase, payload) });
      }

      const productMatch = clean.match(/^\/products\/(\d+)$/);
      if (productMatch && upperMethod === "PATCH") {
        assertPermission(currentUser, ["product.update"]);
        return ok({
          data: await handleUpdateProduct(supabase, Number(productMatch[1]), payload),
        });
      }
      if (productMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["product.delete"]);
        return ok(await handleDeleteProduct(supabase, Number(productMatch[1])));
      }

      if (upperMethod === "GET" && clean === "/discounts") {
        assertPermission(currentUser, ["discount.view"]);
        return ok({ data: await handleDiscountsList(supabase) });
      }

      if (upperMethod === "POST" && clean === "/discounts") {
        assertPermission(currentUser, ["discount.create"]);
        return ok({ data: await handleCreateDiscount(supabase, payload) });
      }

      const discountMatch = clean.match(/^\/discounts\/(\d+)$/);
      if (discountMatch && upperMethod === "PATCH") {
        assertPermission(currentUser, ["discount.update"]);
        return ok({
          data: await handleUpdateDiscount(supabase, Number(discountMatch[1]), payload),
        });
      }
      if (discountMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["discount.delete"]);
        return ok(await handleDeleteDiscount(supabase, Number(discountMatch[1])));
      }

      if (upperMethod === "GET" && clean === "/product-media") {
        return ok(await handleProductMediaList(supabase, config));
      }

      if (upperMethod === "POST" && clean === "/product-media") {
        return ok({
          data: await handleProductMediaUpload(getSupabase, env, currentUser, payload),
        });
      }

      if (upperMethod === "GET" && clean === "/content-structures") {
        assertPermission(currentUser, ["content.view", "product.view", "pos.access"]);
        return ok({ data: await handleContentStructuresList(supabase) });
      }

      if (upperMethod === "POST" && clean === "/content-structures") {
        assertPermission(currentUser, ["content.create"]);
        return ok({ data: await handleCreateContentStructure(supabase, payload) });
      }

      const structureMatch = clean.match(/^\/content-structures\/(\d+)$/);
      if (structureMatch && upperMethod === "PUT") {
        assertPermission(currentUser, ["content.update"]);
        return ok({
          data: await handleUpdateContentStructure(
            supabase,
            Number(structureMatch[1]),
            payload,
          ),
        });
      }
      if (structureMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["content.delete"]);
        return ok(await handleDeleteContentStructure(supabase, Number(structureMatch[1])));
      }

      const fieldCreateMatch = clean.match(/^\/content-structures\/(\d+)\/fields$/);
      if (fieldCreateMatch && upperMethod === "POST") {
        assertPermission(currentUser, ["content.create"]);
        return ok({
          data: await handleCreateContentField(
            supabase,
            Number(fieldCreateMatch[1]),
            payload,
          ),
        });
      }

      const fieldUpdateMatch = clean.match(/^\/content-structures\/(\d+)\/fields\/(\d+)$/);
      if (fieldUpdateMatch && upperMethod === "PUT") {
        assertPermission(currentUser, ["content.update"]);
        return ok({
          data: await handleUpdateContentField(
            supabase,
            Number(fieldUpdateMatch[2]),
            payload,
          ),
        });
      }
      if (fieldUpdateMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["content.delete"]);
        return ok(await handleDeleteContentField(supabase, Number(fieldUpdateMatch[2])));
      }

      const reorderMatch = clean.match(/^\/content-structures\/(\d+)\/fields-reorder$/);
      if (reorderMatch && upperMethod === "POST") {
        assertPermission(currentUser, ["content.update"]);
        return ok({
          data: await handleReorderContentFields(
            supabase,
            Number(reorderMatch[1]),
            payload,
          ),
        });
      }

      if (upperMethod === "GET" && clean === "/payment-settings") {
        assertPermission(currentUser, ["payment.view"]);
        return ok({ data: await handlePaymentSettingsGet(supabase) });
      }
      if (upperMethod === "PATCH" && clean === "/payment-settings") {
        assertPermission(currentUser, ["payment.update"]);
        return ok({ data: await handlePaymentSettingsPatch(supabase, payload) });
      }

      if (upperMethod === "GET" && clean === "/app-settings") {
        return ok({ data: await handleAppSettingsGet(supabase) });
      }
      if (upperMethod === "PATCH" && clean === "/app-settings") {
        return ok({ data: await handleAppSettingsPatch(supabase, payload) });
      }

      if (upperMethod === "GET" && clean === "/customers") {
        assertPermission(currentUser, ["customer.view", "pos.access"]);
        return ok({
          data: await listCustomers(supabase, getQueryValue(config, "q", "")),
        });
      }
      if (upperMethod === "POST" && clean === "/customers") {
        assertPermission(currentUser, ["customer.create", "pos.access"]);
        return ok({ data: await handleCreateCustomer(supabase, payload) });
      }

      if (upperMethod === "GET" && clean === "/customers/rank-settings") {
        assertPermission(currentUser, ["customer.view", "pos.access"]);
        return ok({ data: await handleCustomerRankSettingsGet(supabase) });
      }
      if (upperMethod === "PATCH" && clean === "/customers/rank-settings") {
        assertPermission(currentUser, ["customer.update"]);
        return ok({ data: await handleCustomerRankSettingsPatch(supabase, payload) });
      }
      if (upperMethod === "PATCH" && clean === "/customers/point-settings") {
        assertPermission(currentUser, ["customer.update"]);
        return ok({ data: await handleCustomerPointSettingsPatch(supabase, payload) });
      }

      const customerMatch = clean.match(/^\/customers\/(\d+)$/);
      if (customerMatch && upperMethod === "PATCH") {
        assertPermission(currentUser, ["customer.update"]);
        return ok({
          data: await handleUpdateCustomer(supabase, Number(customerMatch[1]), payload),
        });
      }
      if (customerMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["customer.delete"]);
        return ok(await handleDeleteCustomer(supabase, Number(customerMatch[1])));
      }

      if (upperMethod === "GET" && clean === "/orders") {
        assertPermission(currentUser, ["order.view", "pos.access"]);
        return ok({ data: await handleOrdersList(supabase) });
      }
      if (upperMethod === "POST" && clean === "/orders") {
        assertPermission(currentUser, ["order.create", "pos.access"]);
        return ok({ data: await handleCreateOrder(supabase, payload) });
      }

      const orderMatch = clean.match(/^\/orders\/(\d+)$/);
      if (orderMatch && upperMethod === "GET") {
        assertPermission(currentUser, ["order.view"]);
        return ok({ data: await handleOrderDetail(supabase, Number(orderMatch[1])) });
      }

      if (upperMethod === "GET" && clean === "/notifications") {
        assertPermission(currentUser, ["notification.view"]);
        return ok({ data: await handleNotificationsList(supabase, currentUser) });
      }
      if (upperMethod === "GET" && clean === "/notifications/all") {
        assertPermission(currentUser, ["notification.view"]);
        return ok({ data: await handleNotificationsAdminList(supabase) });
      }
      if (upperMethod === "GET" && clean === "/notifications/unread-count") {
        assertPermission(currentUser, ["notification.view"]);
        return ok(await handleNotificationUnreadCount(supabase, currentUser));
      }
      if (upperMethod === "POST" && clean === "/notifications") {
        assertPermission(currentUser, ["notification.create"]);
        return ok({ data: await handleCreateNotification(supabase, currentUser, payload) });
      }
      if (upperMethod === "POST" && clean === "/notifications/mark-all-read") {
        assertPermission(currentUser, ["notification.view"]);
        return ok(await handleNotificationsMarkAllRead(supabase, currentUser));
      }

      const notificationReadMatch = clean.match(/^\/notifications\/(\d+)\/read$/);
      if (notificationReadMatch && upperMethod === "PATCH") {
        assertPermission(currentUser, ["notification.view"]);
        return ok(
          await handleNotificationMarkRead(
            supabase,
            currentUser,
            Number(notificationReadMatch[1]),
          ),
        );
      }

      const notificationLikeMatch = clean.match(/^\/notifications\/(\d+)\/like$/);
      if (notificationLikeMatch && upperMethod === "POST") {
        assertPermission(currentUser, ["notification.view"]);
        return ok(
          await handleNotificationToggleLike(
            supabase,
            currentUser,
            Number(notificationLikeMatch[1]),
          ),
        );
      }

      const notificationLikersMatch = clean.match(/^\/notifications\/(\d+)\/likers$/);
      if (notificationLikersMatch && upperMethod === "GET") {
        assertPermission(currentUser, ["notification.view"]);
        return ok({
          data: await handleNotificationLikers(
            supabase,
            Number(notificationLikersMatch[1]),
          ),
        });
      }

      const notificationMatch = clean.match(/^\/notifications\/(\d+)$/);
      if (notificationMatch && upperMethod === "PATCH") {
        assertPermission(currentUser, ["notification.update"]);
        return ok(
          await handleUpdateNotification(supabase, Number(notificationMatch[1]), payload),
        );
      }
      if (notificationMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["notification.delete"]);
        return ok(await handleDeleteNotification(supabase, Number(notificationMatch[1])));
      }

      if (upperMethod === "GET" && clean === "/chat/conversations") {
        assertPermission(currentUser, ["chat.view"]);
        return ok({ data: await handleChatConversations(supabase) });
      }

      const chatMessagesMatch = clean.match(/^\/chat\/conversations\/(\d+)\/messages$/);
      if (chatMessagesMatch && upperMethod === "GET") {
        assertPermission(currentUser, ["chat.view"]);
        return ok({
          data: await handleChatMessages(supabase, Number(chatMessagesMatch[1])),
        });
      }

      if (upperMethod === "POST" && clean === "/chat/messages") {
        assertPermission(currentUser, ["chat.reply"]);
        return ok({ data: await handleChatSendMessage(supabase, currentUser, payload) });
      }

      const chatMessageMatch = clean.match(/^\/chat\/messages\/(\d+)$/);
      if (chatMessageMatch && upperMethod === "PATCH") {
        assertPermission(currentUser, ["chat.reply"]);
        return ok({
          data: await handleChatUpdateMessage(
            supabase,
            currentUser,
            Number(chatMessageMatch[1]),
            payload,
          ),
        });
      }
      if (chatMessageMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["chat.delete"]);
        return ok(
          await handleChatDeleteMessage(
            supabase,
            currentUser,
            Number(chatMessageMatch[1]),
          ),
        );
      }

      const conversationDeleteMatch = clean.match(/^\/chat\/conversations\/(\d+)$/);
      if (conversationDeleteMatch && upperMethod === "DELETE") {
        assertPermission(currentUser, ["chat.delete"]);
        return ok(
          await handleChatDeleteConversation(
            supabase,
            Number(conversationDeleteMatch[1]),
          ),
        );
      }

      if (upperMethod === "GET" && clean === "/chat/unread-count") {
        assertPermission(currentUser, ["chat.view"]);
        return ok(await handleChatUnreadCount(supabase));
      }

      if (upperMethod === "POST" && clean === "/content-fields/upload-image") {
        return ok(await handleUploadFieldImage(getSupabase, env, payload));
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
