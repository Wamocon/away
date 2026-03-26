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

export async function createOrganization(userId: string, name: string) {
  const supabase = createClient();
  
  // 1. Create the new organization
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert([{ name }])
    .select('id, name')
    .single();
    
  if (orgError) throw orgError;
  if (!orgData) throw new Error('Could not create organization');
  
  // 2. Assign the creator as admin of this organization
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert([{
      user_id: userId,
      organization_id: orgData.id,
      role: 'admin'
    }]);
    
  if (roleError) throw roleError;
  
  return orgData;
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
