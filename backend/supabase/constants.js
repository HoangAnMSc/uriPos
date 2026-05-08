export const DEFAULT_PERMISSION_NAMES = [
  "dashboard.view",
  "pos.access",
  "order.view",
  "order.create",
  "order.update",
  "order.delete",
  "product.view",
  "product.create",
  "product.update",
  "product.delete",
  "customer.view",
  "customer.create",
  "customer.update",
  "customer.delete",
  "discount.view",
  "discount.create",
  "discount.update",
  "discount.delete",
  "chat.view",
  "chat.reply",
  "chat.delete",
  "notification.view",
  "notification.create",
  "notification.update",
  "notification.delete",
  "content.view",
  "content.create",
  "content.update",
  "content.delete",
  "payment.view",
  "payment.update",
  "user.view",
  "user.create",
  "user.update",
  "user.delete",
  "role.view",
  "role.create",
  "role.update",
  "role.delete",
];

export const DEFAULT_ROLE_DEFINITIONS = [
  {
    name: "Owner",
    permissions: DEFAULT_PERMISSION_NAMES,
  },
  {
    name: "Manager",
    permissions: DEFAULT_PERMISSION_NAMES.filter(
      (permission) =>
        !permission.startsWith("user.") && !permission.startsWith("role."),
    ),
  },
  {
    name: "Staff",
    permissions: [
      "dashboard.view",
      "pos.access",
      "order.view",
      "order.create",
      "product.view",
      "customer.view",
      "customer.create",
      "chat.view",
      "chat.reply",
      "notification.view",
    ],
  },
];

export const DEFAULT_CUSTOMER_RANK_RULES = [
  { name: "Thanh vien", min_points: 0 },
  { name: "Bac", min_points: 100 },
  { name: "Vang", min_points: 300 },
  { name: "Kim cuong", min_points: 700 },
];

export const DEFAULT_APP_SETTINGS_ROW = {
  theme: "light",
  logo_url: "",
  logo_text: "A",
  brand_name: "APOS PANEL",
  font_family: "Inter",
  font_sizes: { h1: 34, h2: 28, h3: 24, h4: 20, h5: 17, h6: 15 },
  sidebar_color: "dark",
  sidebar_custom_from: "#1C1C1E",
  sidebar_custom_to: "#1C1C1E",
  sidebar_active_color: "#16A34A",
  accent_color: "#16A34A",
  border_radius: "md",
  customer_rank_rules: DEFAULT_CUSTOMER_RANK_RULES,
  point_exchange_amount: 1000,
};

export const DEFAULT_PAYMENT_SETTINGS_ROW = {
  bank_name: "",
  account_name: "",
  account_number: "",
  qr_image: "",
};

export const STORAGE_BUCKET_FALLBACK = "app-media";
export const ADMIN_USER_ID_KEY = "adminUserId";
export const CUSTOMER_TOKEN_KEY = "customerToken";
export const CUSTOMER_DATA_KEY = "customerData";
export const ADMIN_ONLINE_WINDOW_MS = 120000;
