/**
 * Löscht das nikolaj.schefner@gmail.com Duplikat
 * (zuerst FK-abhängige Einträge entfernen, dann User löschen)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

const GMAIL_NIKOLAJ_ID = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';

async function main() {
  console.log(`Lösche FK-Einträge für ${GMAIL_NIKOLAJ_ID} ...`);

  // public.super_admins
  const { error: e1 } = await supabase
    .from('super_admins')
    .delete()
    .eq('user_id', GMAIL_NIKOLAJ_ID);
  console.log('super_admins:', e1 ? `✗ ${e1.message}` : '✓');

  // away-prod user_roles / user_settings
  for (const schema of ['away-prod', 'away-dev', 'away-test']) {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema }
    });
    const { error: r } = await sb.from('user_roles').delete().eq('user_id', GMAIL_NIKOLAJ_ID);
    const { error: s } = await sb.from('user_settings').delete().eq('user_id', GMAIL_NIKOLAJ_ID);
    console.log(`${schema} user_roles: `, r ? `✗ ${r.message}` : '✓');
    console.log(`${schema} user_settings:`, s ? `✗ ${s.message}` : '✓');
  }

  // Jetzt User löschen
  const { error: delErr } = await supabase.auth.admin.deleteUser(GMAIL_NIKOLAJ_ID);
  if (delErr) {
    console.error(`✗ User-Löschung fehlgeschlagen: ${delErr.message}`);
    console.log('\nFalls FK-Constraint in einer anderen Tabelle, führe das im SQL Editor aus:');
    console.log(`
-- Alle Referenzen auf den gmail-Nikolaj finden und löschen
DELETE FROM public.super_admins WHERE user_id = '${GMAIL_NIKOLAJ_ID}';
DELETE FROM auth.identities WHERE user_id = '${GMAIL_NIKOLAJ_ID}';
DELETE FROM auth.sessions WHERE user_id = '${GMAIL_NIKOLAJ_ID}';
DELETE FROM auth.refresh_tokens WHERE user_id = '${GMAIL_NIKOLAJ_ID}';
DELETE FROM auth.mfa_factors WHERE user_id = '${GMAIL_NIKOLAJ_ID}';
DELETE FROM auth.users WHERE id = '${GMAIL_NIKOLAJ_ID}';
    `);
  } else {
    console.log(`✓ nikolaj.schefner@gmail.com gelöscht`);
  }
}

main().catch(console.error);
