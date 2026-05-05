export const demoProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  full_name: 'Nguyen Hoang Admin',
  email: 'admin@liquidcommerce.vn',
  role: 'admin',
  is_active: true,
  phone: '0909000001'
};

export const demoUsers = [
  demoProfile,
  {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Tran Minh Quan',
    email: 'manager@liquidcommerce.vn',
    role: 'manager',
    is_active: true,
    phone: '0909000002'
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Le Thu Ngan',
    email: 'cashier@liquidcommerce.vn',
    role: 'cashier',
    is_active: true,
    phone: '0909000003'
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    full_name: 'Pham Gia Bao',
    email: 'support@liquidcommerce.vn',
    role: 'staff',
    is_active: false,
    phone: '0909000004'
  }
];

export const demoCustomers = [
  {
    id: 'C001',
    full_name: 'Vu Lan Anh',
    email: 'lananh@gmail.com',
    phone: '0911001101',
    loyalty_points: 240,
    total_spent: 9200000,
    last_visit_at: '2026-05-03T13:24:00Z'
  },
  {
    id: 'C002',
    full_name: 'Nguyen Duc Minh',
    email: 'ducminh@gmail.com',
    phone: '0911001102',
    loyalty_points: 120,
    total_spent: 4300000,
    last_visit_at: '2026-05-02T09:20:00Z'
  },
  {
    id: 'C003',
    full_name: 'Hoang Kim Ngan',
    email: 'kimngan@gmail.com',
    phone: '0911001103',
    loyalty_points: 95,
    total_spent: 2150000,
    last_visit_at: '2026-04-29T07:30:00Z'
  },
  {
    id: 'C004',
    full_name: 'Tran Bao Ngoc',
    email: 'baongoc@gmail.com',
    phone: '0911001104',
    loyalty_points: 330,
    total_spent: 13900000,
    last_visit_at: '2026-05-04T15:18:00Z'
  }
];

export const demoProducts = [
  {
    id: 'P001',
    sku: 'MAC-001',
    name: 'Macaron Matcha Box',
    category: 'Bakery',
    price: 189000,
    stock_quantity: 14,
    is_active: true
  },
  {
    id: 'P002',
    sku: 'TEA-014',
    name: 'Cold Brew Peach Tea',
    category: 'Beverage',
    price: 69000,
    stock_quantity: 43,
    is_active: true
  },
  {
    id: 'P003',
    sku: 'DST-221',
    name: 'Cloud Cheesecake',
    category: 'Dessert',
    price: 159000,
    stock_quantity: 8,
    is_active: true
  },
  {
    id: 'P004',
    sku: 'BRD-010',
    name: 'Butter Croissant',
    category: 'Bakery',
    price: 49000,
    stock_quantity: 28,
    is_active: true
  },
  {
    id: 'P005',
    sku: 'BND-112',
    name: 'Signature Brunch Set',
    category: 'Combo',
    price: 249000,
    stock_quantity: 12,
    is_active: true
  }
];

export const demoCoupons = [
  {
    id: 'CP001',
    code: 'SPRING10',
    discount_type: 'percent',
    discount_value: 10,
    min_order_value: 300000,
    usage_limit: 200,
    expires_at: '2026-05-31T23:59:59Z',
    is_active: true
  },
  {
    id: 'CP002',
    code: 'VIP100K',
    discount_type: 'fixed',
    discount_value: 100000,
    min_order_value: 900000,
    usage_limit: 50,
    expires_at: '2026-06-15T23:59:59Z',
    is_active: true
  },
  {
    id: 'CP003',
    code: 'LUNCH15',
    discount_type: 'percent',
    discount_value: 15,
    min_order_value: 250000,
    usage_limit: 120,
    expires_at: '2026-05-18T23:59:59Z',
    is_active: false
  }
];

export const demoOrders = [
  {
    id: 'O001',
    order_code: 'POS-452011',
    customer_id: 'C001',
    cashier_id: '00000000-0000-0000-0000-000000000003',
    subtotal: 447000,
    discount_total: 44700,
    grand_total: 402300,
    payment_method: 'card',
    status: 'paid',
    created_at: '2026-05-05T02:20:00Z'
  },
  {
    id: 'O002',
    order_code: 'POS-452219',
    customer_id: 'C004',
    cashier_id: '00000000-0000-0000-0000-000000000003',
    subtotal: 249000,
    discount_total: 0,
    grand_total: 249000,
    payment_method: 'cash',
    status: 'paid',
    created_at: '2026-05-05T04:10:00Z'
  },
  {
    id: 'O003',
    order_code: 'POS-452566',
    customer_id: 'C002',
    cashier_id: '00000000-0000-0000-0000-000000000003',
    subtotal: 357000,
    discount_total: 35000,
    grand_total: 322000,
    payment_method: 'banking',
    status: 'paid',
    created_at: '2026-05-04T08:15:00Z'
  },
  {
    id: 'O004',
    order_code: 'POS-452888',
    customer_id: null,
    cashier_id: '00000000-0000-0000-0000-000000000003',
    subtotal: 138000,
    discount_total: 0,
    grand_total: 138000,
    payment_method: 'cash',
    status: 'paid',
    created_at: '2026-05-04T10:25:00Z'
  },
  {
    id: 'O005',
    order_code: 'POS-453010',
    customer_id: 'C003',
    cashier_id: '00000000-0000-0000-0000-000000000003',
    subtotal: 567000,
    discount_total: 56700,
    grand_total: 510300,
    payment_method: 'card',
    status: 'paid',
    created_at: '2026-05-03T06:40:00Z'
  }
];
