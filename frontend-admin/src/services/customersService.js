import { demoCustomers } from '../data/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export async function getCustomers() {
  if (!isSupabaseConfigured) {
    return demoCustomers;
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Customers fallback to demo', error);
    return demoCustomers;
  }

  return data ?? [];
}

export async function saveCustomer(values) {
  if (!isSupabaseConfigured) {
    return {
      id: values.id || crypto.randomUUID(),
      loyalty_points: 0,
      total_spent: 0,
      last_visit_at: new Date().toISOString(),
      ...values
    };
  }

  const payload = {
    full_name: values.full_name,
    email: values.email,
    phone: values.phone
  };

  if (values.id) {
    const { data, error } = await supabase
      .from('customers')
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
    .from('customers')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
