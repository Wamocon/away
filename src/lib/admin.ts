import { createClient } from "@/lib/supabase/client";

/**
 * Aktualisiert die Einstellungen einer Organisation.
 * @param orgId Die ID der Organisation
 * @param settings Ein Objekt mit den neuen Einstellungen (wird in die JSONB-Spalte 'settings' gemappt)
 */
export async function updateOrganizationSettings(
  orgId: string,
  settings: Record<string, unknown>,
) {
  const supabase = createClient();

  // Zuerst bestehende Einstellungen holen, um sie zu mergen (optional)
  const { data: org, error: fetchError } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();

  if (fetchError) {
    // Falls die Spalte 'settings' noch nicht existiert oder ein anderer Fehler auftritt
    console.warn("Fehler beim Abrufen der Orga-Einstellungen:", fetchError);
  }

  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const newSettings = { ...currentSettings, ...settings };

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ settings: newSettings })
    .eq("id", orgId);

  if (updateError) throw updateError;
  return { success: true };
}

/**
 * Holt die Einstellungen einer Organisation.
 */
export async function getOrganizationSettings(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return (data?.settings as Record<string, unknown>) || {};
}

export interface ApproverEmail {
  name: string;
  email: string;
}

/**
 * Holt die hinterlegten Genehmiger-E-Mails einer Organisation.
 */
export async function getApproverEmails(orgId: string): Promise<ApproverEmail[]> {
  const settings = await getOrganizationSettings(orgId);
  return (settings.approverEmails as ApproverEmail[]) || [];
}

/**
 * Aktualisiert die Genehmiger-E-Mail-Liste einer Organisation.
 */
export async function updateApproverEmails(
  orgId: string,
  approvers: ApproverEmail[],
) {
  return updateOrganizationSettings(orgId, { approverEmails: approvers });
}
