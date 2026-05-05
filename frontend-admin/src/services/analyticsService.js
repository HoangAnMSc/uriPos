import { demoOrders, demoProducts } from '../data/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function buildAnalytics(orders, products) {
  const dailyRevenue = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const dayOrders = orders.filter((order) => order.created_at.startsWith(key));

    return {
      name: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit'
      }).format(date),
      revenue: dayOrders.reduce((sum, order) => sum + Number(order.grand_total || 0), 0),
      orders: dayOrders.length
    };
  });

  const categoryMap = products.reduce((accumulator, product) => {
    const current = accumulator.get(product.category) ?? {
      name: product.category,
      value: 0,
      stock: 0
    };

    current.value += Number(product.price || 0);
    current.stock += Number(product.stock_quantity || 0);
    accumulator.set(product.category, current);

    return accumulator;
  }, new Map());

  const paymentMethodMap = orders.reduce((accumulator, order) => {
    const label = order.payment_method || 'other';
    accumulator.set(label, (accumulator.get(label) ?? 0) + Number(order.grand_total || 0));
    return accumulator;
  }, new Map());

  return {
    dailyRevenue,
    categoryMix: Array.from(categoryMap.values()),
    paymentMix: Array.from(paymentMethodMap.entries()).map(([name, value]) => ({
      name,
      value
    })),
    summary: {
      revenue: dailyRevenue.reduce((sum, item) => sum + item.revenue, 0),
      orderCount: orders.length,
      productCount: products.length,
      lowStockCount: products.filter((item) => Number(item.stock_quantity) <= 15).length
    }
  };
}

export async function getAnalyticsData() {
  if (!isSupabaseConfigured) {
    return buildAnalytics(demoOrders, demoProducts);
  }

  try {
    const [ordersResponse, productsResponse] = await Promise.all([
      supabase
        .from('orders')
        .select('id, grand_total, payment_method, created_at')
        .gte(
          'created_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        ),
      supabase.from('products').select('id, category, price, stock_quantity')
    ]);

    if (ordersResponse.error) {
      throw ordersResponse.error;
    }

    if (productsResponse.error) {
      throw productsResponse.error;
    }

    return buildAnalytics(ordersResponse.data ?? [], productsResponse.data ?? []);
  } catch (error) {
    console.error('Analytics fallback to demo', error);
    return buildAnalytics(demoOrders, demoProducts);
  }
}
