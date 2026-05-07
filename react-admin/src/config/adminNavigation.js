export const ACCESS_RULES = Object.freeze({
  dashboard: ["dashboard.view"],
  pos: ["pos.access"],
  orders: ["order.view", "order.create", "order.update", "order.delete"],
  products: ["product.view", "product.create", "product.update", "product.delete"],
  customers: ["customer.view", "customer.create", "customer.update", "customer.delete"],
  discounts: ["discount.view", "discount.create", "discount.update", "discount.delete"],
  chat: ["chat.view", "chat.reply", "chat.delete"],
  notifications: [
    "notification.view",
    "notification.create",
    "notification.update",
    "notification.delete",
  ],
  content: ["content.view", "content.create", "content.update", "content.delete"],
  payment: ["payment.view", "payment.update"],
  users: ["user.view", "user.create", "user.update", "user.delete"],
  roles: ["role.view", "role.create", "role.update", "role.delete"],
});

export const PERMISSION_GROUPS = [
  {
    label: "Ban hang",
    prefixes: ["dashboard.", "pos.", "order."],
  },
  {
    label: "Kinh doanh",
    prefixes: ["product.", "customer.", "discount."],
  },
  {
    label: "Cham soc",
    prefixes: ["chat.", "notification."],
  },
  {
    label: "He thong",
    prefixes: ["payment.", "content.", "user.", "role."],
  },
];

const DEFAULT_PAGE_META = {
  title: "AposPanel",
  subtitle: "Dieu khien van hanh trong mot khong gian quan tri thong nhat.",
  section: "Workspace",
  documentTitle: "AposPanel",
};

export const ADMIN_NAV_ITEMS = [
  {
    path: "/dashboard",
    title: "Dashboard",
    subtitle: "Theo doi tong quan doanh thu, don hang va tinh hinh van hanh.",
    section: "Ban hang",
    navLabel: "Tong quan",
    icon: "home",
    permissions: ACCESS_RULES.dashboard,
    documentTitle: "Dashboard | AposPanel",
  },
  {
    path: "/pos",
    title: "POS",
    subtitle: "Ban hang truc tiep voi khong gian thao tac nhanh va tap trung.",
    section: "Ban hang",
    navLabel: "POS",
    icon: "pos",
    permissions: ACCESS_RULES.pos,
    documentTitle: "POS | AposPanel",
  },
  {
    path: "/orders",
    title: "Don hang",
    subtitle: "Kiem soat don hang, thanh toan va trang thai xu ly.",
    section: "Ban hang",
    navLabel: "Don hang",
    icon: "receipt",
    permissions: ACCESS_RULES.orders,
    documentTitle: "Orders | AposPanel",
  },
  {
    path: "/products",
    title: "San pham",
    subtitle: "Quan ly danh muc, ton kho va thong tin san pham.",
    section: "Kinh doanh",
    navLabel: "San pham",
    icon: "box",
    permissions: ACCESS_RULES.products,
    documentTitle: "Products | AposPanel",
  },
  {
    path: "/customers",
    title: "Khach hang",
    subtitle: "Theo doi tep khach hang, diem tich luy va hanh vi mua sam.",
    section: "Kinh doanh",
    navLabel: "Khach hang",
    icon: "users",
    permissions: ACCESS_RULES.customers,
    documentTitle: "Customers | AposPanel",
  },
  {
    path: "/discountCodes",
    title: "Ma giam gia",
    subtitle: "Xay dung va theo doi cac chuong trinh khuyen mai.",
    section: "Kinh doanh",
    navLabel: "Ma giam gia",
    icon: "discount",
    permissions: ACCESS_RULES.discounts,
    documentTitle: "Discount Codes | AposPanel",
  },
  {
    path: "/chat",
    title: "Tin nhan",
    subtitle: "Phan hoi khach hang va xu ly hoi thoai trong cung mot noi.",
    section: "Cham soc",
    navLabel: "Tin nhan",
    icon: "chat",
    permissions: ACCESS_RULES.chat,
    badgeKey: "chatUnread",
    documentTitle: "Chat | AposPanel",
  },
  {
    path: "/notifications",
    title: "Thong bao",
    subtitle: "Gui va theo doi thong bao van hanh tren toan he thong.",
    section: "Cham soc",
    navLabel: "Thong bao",
    icon: "bell",
    permissions: ACCESS_RULES.notifications,
    documentTitle: "Notifications | AposPanel",
  },
  {
    path: "/payment",
    title: "Thanh toan",
    subtitle: "Cau hinh phuong thuc thanh toan va van hanh tai chinh.",
    section: "He thong",
    navLabel: "Thanh toan",
    icon: "payment",
    permissions: ACCESS_RULES.payment,
    documentTitle: "Payment | AposPanel",
  },
  {
    path: "/content",
    title: "Noi dung",
    subtitle: "Thiet ke cau truc noi dung de mo rong du lieu linh hoat hon.",
    section: "He thong",
    navLabel: "Noi dung",
    icon: "content",
    permissions: ACCESS_RULES.content,
    documentTitle: "Content Structures | AposPanel",
  },
  {
    path: "/user-list",
    title: "Nguoi dung",
    subtitle: "Quan ly tai khoan quan tri va tinh trang su dung he thong.",
    section: "He thong",
    navLabel: "Nguoi dung",
    icon: "user",
    permissions: ACCESS_RULES.users,
    documentTitle: "Users | AposPanel",
  },
  {
    path: "/role-list",
    title: "Vai tro",
    subtitle: "To chuc vai tro va phan quyen theo nhom cong viec.",
    section: "He thong",
    navLabel: "Vai tro",
    icon: "shield",
    permissions: ACCESS_RULES.roles,
    documentTitle: "Roles | AposPanel",
  },
];

const EXTRA_PAGE_META = [
  {
    path: "/profile",
    title: "Ho so",
    subtitle: "Cap nhat thong tin ca nhan va hinh anh dai dien.",
    section: "Tai khoan",
    navLabel: "Ca nhan",
    icon: "user",
    documentTitle: "Profile | AposPanel",
  },
  {
    path: "/settings",
    title: "Cai dat giao dien",
    subtitle: "Tinh chinh mau sac, typography va giao dien he thong.",
    section: "Tai khoan",
    navLabel: "Cai dat",
    icon: "settings",
    documentTitle: "Settings | AposPanel",
  },
  {
    path: "/login",
    title: "Dang nhap",
    subtitle: "Truy cap bang dieu khien AposPanel.",
    section: "Truy cap",
    documentTitle: "Login | AposPanel",
  },
  {
    path: "/forbidden",
    title: "Khong co quyen truy cap",
    subtitle: "Tai khoan hien tai khong co quyen vao khu vuc nay.",
    section: "Bao mat",
    documentTitle: "Forbidden | AposPanel",
  },
];

const SIDEBAR_GROUP_ORDER = ["Ban hang", "Kinh doanh", "Cham soc", "He thong"];
const MOBILE_PATHS = ["/dashboard", "/orders", "/pos", "/chat", "/profile"];
const MOBILE_CENTER_PATH = "/pos";

function matchesPath(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function hasAnyPermission(access, permissions = []) {
  if (!permissions.length) return true;
  return permissions.some((permission) => access(permission));
}

function withDynamicValues(item, dynamicValues = {}) {
  const badge =
    item.badgeKey && dynamicValues[item.badgeKey]
      ? dynamicValues[item.badgeKey]
      : 0;

  return {
    ...item,
    badge,
  };
}

export function getPageMeta(pathname) {
  const allPages = [...ADMIN_NAV_ITEMS, ...EXTRA_PAGE_META];
  return allPages.find((item) => matchesPath(pathname, item.path)) || DEFAULT_PAGE_META;
}

export function getDocumentTitle(pathname) {
  return getPageMeta(pathname).documentTitle || DEFAULT_PAGE_META.documentTitle;
}

export function buildSidebarGroups(access, dynamicValues = {}) {
  const visibleItems = ADMIN_NAV_ITEMS.filter((item) =>
    hasAnyPermission(access, item.permissions),
  );

  return SIDEBAR_GROUP_ORDER.map((label) => ({
    label,
    items: visibleItems
      .filter((item) => item.section === label)
      .map((item) => withDynamicValues(item, dynamicValues)),
  })).filter((group) => group.items.length > 0);
}

export function buildMobileNav(access, dynamicValues = {}) {
  const sourceItems = [...ADMIN_NAV_ITEMS, ...EXTRA_PAGE_META];

  return MOBILE_PATHS.map((path) => {
    const item = sourceItems.find((entry) => entry.path === path);

    if (!item) return null;
    if (!hasAnyPermission(access, item.permissions)) return null;

    return {
      ...withDynamicValues(item, dynamicValues),
      center: item.path === MOBILE_CENTER_PATH,
    };
  }).filter(Boolean);
}

export function buildProfileMenu(access, dynamicValues = {}) {
  return ADMIN_NAV_ITEMS.filter((item) => hasAnyPermission(access, item.permissions)).map(
    (item) => {
      const resolved = withDynamicValues(item, dynamicValues);

      return {
        to: resolved.path,
        icon: resolved.icon,
        title: resolved.navLabel,
        badge: resolved.badge,
      };
    },
  );
}
