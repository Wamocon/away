import { createClient } from "@/lib/supabase/client";

// Circuit-Breaker: Wenn die Tabelle einmal als fehlend (404) erkannt wurde,
// stoppen wir weitere Anfragen in dieser Session, um die Konsole sauber zu halten.
let isTableAvailable = true;

/**
 * Checks if a specific document ID (Belegnummer) is already taken within an organization.
 */
export async function isDocumentIdUsed(
  organizationId: string,
  documentId: string,
): Promise<boolean> {
  if (!isTableAvailable || !documentId.trim()) return false;

  const supabase = createClient();
  const { count, error } = await supabase
    .from("document_numbers")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("document_id", documentId.trim());

  if (error) {
    if (error.code === "PGRST") isTableAvailable = false;
    if (error.code !== "PGRST") {
      console.error("Error checking document ID usage:", error);
    }
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Registers a new document ID in the database to prevent future duplicates.
 */
export async function registerDocumentId(
  organizationId: string,
  userId: string,
  documentId: string,
) {
  if (!isTableAvailable || !documentId.trim()) return;

  const supabase = createClient();
  const { error } = await supabase.from("document_numbers").insert([
    {
      organization_id: organizationId,
      user_id: userId,
      document_id: documentId.trim(),
    },
  ]);

  if (error) {
    if (error.code === "PGRST") {
      isTableAvailable = false;
      return;
    }
    if (error.code !== "PGRST") {
      console.warn(
        "Could not register document ID (Table missing or permission error):",
        error,
      );
    }
    // If it's a unique constraint violation, it was already registered.
    if (error.code === "23505") {
      throw new Error("Diese Belegnummer wurde bereits vergeben.");
    }
  }
}

/**
 * Finds the next available counter for a given prefix.
 */
export async function getNextDocumentCounter(
  organizationId: string,
  prefix: string,
): Promise<number> {
  if (!isTableAvailable) return 0;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_numbers")
    .select("document_id")
    .eq("organization_id", organizationId)
    .like("document_id", `${prefix}%`)
    .order("document_id", { ascending: false })
    .limit(1);

  if (error) {
    if (error.code === "PGRST") isTableAvailable = false;
    if (error.code !== "PGRST") {
      console.error("Error fetching latest document ID:", error);
    }
    return 0;
  }

  if (!data || data.length === 0) {
    return 0; // First one is 00
  }

  const latestId = data[0].document_id;
  const suffix = latestId.slice(prefix.length);
  const lastNum = parseInt(suffix, 10);
  if (!isNaN(lastNum)) {
    return lastNum + 1;
  }

  return 0;
}
