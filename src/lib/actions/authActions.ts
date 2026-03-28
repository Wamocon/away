'use server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSchema } from '@/lib/supabase/config';

/**
 * Erstellt einen Supabase-Client mit Admin-Rechten (Server-Side only)
 */
async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = getSchema();
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY fehlt.');
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
 * Schließt die Registrierung ab:
 * 1. Setzt die Rolle des Nutzers in der DB (via Admin-API)
 */
export async function completeInvitationAction(orgId: string, role: string) {
  try {
    const supabase = await createServerClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      throw new Error('Nicht authentifiziert');
    }

    const userId = session.user.id;
    const admin = await createAdminClient();

    // 0. Prüfen, ob Organisation existiert
    const { data: orgExists, error: orgError } = await admin
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .single();

    if (orgError || !orgExists) {
      throw new Error('Organisation existiert nicht mehr.');
    }

    // 1. In user_roles einfügen (upsert)
    const { error: roleError } = await admin
      .from('user_roles')
      .upsert({
        user_id: userId,
        organization_id: orgId,
        role: role
      }, { onConflict: 'user_id, organization_id' });

    if (roleError) {
      console.error('Role Upsert Error:', roleError);
      throw new Error(`Konnte Rolle nicht setzen: ${roleError.message}`);
    }

    console.log(`[AUTH] Invitation completed for user ${userId} (Org: ${orgId}, Role: ${role})`);
    return { success: true };
  } catch (err) {
    console.error('SERVER ACTION ERROR (completeInvitation):', err);
    throw err instanceof Error ? err : new Error('Ein unbekannter Fehler ist aufgetreten');
  }
}
