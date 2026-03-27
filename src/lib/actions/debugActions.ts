'use server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * Erstellt einen Supabase-Client mit Admin-Rechten (Server-Side only)
 */
async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const schema = process.env.NEXT_PUBLIC_SCHEMA || 'away-dev';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase Credentials fehlen in .env.local');
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
 * Erzwingt einen Rollenwechsel für den aktuellen Benutzer.
 * Nutzt den Service Role Key, um jegliche RLS-Einschränkungen zu umgehen.
 */
export async function toggleUserRoleAction(newRole: string) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Nicht authentifiziert');

    const userId = session.user.id;
    const admin = await createAdminClient();

    // 1. Organisation ermitteln
    // Wir suchen nach der ersten verfügbaren Organisation als primäres Ziel
    const { data: orgs, error: orgError } = await admin
      .from('organizations')
      .select('id')
      .limit(1);

    if (orgError) {
      console.error('Org Fetch Error:', orgError);
      throw new Error(`Konnte Organisationen nicht laden: ${orgError.message}`);
    }

    const orgId = orgs && orgs.length > 0 ? orgs[0].id : null;

    if (!orgId) {
      throw new Error('Keine Organisation im Datenbank-Schema gefunden. Bitte erst eine Organisation anlegen.');
    }

    console.log(`[DEBUG] Nutzer ${userId} wechselt zu Rolle "${newRole}" in Org "${orgId}"`);

    // 2. Bestehende Rollen in DIESER Organisation löschen
    const { error: deleteError } = await admin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', orgId);

    if (deleteError) {
      console.error('Delete Role Error:', deleteError);
    }

    // 3. Neue Rolle einfügen
    const { error: insertError } = await admin
      .from('user_roles')
      .insert({
        user_id: userId,
        organization_id: orgId,
        role: newRole
      });

    if (insertError) {
      console.error('Insert Role Error:', insertError);
      throw new Error(`Rollenwechsel fehlgeschlagen: ${insertError.message}`);
    }

    return { success: true, newRole };
  } catch (err: any) {
    console.error('SERVER ACTION ERROR:', err);
    throw new Error(err.message || 'Interner Server-Fehler beim Rollenwechsel');
  }
}
