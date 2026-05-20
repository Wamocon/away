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
 * Wenn keine org-spezifischen Einstellungen gefunden werden, wird auf
 * organisationsunabhängige Einstellungen zurückgegriffen (org_id IS NULL).
 */
export async function getUserSettings(userId: string, organizationId?: string) {
  const supabase = createClient();

  // Hilfsfunktion: Mapping für Frontend-Kompatibilität
  const mapSettings = (data: Record<string, unknown> | null) => {
    if (!data) return null;
    if (data.settings) {
      const settings = data.settings as Record<string, unknown>;
      if (settings.email) {
        return { ...data, email: settings.email as string };
      }
    }
    return data;
  };

  if (organizationId) {
    // 1. Versuch: org-spezifische Einstellungen
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw error;

    if (data) return mapSettings(data as Record<string, unknown>);

    // 2. Fallback: Einstellungen ohne Org-Bezug (null-Org)
    const { data: fallback, error: fbError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .is("organization_id", null)
      .maybeSingle();
    if (fbError) throw fbError;
    return mapSettings(fallback as Record<string, unknown> | null);
  }

  // Kein Org-Filter: ersten Treffer zurückgeben
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return mapSettings(data as Record<string, unknown> | null);
}
