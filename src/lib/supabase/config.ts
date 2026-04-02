/**
 * Ermittelt das korrekte Datenbankschema basierend auf der Umgebung.
 *
 * Priorität:
 * 1. NEXT_PUBLIC_DB_SCHEMA (In Vercel explizit pro Umgebung gesetzt)
 * 2. NEXT_PUBLIC_SCHEMA (Lokaler Fallback in .env.local)
 * 3. Automatische Erkennung via VERCEL_ENV
 */
export function getSchema(): string {
  // 1. Die von dir in Vercel gesetzte Variable (für Prod/Preview/Dev unterschiedlich)
  if (process.env.NEXT_PUBLIC_DB_SCHEMA) {
    return process.env.NEXT_PUBLIC_DB_SCHEMA;
  }

  // 2. Der bisherige lokale Standard
  if (process.env.NEXT_PUBLIC_SCHEMA) {
    return process.env.NEXT_PUBLIC_SCHEMA;
  }

  // 3. Fallback: Automatische Erkennung, falls die obigen Variablen fehlen
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || "development";
  if (env === "production") return "away-prod";
  if (env === "preview") return "away-test";

  return "away-dev";
}
