import { createClient } from "@/lib/supabase/client";

// Circuit-Breaker: Wenn die Tabelle einmal als fehlend (404) erkannt wurde,
// stoppen wir weitere Anfragen in dieser Session, um die Konsole sauber zu halten.
let isTableAvailable = true;

// ═══════════════════════════════════════════════════════════════════════════
// Belegnummer-Muster (Organisation konfigurierbar)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Muster-Konfiguration für die Belegnummer-Generierung einer Organisation.
 *
 * Platzhalter in `pattern`:
 *   {VORNAME1}   – 1. Buchstabe Vorname (Großbuchstabe)
 *   {NACHNAME2}  – Erste 2 Buchstaben Nachname (Großbuchstaben)
 *   {JAHR}       – 4-stelliges aktuelles Jahr
 *   {JAHR2}      – 2-stelliges Jahr
 *   {NR}         – Laufende Nummer (zero-padded auf `counterDigits` Stellen)
 *   {ORGKUERZEL} – Konfigurierbares Org-Kürzel (aus `orgAbbreviation`)
 *
 * Beispiele:
 *   "{VORNAME1}{NACHNAME2}{JAHR}{NR}"  → "NSC202601"  (Standard)
 *   "{ORGKUERZEL}-{JAHR}-{NR}"         → "WMC-2026-01"
 *   "UA-{JAHR}{NR}"                    → "UA-202601"
 */
export interface DocumentNumberPattern {
  pattern: string;          // Muster-String mit Platzhaltern
  counterDigits: number;    // Stellen der laufenden Nummer (z. B. 2 → "01")
  orgAbbreviation?: string; // Kürzel für {ORGKUERZEL}
}

export const DEFAULT_PATTERN: DocumentNumberPattern = {
  pattern: "{VORNAME1}{NACHNAME2}{JAHR}{NR}",
  counterDigits: 2,
};

/**
 * Baut den statischen Prefix (alles vor {NR}) aus dem Muster + User-Daten.
 * Wird genutzt um in der DB nach dem höchsten Counter zu suchen.
 */
export function buildDocumentPrefix(
  patternCfg: DocumentNumberPattern,
  firstName: string,
  lastName: string,
  date: Date = new Date(),
): string {
  const jahr = date.getFullYear().toString();
  const jahr2 = jahr.slice(2);
  const prefix = patternCfg.pattern
    .replace("{NR}", "")                                              // NR weglassen
    .replace("{VORNAME1}", firstName.charAt(0).toUpperCase())
    .replace("{NACHNAME2}", lastName.substring(0, 2).toUpperCase())
    .replace("{JAHR}", jahr)
    .replace("{JAHR2}", jahr2)
    .replace("{ORGKUERZEL}", (patternCfg.orgAbbreviation ?? "ORG").toUpperCase());
  return prefix;
}

/**
 * Generiert eine vollständige Belegnummer aus Muster + Counter.
 */
export function buildDocumentId(
  patternCfg: DocumentNumberPattern,
  firstName: string,
  lastName: string,
  counter: number,
  date: Date = new Date(),
): string {
  const prefix = buildDocumentPrefix(patternCfg, firstName, lastName, date);
  return `${prefix}${String(counter).padStart(patternCfg.counterDigits, "0")}`;
}

/**
 * Prüft ob ein documentId dem konfigurierten Muster entspricht (grobe Validierung).
 * Gibt true zurück wenn der String nicht-leer ist und alphanumerische Zeichen + Bindestriche enthält.
 */
export function isValidDocumentId(documentId: string): boolean {
  return /^[A-Za-z0-9\-_]{2,30}$/.test(documentId.trim());
}

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
  /* c8 ignore next */
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
    /* c8 ignore next */
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

export interface DocumentNumberEntry {
  id: string;
  document_id: string;
  created_at?: string;
}

/**
 * Gibt alle Belegnummern eines Benutzers zurück, optional gefiltert nach Organisation.
 */
export async function getUserDocumentNumbers(
  userId: string,
  organizationId?: string,
): Promise<DocumentNumberEntry[]> {
  if (!isTableAvailable) return [];

  const supabase = createClient();
  let query = supabase
    .from("document_numbers")
    .select("id, document_id, created_at")
    .eq("user_id", userId)
    .order("document_id", { ascending: true });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === "PGRST") isTableAvailable = false;
    return [];
  }

  return (data ?? []) as DocumentNumberEntry[];
}

/**
 * Löscht eine einzelne Belegnummer anhand ihrer DB-ID.
 * Nur eigene Einträge dürfen gelöscht werden (userId als Sicherheitsprüfung).
 */
export async function deleteDocumentNumberById(
  id: string,
  userId: string,
): Promise<void> {
  if (!isTableAvailable) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("document_numbers")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error && error.code !== "PGRST") {
    throw new Error("Belegnummer konnte nicht gelöscht werden: " + error.message);
  }
}
