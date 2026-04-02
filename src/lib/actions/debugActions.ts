'use server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSchema } from '@/lib/supabase/config';

/**
 * Erstellt einen Supabase-Client mit Admin-Rechten (Server-Side only)
 */
async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const schema = getSchema();
  
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

    // 1. Organisationen des Nutzers ermitteln
    const { data: userOrgs, error: orgError } = await admin
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', userId);

    if (orgError) {
      console.error('User Orgs Fetch Error:', orgError);
      throw new Error(`Konnte Organisationen des Nutzers nicht laden: ${orgError.message}`);
    }

    let orgIds = userOrgs?.map(o => o.organization_id) || [];
    
    // Fallback: Falls der User in keiner Org ist, nehmen wir die allererste verfügbare Org im System
    if (orgIds.length === 0) {
      console.log(`[DEBUG] Nutzer ${userId} hat keine Org-Verknüpfung. Suche System-Standard...`);
      const { data: allOrgs } = await admin.from('organizations').select('id').order('created_at', { ascending: true }).limit(1);
      if (allOrgs && allOrgs.length > 0) {
        orgIds = [allOrgs[0].id];
        console.log(`[DEBUG] Fallback-Org gefunden: ${orgIds[0]}`);
      }
    }

    if (orgIds.length === 0) {
      throw new Error('Keine Organisation im System gefunden. Bitte erstelle erst eine Organisation im Admin-Bereich (als Admin).');
    }

    console.log(`[DEBUG] Nutzer ${userId} wechselt zu Rolle "${newRole}" in ${orgIds.length} Orgs`);

    // 2. Bestehende Rollen in ALLEN gefundenen Organisationen löschen
    await admin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .in('organization_id', orgIds);

    // 3. Neue Rolle für JEDE Organisation einfügen
    const inserts = orgIds.map(oid => ({
      user_id: userId,
      organization_id: oid,
      role: newRole
    }));

    const { error: insertError } = await admin
      .from('user_roles')
      .insert(inserts);

    if (insertError) {
      console.error('Insert Role Error:', insertError);
      throw new Error(`Rollenwechsel fehlgeschlagen: ${insertError.message}`);
    }

    return { success: true, newRole };
  } catch (err: unknown) {
    const errorBody = err instanceof Error ? err.message : String(err);
    console.error('SERVER ACTION ERROR:', err);
    throw new Error(errorBody || 'Interner Server-Fehler beim Rollenwechsel');
  }
}
