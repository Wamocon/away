import { createClient } from '@/lib/supabase/client';

export async function saveUserSettings(userId: string, email: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_settings')
    .upsert([{ user_id: userId, email }], { onConflict: 'user_id' });
  if (error) throw error;
  return data;
}

export async function getUserSettings(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}
