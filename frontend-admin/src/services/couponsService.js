import { demoCoupons } from '../data/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export async function getCoupons() {
  if (!isSupabaseConfigured) {
    return demoCoupons;
  }

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Coupons fallback to demo', error);
    return demoCoupons;
  }

  return data ?? [];
}

export async function saveCoupon(values) {
  const payload = {
    code: values.code,
    discount_type: values.discount_type,
    discount_value: Number(values.discount_value || 0),
    min_order_value: Number(values.min_order_value || 0),
    usage_limit: Number(values.usage_limit || 0),
    expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
    is_active: Boolean(values.is_active)
  };

  if (!isSupabaseConfigured) {
    return {
      id: values.id || crypto.randomUUID(),
      ...payload
    };
  }

  if (values.id) {
    const { data, error } = await supabase
      .from('coupons')
      .update(payload)
      .eq('id', values.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
