import { createClient } from '@/lib/supabase/client';

export type UserRole = 'admin' | 'approver' | 'employee';

export async function getUserRole(userId: string, orgId: string): Promise<UserRole> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();
  if (error) throw error;
  return data.role as UserRole;
}

export async function updateUserRole(userId: string, orgId: string, role: UserRole) {
  const supabase = createClient();
  const { error } = await supabase
    .from('user_roles')
    .update({ role })
    .eq('user_id', userId)
    .eq('organization_id', orgId);
  if (error) throw error;
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}

export function isApprover(role: UserRole | null | undefined): boolean {
  return role === 'approver' || role === 'admin';
}

export function canApprove(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'approver';
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  approver: 'Genehmiger',
  employee: 'Mitarbeiter',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'role-admin',
  approver: 'role-approver',
  employee: 'role-employee',
};
