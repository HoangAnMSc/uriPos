export const MODULE_KEYS = [
  'dashboard',
  'analytics',
  'pos',
  'users',
  'customers',
  'products',
  'coupons'
];

export const rolePermissions = {
  admin: {
    dashboard: ['view'],
    analytics: ['view'],
    pos: ['view', 'create', 'update'],
    users: ['view', 'create', 'update', 'delete'],
    customers: ['view', 'create', 'update', 'delete'],
    products: ['view', 'create', 'update', 'delete'],
    coupons: ['view', 'create', 'update', 'delete']
  },
  manager: {
    dashboard: ['view'],
    analytics: ['view'],
    pos: ['view', 'create', 'update'],
    users: ['view', 'update'],
    customers: ['view', 'create', 'update'],
    products: ['view', 'create', 'update'],
    coupons: ['view', 'create', 'update']
  },
  cashier: {
    dashboard: ['view'],
    analytics: ['view'],
    pos: ['view', 'create'],
    users: [],
    customers: ['view', 'create', 'update'],
    products: ['view'],
    coupons: ['view']
  },
  staff: {
    dashboard: ['view'],
    analytics: [],
    pos: [],
    users: [],
    customers: ['view'],
    products: ['view'],
    coupons: []
  }
};

export const roleLabels = {
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Thu ngan',
  staff: 'Nhan vien'
};

export function canAccess(role, moduleKey, action = 'view') {
  return rolePermissions[role]?.[moduleKey]?.includes(action) ?? false;
}

export function getFirstAllowedPath(role) {
  if (canAccess(role, 'dashboard')) {
    return '/dashboard';
  }

  const firstAllowedModule = MODULE_KEYS.find((moduleKey) =>
    canAccess(role, moduleKey)
  );

  return firstAllowedModule ? `/${firstAllowedModule}` : '/login';
}
