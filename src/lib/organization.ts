import { createClient } from '@/lib/supabase/client';

export async function getOrganizationsForUser(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('organization_id, organizations:organization_id(id, name)')
    .eq('user_id', userId);
  if (error) throw error;
  if (!data) return [];
  type OrgRow = { organizations: { id: string; name: string } | { id: string; name: string }[] | null };
  return (data as OrgRow[])
    .map(row => row.organizations)
    .filter(Boolean)
    .flatMap(org => Array.isArray(org) ? org : [org]);
}

export async function getCurrentOrganization(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
  if (error) throw error;
  return data;
}
