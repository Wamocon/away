import { createClient } from "@/lib/supabase/client";

export type UserRole = "admin" | "cio" | "approver" | "employee";

export async function getUserRole(
  userId: string,
  orgId: string,
): Promise<UserRole> {
  if (!userId || !orgId) return "employee";
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle(); // returns null instead of error when row missing
  if (error) throw error;
  return (data?.role as UserRole) ?? "employee";
}

export async function updateUserRole(
  userId: string,
  orgId: string,
  role: UserRole,
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_roles")
    .update({ role })
    .eq("user_id", userId)
    .eq("organization_id", orgId);
  if (error) throw error;
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function isCIO(role: UserRole | null | undefined): boolean {
  return role === "cio" || role === "admin";
}

export function isApprover(role: UserRole | null | undefined): boolean {
  return role === "approver" || role === "cio" || role === "admin";
}

export function canApprove(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "cio" || role === "approver";
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  cio: "CIO / GF",
  approver: "Genehmiger",
  employee: "Mitarbeiter",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "role-admin",
  cio: "role-cio",
  approver: "role-approver",
  employee: "role-employee",
};
