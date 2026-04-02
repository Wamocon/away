"use server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/roles";
import { getSchema } from "@/lib/supabase/config";

/**
 * Erstellt einen Supabase-Client mit Admin-Rechten (Server-Side only)
 */
async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = getSchema();

  if (!supabaseServiceKey) {
    console.error("SERVER-FEHLER: SUPABASE_SERVICE_ROLE_KEY fehlt.");
    throw new Error("Konfigurationsfehler: Admin-Schlüssel fehlt.");
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    db: { schema },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Holt alle Mitglieder einer Organisation inklusive E-Mails via Admin-API
 */
export async function getOrgMembersWithEmails(orgId: string) {
  try {
    const supabase = await createServerClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return { error: "Nicht authentifiziert: Bitte melde dich neu an." };
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", orgId)
      .single();

    if (roleData?.role !== "admin") {
      return {
        error:
          "Keine Berechtigung: Nur Administratoren können die Benutzerliste einsehen.",
      };
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .eq("organization_id", orgId)
      .order("created_at");

    if (rolesError) throw rolesError;
    if (!roles) return { data: [] };

    const adminClient = await createAdminClient();

    const members = await Promise.all(
      roles.map(async (m) => {
        try {
          const { data: userData } = await adminClient.auth.admin.getUserById(
            m.user_id,
          );
          return {
            user_id: m.user_id,
            role: m.role as UserRole,
            created_at: m.created_at,
            email: userData?.user?.email,
          };
        } catch (err) {
          return {
            user_id: m.user_id,
            role: m.role as UserRole,
            created_at: m.created_at,
          };
        }
      }),
    );

    return { data: members };
  } catch (err) {
    console.error("Kritischer Fehler in getOrgMembersWithEmails:", err);
    return {
      error: "Ein interner Fehler ist beim Laden der Mitglieder aufgetreten.",
    };
  }
}

/**
 * Lädt einen Benutzer via Admin-API in eine Organisation ein
 */
export async function inviteUserToOrg(
  email: string,
  orgId: string,
  role: UserRole,
  origin: string,
) {
  try {
    const supabase = await createServerClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      return { error: "Nicht authentifiziert: Bitte melde dich neu an." };

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", orgId)
      .single();

    if (roleData?.role !== "admin") {
      return {
        error:
          "Keine Berechtigung: Nur Administratoren können Personen einladen.",
      };
    }

    const adminClient = await createAdminClient();

    const { error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { organization_id: orgId, role: role },
        redirectTo: `${origin}/auth/accept-invite?org=${orgId}&role=${role}`,
      });

    if (inviteError) {
      console.error("Supabase Invite Error:", inviteError);
      let msg = inviteError.message;
      if (msg.includes("email rate limit exceeded")) {
        msg =
          "E-Mail-Limit überschritten. Bitte warte eine Stunde, bevor du weitere Einladungen verschickst.";
      } else if (msg.includes("User already registered")) {
        msg = "Dieser Benutzer ist bereits registriert.";
      } else {
        // Allgemeine Übersetzung für unbekannte Fehler (optional)
        msg = `Einladungsfehler: ${msg}`;
      }
      return { error: msg };
    }

    return { success: true };
  } catch (err) {
    console.error("Fehler bei der Einladung:", err);
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    return { error: `Server-Fehler: ${msg}` };
  }
}

/**
 * Lädt Approver/CIO/Admin einer Organisation für interne Benachrichtigungen.
 * Verwendet Service-Role-Key – KEIN User-Auth-Check erforderlich.
 * NUR serverseitig verwenden.
 */
export async function getOrgApproversForNotification(
  orgId: string,
): Promise<{ user_id: string; role: string; email?: string }[]> {
  try {
    const adminClient = await createAdminClient();

    const { data: roles, error } = await adminClient
      .from("user_roles")
      .select("user_id, role")
      .eq("organization_id", orgId)
      .in("role", ["admin", "cio", "approver"]);

    if (error || !roles) return [];

    const members = await Promise.all(
      roles.map(async (m) => {
        // 1) Versuche E-Mail aus user_settings zu lesen
        try {
          const { data: s } = await adminClient
            .from("user_settings")
            .select("settings")
            .eq("user_id", m.user_id)
            .eq("organization_id", orgId)
            .maybeSingle();
          const settingsEmail = (
            s?.settings as Record<string, string> | undefined
          )?.email;
          if (settingsEmail)
            return { user_id: m.user_id, role: m.role, email: settingsEmail };
        } catch {
          /* ignore */
        }

        // 2) Fallback: Auth-E-Mail via Admin-API
        try {
          const { data: userData } = await adminClient.auth.admin.getUserById(
            m.user_id,
          );
          return {
            user_id: m.user_id,
            role: m.role,
            email: userData?.user?.email,
          };
        } catch {
          /* ignore */
        }

        return { user_id: m.user_id, role: m.role };
      }),
    );

    return members;
  } catch (err) {
    console.error("[getOrgApproversForNotification] Fehler:", err);
    return [];
  }
}

// Trigger Redeploy: 2026-03-28 (Fix SUPABASE_SERVICE_ROLE_KEY)
