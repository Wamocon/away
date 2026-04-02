import { createClient } from "@/lib/supabase/client";

/**
 * Speichert die Benutzereinstellungen (z.B. E-Mail) für eine bestimmte Organisation.
 */
export async function saveUserSettings(
  userId: string,
  organizationId: string | null | undefined,
  email: string,
  otherSettings: Record<string, unknown> = {},
) {
  const supabase = createClient();

  // Hole existierende Einstellungen für diese spezielle Organisation
  let query = supabase
    .from("user_settings")
    .select("id, settings")
    .eq("user_id", userId);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    query = query.is("organization_id", null);
  }

  const { data: existing } = await query.maybeSingle();

  const currentSettings = (existing?.settings as Record<string, unknown>) || {};
  const newSettings: Record<string, unknown> = {
    ...currentSettings,
    email,
    ...otherSettings,
  };

  let result;
  if (existing) {
    result = await supabase
      .from("user_settings")
      .update({ settings: newSettings })
      .eq("id", existing.id);
  } else {
    result = await supabase.from("user_settings").insert([
      {
        user_id: userId,
        organization_id: organizationId || null,
        settings: newSettings,
      },
    ]);
  }

  if (result.error) throw result.error;
  return result;
}

/**
 * Lädt die Benutzereinstellungen für eine bestimmte Organisation.
 */
export async function getUserSettings(userId: string, organizationId?: string) {
  const supabase = createClient();
  let query = supabase.from("user_settings").select("*").eq("user_id", userId);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    // Falls keine Org-ID übergeben wurde, versuchen wir den ersten Treffer
    query = query.limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;

  // Mapping für Frontend-Kompatibilität (flacht das Email-Feld ab)
  if (data && data.settings) {
    const settings = data.settings as Record<string, unknown>;
    if (settings.email) {
      return { ...data, email: settings.email as string };
    }
  }
  return data;
}
