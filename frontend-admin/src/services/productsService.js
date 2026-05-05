import { demoProducts } from '../data/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export async function getProducts() {
  if (!isSupabaseConfigured) {
    return demoProducts;
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Products fallback to demo', error);
    return demoProducts;
  }

  return data ?? [];
}

export async function saveProduct(values) {
  const payload = {
    sku: values.sku,
    name: values.name,
    category: values.category,
    price: Number(values.price || 0),
    stock_quantity: Number(values.stock_quantity || 0),
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
      .from('products')
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
    .from('products')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
