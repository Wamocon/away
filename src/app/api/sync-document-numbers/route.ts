import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  DocumentNumberPattern,
  DEFAULT_PATTERN,
  buildDocumentPrefix,
  buildDocumentId,
  isValidDocumentId,
} from "@/lib/documentNumbers";

/**
 * POST /api/sync-document-numbers
 *
 * Durchläuft alle Urlaubsanträge einer Organisation:
 * - Hat ein Antrag eine valide Belegnummer (template_fields.documentId)?
 *   → Diese wird in der document_numbers-Tabelle registriert (falls noch nicht vorhanden).
 * - Hat ein Antrag keine oder eine ungültige Belegnummer?
 *   → Eine neue wird chronologisch (nach created_at) vergeben, in template_fields gespeichert
 *     und in document_numbers registriert.
 *
 * Nur Admins/CIOs dürfen diese Route aufrufen.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const schema = process.env.NEXT_PUBLIC_DB_SCHEMA ?? "away-dev";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  // Auth prüfen
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orgId, pattern } = body as { orgId?: string; pattern?: DocumentNumberPattern };

  if (!orgId) {
    return NextResponse.json({ error: "orgId missing" }, { status: 400 });
  }

  // Nur Admin/CIO darf das ausführen
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .maybeSingle();

  const role = (roleRow as { role?: string } | null)?.role ?? "employee";
  if (role !== "admin" && role !== "cio") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patternCfg: DocumentNumberPattern = pattern ?? DEFAULT_PATTERN;

  // Alle Anträge dieser Organisation chronologisch laden
  const { data: requests, error: reqErr } = await supabase
    .from("vacation_requests")
    .select("id, user_id, created_at, template_fields")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (reqErr) {
    return NextResponse.json({ error: reqErr.message }, { status: 500 });
  }

  // Bereits registrierte Belegnummern für diese Org laden (für Duplikat-Check)
  const { data: existingNums } = await supabase
    .from("document_numbers")
    .select("document_id, user_id")
    .eq("organization_id", orgId);

  const registeredSet = new Set<string>(
    (existingNums ?? []).map((r: { document_id: string }) => r.document_id)
  );

  // Pro User: laufender Counter (prefix → nächste Nummer)
  const counterMap = new Map<string, number>();

  // Holt den aktuellen DB-Counter für einen Prefix (einmalig pro Prefix)
  const getOrInitCounter = async (prefix: string): Promise<number> => {
    if (counterMap.has(prefix)) return counterMap.get(prefix)!;

    // Höchste Nummer aus bereits registrierten Belegnummern extrahieren
    let maxNum = -1;
    for (const docId of registeredSet) {
      if (docId.startsWith(prefix)) {
        const suffix = docId.slice(prefix.length);
        const n = parseInt(suffix, 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    counterMap.set(prefix, next);
    return next;
  };

  let fixed = 0;
  let registered = 0;

  for (const req of requests ?? []) {
    const tf = (req.template_fields ?? {}) as Record<string, unknown>;
    const existingDocId = typeof tf.documentId === "string" ? tf.documentId.trim() : "";

    if (existingDocId && isValidDocumentId(existingDocId)) {
      // Valide Belegnummer vorhanden – nur registrieren wenn noch nicht in Tabelle
      if (!registeredSet.has(existingDocId)) {
        const { error: insErr } = await supabase.from("document_numbers").insert([{
          organization_id: orgId,
          user_id: req.user_id,
          document_id: existingDocId,
        }]);
        if (!insErr) {
          registeredSet.add(existingDocId);
          registered++;
        }
      }
    } else {
      // Keine oder ungültige Belegnummer – neue generieren
      // Vorname/Nachname aus template_fields oder Fallback
      const firstName = typeof tf.firstName === "string" && tf.firstName ? tf.firstName : "X";
      const lastName = typeof tf.lastName === "string" && tf.lastName ? tf.lastName : "XX";
      const createdAt = req.created_at ? new Date(req.created_at) : new Date();

      const prefix = buildDocumentPrefix(patternCfg, firstName, lastName, createdAt);
      const counter = await getOrInitCounter(prefix);
      const newDocId = buildDocumentId(patternCfg, firstName, lastName, counter, createdAt);

      // Counter für nächsten Antrag mit gleichem Prefix erhöhen
      counterMap.set(prefix, counter + 1);

      // template_fields aktualisieren
      const updatedFields = { ...tf, documentId: newDocId };
      await supabase
        .from("vacation_requests")
        .update({ template_fields: updatedFields })
        .eq("id", req.id);

      // In document_numbers registrieren
      const { error: insErr } = await supabase.from("document_numbers").insert([{
        organization_id: orgId,
        user_id: req.user_id,
        document_id: newDocId,
      }]);

      if (!insErr) {
        registeredSet.add(newDocId);
        registered++;
      }
      fixed++;
    }
  }

  return NextResponse.json({ fixed, registered });
}
