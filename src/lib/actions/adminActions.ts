'use server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { UserRole } from '@/lib/roles';

/**
 * Erstellt einen Supabase-Client mit Admin-Rechten (Server-Side only)
 */
async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const schema = process.env.NEXT_PUBLIC_SCHEMA || 'away-dev';
  
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
  const supabase = await createServerClient();
  
  // 1. Session prüfen
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Nicht authentifiziert');

  // 2. Prüfen, ob der anfragende Nutzer Admin in dieser Org ist
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .eq('organization_id', orgId)
    .single();

  if (roleData?.role !== 'admin') {
    throw new Error('Keine Berechtigung: Nur Administratoren können die Benutzerliste einsehen.');
  }

  // 3. Rollen aus der DB holen
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role, created_at')
    .eq('organization_id', orgId)
    .order('created_at');

  if (rolesError) throw rolesError;
  if (!roles) return [];

  // 4. E-Mails via Admin Client anreichern
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
        console.error(`Fehler beim Laden der E-Mail für ${m.user_id}:`, err);
        return {
          user_id: m.user_id,
          role: m.role as UserRole,
          created_at: m.created_at,
          email: undefined
        };
      }
    })
  );

  return members;
}
