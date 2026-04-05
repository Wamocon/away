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

    // Admin-Client nutzen, damit RLS-Policy "Role_Self" umgangen wird
    // (normale Clients sehen nur die eigene Zeile)
    const adminClient = await createAdminClient();

    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("user_id, role, created_at")
      .eq("organization_id", orgId)
      .order("created_at");

    if (rolesError) throw rolesError;
    if (!roles) return { data: [] };

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

/**
 * Listet ALLE Auth-User auf (Admin-API).
 * Nur für Admins verwendbar.
 */
export async function getAllAuthUsers(orgId: string) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: "Nicht authentifiziert." };

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", orgId)
      .single();

    if (roleData?.role !== "admin") {
      return { error: "Keine Berechtigung." };
    }

    const adminClient = await createAdminClient();

    // Bestehende Mitglieder der Org laden
    const { data: existingRoles } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", orgId);
    const existingIds = new Set((existingRoles ?? []).map((r) => r.user_id));

    // Alle Auth-User laden
    const { data: usersData, error } =
      await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    const users = usersData.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      isInOrg: existingIds.has(u.id),
    }));

    return { data: users };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Weist einen oder mehrere Benutzer einer Organisation zu.
 * Erstellt user_roles und user_settings Einträge.
 */
export async function assignUsersToOrg(
  userIds: string[],
  orgId: string,
  role: UserRole = "employee",
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: "Nicht authentifiziert." };

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", orgId)
      .single();

    if (roleData?.role !== "admin") {
      return { error: "Keine Berechtigung." };
    }

    const adminClient = await createAdminClient();

    const roleRows = userIds.map((uid) => ({
      user_id: uid,
      organization_id: orgId,
      role,
    }));

    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert(roleRows, { onConflict: "user_id,organization_id" });
    if (roleError) throw roleError;

    // Fehlende user_settings anlegen
    const settingsRows = userIds.map((uid) => ({
      user_id: uid,
      organization_id: orgId,
      settings: {},
    }));
    await adminClient
      .from("user_settings")
      .upsert(settingsRows, { onConflict: "user_id,organization_id" });

    return { success: true, count: userIds.length };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Liest die Einstellungen eines einzelnen Mitglieds (für Admin-Inline-Bearbeitung).
 */
export async function getMemberSettings(targetUserId: string, orgId: string) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: "Nicht authentifiziert." };

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", orgId)
      .single();

    if (roleData?.role !== "admin") {
      return { error: "Keine Berechtigung." };
    }

    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from("user_settings")
      .select("settings")
      .eq("user_id", targetUserId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (error) throw error;
    return { data: (data?.settings as Record<string, unknown>) || {} };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Aktualisiert die Einstellungen eines einzelnen Mitglieds (Admin-Funktion).
 */
export async function updateMemberSettings(
  targetUserId: string,
  orgId: string,
  settings: Record<string, unknown>,
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: "Nicht authentifiziert." };

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", orgId)
      .single();

    if (roleData?.role !== "admin") {
      return { error: "Keine Berechtigung." };
    }

    const adminClient = await createAdminClient();

    // Bestehende Einstellungen lesen und mergen
    const { data: existing } = await adminClient
      .from("user_settings")
      .select("settings")
      .eq("user_id", targetUserId)
      .eq("organization_id", orgId)
      .maybeSingle();

    const current = (existing?.settings as Record<string, unknown>) || {};
    const merged = { ...current, ...settings };

    const { error } = await adminClient
      .from("user_settings")
      .upsert(
        { user_id: targetUserId, organization_id: orgId, settings: merged },
        { onConflict: "user_id,organization_id" },
      );

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Ordnet mehrere Mitarbeiter einem spezifischen Genehmiger zu.
 * Schreibt assignedApproverEmail in user_settings per Massen-Upsert.
 */
export async function assignApproverToUsers(
  orgId: string,
  approverEmail: string,
  userIds: string[],
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: "Nicht authentifiziert." };

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", orgId)
      .single();

    if (roleData?.role !== "admin") {
      return { error: "Keine Berechtigung." };
    }

    const adminClient = await createAdminClient();

    // Für jeden User: bestehende Settings laden, mergen, upserten
    await Promise.all(
      userIds.map(async (uid) => {
        const { data: existing } = await adminClient
          .from("user_settings")
          .select("settings")
          .eq("user_id", uid)
          .eq("organization_id", orgId)
          .maybeSingle();

        const current = (existing?.settings as Record<string, unknown>) || {};
        const merged = { ...current, assignedApproverEmail: approverEmail };

        await adminClient
          .from("user_settings")
          .upsert(
            { user_id: uid, organization_id: orgId, settings: merged },
            { onConflict: "user_id,organization_id" },
          );
      }),
    );

    return { success: true, count: userIds.length };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Liest den zugeordneten Genehmiger eines Mitarbeiters.
 * Liefert {name, email} aus den Org-Genehmigerliste oder null wenn nicht gesetzt.
 */
export async function getAssignedApprover(
  userId: string,
  orgId: string,
): Promise<{ name: string; email: string } | null> {
  try {
    const adminClient = await createAdminClient();
    const { data } = await adminClient
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .maybeSingle();

    const assignedEmail = (
      data?.settings as Record<string, string> | undefined
    )?.assignedApproverEmail;
    if (!assignedEmail) return null;

    // Suche passendes {name, email} aus der Org-Genehmigerliste
    const { data: org } = await adminClient
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single();

    const approverEmails = (
      (org?.settings as Record<string, unknown>)
        ?.approverEmails as { name: string; email: string }[]
    ) || [];

    const found = approverEmails.find((a) => a.email === assignedEmail);
    if (found) return found;

    // Fallback: E-Mail ohne Namen zurückgeben
    return { name: "", email: assignedEmail };
  } catch {
    return null;
  }
}

// Trigger Redeploy: 2026-03-28 (Fix SUPABASE_SERVICE_ROLE_KEY)
