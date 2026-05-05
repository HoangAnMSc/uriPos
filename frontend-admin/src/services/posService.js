import { demoCoupons, demoCustomers, demoProducts } from '../data/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { makeOrderCode } from '../lib/utils';

export async function getPosCatalog() {
  if (!isSupabaseConfigured) {
    return {
      customers: demoCustomers,
      products: demoProducts.filter((item) => item.is_active),
      coupons: demoCoupons.filter((item) => item.is_active)
    };
  }

  const [customersResponse, productsResponse, couponsResponse] = await Promise.all([
    supabase.from('customers').select('*').order('full_name'),
    supabase.from('products').select('*').eq('is_active', true).order('name'),
    supabase.from('coupons').select('*').eq('is_active', true).order('expires_at')
  ]);

  const failedResponse = [customersResponse, productsResponse, couponsResponse].find(
    (response) => response.error
  );

  if (failedResponse?.error) {
    console.error('POS fallback to demo', failedResponse.error);
    return {
      customers: demoCustomers,
      products: demoProducts.filter((item) => item.is_active),
      coupons: demoCoupons.filter((item) => item.is_active)
    };
  }

  return {
    customers: customersResponse.data ?? [],
    products: productsResponse.data ?? [],
    coupons: couponsResponse.data ?? []
  };
}

export async function checkoutPosOrder(payload) {
  if (!isSupabaseConfigured) {
    return {
      order_code: makeOrderCode(),
      grand_total: payload.grandTotal
    };
  }

  const { data, error } = await supabase.rpc('create_pos_order', {
    p_customer_id: payload.customerId || null,
    p_coupon_id: payload.couponId || null,
    p_cashier_id: payload.cashierId,
    p_payment_method: payload.paymentMethod,
    p_items: payload.items
  });

  if (error) {
    throw error;
  }

  return data;
}
