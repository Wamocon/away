import { createClient } from '@/lib/supabase/client';

export async function getUserRole(userId: string, orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();
  if (error) throw error;
  return data.role;
}
