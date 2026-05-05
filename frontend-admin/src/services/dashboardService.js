import {
  demoCustomers,
  demoOrders,
  demoProducts,
  demoUsers
} from '../data/demoData';
import { formatCurrency } from '../lib/utils';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function buildRevenueSeries(orders) {
  const labels = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);

    return {
      key,
      label: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit'
      }).format(date),
      revenue: 0,
      orders: 0
    };
  });

  return labels.map((entry) => {
    const matchedOrders = orders.filter((order) => order.created_at.startsWith(entry.key));

    return {
      label: entry.label,
      revenue: matchedOrders.reduce((sum, order) => sum + Number(order.grand_total || 0), 0),
      orders: matchedOrders.length
    };
  });
}

function buildDashboardPayload({
  orders,
  recentOrders,
  customers,
  products,
  users
}) {
  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.grand_total || 0),
    0
  );

  const paidOrders = orders.filter((order) => order.status === 'paid');
  const lowStock = products.filter((product) => Number(product.stock_quantity) <= 15);

  return {
    metrics: [
      {
        title: 'Doanh thu 7 ngay',
        value: formatCurrency(totalRevenue),
        note: `${paidOrders.length} don thanh cong`,
        key: 'revenue'
      },
      {
        title: 'Khach hang',
        value: `${customers.length}`,
        note: `${customers.filter((item) => item.loyalty_points >= 100).length} VIP`
      },
      {
        title: 'Ton kho can chu y',
        value: `${lowStock.length}`,
        note: 'San pham duoi 15 don vi'
      },
      {
        title: 'Nhan su kich hoat',
        value: `${users.filter((item) => item.is_active).length}`,
        note: `${users.length} tai khoan`
      }
    ],
    recentOrders,
    lowStock,
    revenueSeries: buildRevenueSeries(orders)
  };
}

export async function getDashboardData() {
  if (!isSupabaseConfigured) {
    return buildDashboardPayload({
      orders: demoOrders,
      recentOrders: demoOrders.map((order) => ({
        ...order,
        customer: demoCustomers.find((customer) => customer.id === order.customer_id)
      })),
      customers: demoCustomers,
      products: demoProducts,
      users: demoUsers
    });
  }

  try {
    const [
      ordersResponse,
      recentOrdersResponse,
      customersResponse,
      productsResponse,
      usersResponse
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_code, grand_total, status, created_at')
        .gte(
          'created_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        ),
      supabase
        .from('orders')
        .select(
          'id, order_code, grand_total, status, payment_method, created_at, customer:customers(full_name)'
        )
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('customers').select('id, loyalty_points, total_spent'),
      supabase.from('products').select('id, name, category, stock_quantity, price, sku'),
      supabase.from('profiles').select('id, is_active')
    ]);

    const responses = [
      ordersResponse,
      recentOrdersResponse,
      customersResponse,
      productsResponse,
      usersResponse
    ];

    const failedResponse = responses.find((response) => response.error);
    if (failedResponse?.error) {
      throw failedResponse.error;
    }

    return buildDashboardPayload({
      orders: ordersResponse.data ?? [],
      recentOrders: recentOrdersResponse.data ?? [],
      customers: customersResponse.data ?? [],
      products: productsResponse.data ?? [],
      users: usersResponse.data ?? []
    });
  } catch (error) {
    console.error('Dashboard fallback to demo', error);

    return buildDashboardPayload({
      orders: demoOrders,
      recentOrders: demoOrders.map((order) => ({
        ...order,
        customer: demoCustomers.find((customer) => customer.id === order.customer_id)
      })),
      customers: demoCustomers,
      products: demoProducts,
      users: demoUsers
    });
  }
}
