import { createClient } from '@/lib/supabase/client';

export async function getOrganizationsForUser(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('organization_id, organizations:organization_id(id, name)')
    .eq('user_id', userId)
    .order('organization_id', { ascending: true });
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

export async function createOrganization(userId: string, name: string) {
  const supabase = createClient();
  
  // Rufen Sie die neue Datenbank-Funktion auf, die Organisation + Admin-Rolle in einem Schritt erstellt
  const { data: orgId, error } = await supabase
    .rpc('create_new_organization', {
      org_name: name,
      creator_id: userId
    });
    
  if (error) {
    console.error('Error in create_new_organization RPC:', error);
    throw error;
  }

  // Rückgabe der neuen Organisations-Daten
  return { id: orgId, name };
}

export async function joinOrganization(userId: string, organizationId: string) {
  const supabase = createClient();

  // Check if the user is already in the organization
  const { data: existingRole, error: checkError } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (checkError) throw checkError;
  if (existingRole) return { success: true, alreadyMember: true };

  // Assign the user as 'user' role
  const { error: joinError } = await supabase
    .from('user_roles')
    .insert([{
      user_id: userId,
      organization_id: organizationId,
      role: 'user'
    }]);

  if (joinError) throw joinError;

  return { success: true, alreadyMember: false };
}

export async function updateOrganizationName(orgId: string, newName: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('organizations')
    .update({ name: newName })
    .eq('id', orgId);
  if (error) throw error;
  return { success: true };
}
