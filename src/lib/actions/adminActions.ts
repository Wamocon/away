'use server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { UserRole } from '@/lib/roles';
import { getSchema } from '@/lib/supabase/config';

/**
 * Erstellt einen Supabase-Client mit Admin-Rechten (Server-Side only)
 */
async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = getSchema();
  
  if (!supabaseServiceKey) {
    console.error('SERVER-FEHLER: SUPABASE_SERVICE_ROLE_KEY fehlt.');
    throw new Error('Konfigurationsfehler: Admin-Schlüssel fehlt.');
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    db: { schema },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Holt alle Mitglieder einer Organisation inklusive E-Mails via Admin-API
 */
export async function getOrgMembersWithEmails(orgId: string) {
  try {
    const supabase = await createServerClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return { error: 'Nicht authentifiziert: Bitte melde dich neu an.' };
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('organization_id', orgId)
      .single();

    if (roleData?.role !== 'admin') {
      return { error: 'Keine Berechtigung: Nur Administratoren können die Benutzerliste einsehen.' };
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .eq('organization_id', orgId)
      .order('created_at');

    if (rolesError) throw rolesError;
    if (!roles) return { data: [] };

    const adminClient = await createAdminClient();
    
    const members = await Promise.all(
      roles.map(async (m) => {
        try {
          const { data: userData } = await adminClient.auth.admin.getUserById(m.user_id);
          return {
            user_id: m.user_id,
            role: m.role as UserRole,
            created_at: m.created_at,
            email: userData?.user?.email
          };
        } catch (err) {
          return {
            user_id: m.user_id,
            role: m.role as UserRole,
            created_at: m.created_at,
          };
        }
      })
    );

    return { data: members };
  } catch (err) {
    console.error('Kritischer Fehler in getOrgMembersWithEmails:', err);
    return { error: 'Ein interner Fehler ist beim Laden der Mitglieder aufgetreten.' };
  }
}

/**
 * Lädt einen Benutzer via Admin-API in eine Organisation ein
 */
export async function inviteUserToOrg(email: string, orgId: string, role: UserRole, origin: string) {
  try {
    const supabase = await createServerClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Nicht authentifiziert: Bitte melde dich neu an.' };

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('organization_id', orgId)
      .single();

    if (roleData?.role !== 'admin') {
      return { error: 'Keine Berechtigung: Nur Administratoren können Personen einladen.' };
    }

    const adminClient = await createAdminClient();

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { organization_id: orgId, role: role },
      redirectTo: `${origin}/auth/accept-invite?org=${orgId}&role=${role}`,
    });

    if (inviteError) {
      console.error('Supabase Invite Error:', inviteError);
      return { error: `Einladungsfehler: ${inviteError.message}` };
    }

    return { success: true };
  } catch (err) {
    console.error('Fehler bei der Einladung:', err);
    const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return { error: `Server-Fehler: ${msg}` };
  }
}

// Trigger Redeploy: 2026-03-28 (Fix SUPABASE_SERVICE_ROLE_KEY)
