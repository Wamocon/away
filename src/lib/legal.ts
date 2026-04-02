import { createClient } from "@/lib/supabase/client";

export type ConsentType = "agb" | "privacy" | "dsgvo";

export async function saveLegalConsent(
  userId: string,
  types: ConsentType[],
  version: string = "1.0",
) {
  const supabase = createClient();

  const records = types.map((type) => ({
    user_id: userId,
    consent_type: type,
    version: version,
    accepted_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("legal_consents").insert(records);

  if (error) {
    console.error("Error saving legal consent:", error);
    throw error;
  }
}

export async function checkUserConsent(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("legal_consents")
    .select("*")
    .eq("user_id", userId);

  if (error) return [];
  return data;
}

export async function getOrganizationConsents(orgId: string) {
  const supabase = createClient();

  // 1. Get all user IDs for the org
  const { data: users, error: usersError } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("organization_id", orgId);

  if (usersError || !users) throw usersError;

  // 2. Get all consents for these users (simplified)
  // In a real app, you might want to join or fetch profiles here too
  const { data: consents, error: consentsError } = await supabase
    .from("legal_consents")
    .select("*")
    .in(
      "user_id",
      users.map((u) => u.user_id),
    );

  if (consentsError) throw consentsError;

  return { users, consents };
}
