import { demoUsers } from '../data/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export async function getUsers() {
  if (!isSupabaseConfigured) {
    return demoUsers;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Users fallback to demo', error);
    return demoUsers;
  }

  return data ?? [];
}

export async function updateUserProfile(userId, values) {
  if (!isSupabaseConfigured) {
    return {
      id: userId,
      ...values
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function inviteUser(payload) {
  if (!isSupabaseConfigured) {
    return {
      id: crypto.randomUUID(),
      ...payload,
      is_active: true
    };
  }

  const { data, error } = await supabase.functions.invoke('admin-invite-user', {
    body: payload
  });

  if (error) {
    throw error;
  }

  return data.user;
}
