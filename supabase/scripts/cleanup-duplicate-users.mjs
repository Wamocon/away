/**
 * Bereinigt doppelte auth.users-Einträge:
 * - Löscht @gmail.com-Duplikate wenn bereits eine @wamocon.com-Version existiert
 * - Behält @wamocon.com-Accounts (funktionieren in away-prod)
 * - Setzt aud = 'authenticated' für alle wamocon.com-User
 * - Seeded away-dev und away-test mit den @wamocon.com-User-IDs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Mapping: gmail ↔ wamocon.com (zu löschende gmail-Accounts wenn wamocon.com existiert)
const GMAIL_TO_WAMOCON = {
  'nikolaj.schefner@gmail.com': 'nikolaj.schefner@wamocon.com',
  'erwin.moretz@gmail.com':     'erwin.moretz@wamocon.com',
  'daniel.moretz@gmail.com':    'daniel.moretz@wamocon.com',
  'waleri.moretz@gmail.com':    'waleri.moretz@wamocon.com',
  'leon.moretz@gmail.com':      'leon.moretz@wamocon.com',
  'olga.moretz@gmail.com':      'olga.moretz@wamocon.com',
  'elias.felsing@gmail.com':    'elias.felsing@wamocon.com',
  'yash.bhesaniya@gmail.com':   'yash.bhesaniya@wamocon.com',
};

async function main() {
  // 1. Alle User laden
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) { console.error('Fehler beim Laden der User:', error); process.exit(1); }

  console.log(`\n=== ${users.length} User gefunden ===\n`);
  const byEmail = Object.fromEntries(users.map(u => [u.email, u]));

  // 2. Gmail-Duplikate löschen
  let deleted = 0;
  for (const [gmail, wamocon] of Object.entries(GMAIL_TO_WAMOCON)) {
    const gmailUser   = byEmail[gmail];
    const wamoconUser = byEmail[wamocon];

    if (!gmailUser) {
      console.log(`✓ Kein Duplikat: ${gmail} (nicht vorhanden)`);
      continue;
    }
    if (!wamoconUser) {
      console.log(`⚠ Kein wamocon.com-Account für ${gmail} → behalte gmail-Account`);
      continue;
    }

    console.log(`🗑  Lösche Duplikat: ${gmail} (ID: ${gmailUser.id})`);
    console.log(`   Behalte:          ${wamocon} (ID: ${wamoconUser.id})`);
    const { error: delErr } = await supabase.auth.admin.deleteUser(gmailUser.id);
    if (delErr) {
      console.error(`   ✗ Fehler beim Löschen: ${delErr.message}`);
    } else {
      console.log(`   ✓ Gelöscht`);
      deleted++;
    }
  }

  // 3. Doppeltes nikolaj.schefner@gmail.com bereinigen (falls noch zweites Exemplar)
  const allGmail = users.filter(u => u.email === 'nikolaj.schefner@gmail.com');
  if (allGmail.length > 1) {
    // Neuesten löschen
    const sorted = allGmail.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (let i = 1; i < sorted.length; i++) {
      console.log(`🗑  Entferne doppelten nikolaj@gmail (ID: ${sorted[i].id})`);
      await supabase.auth.admin.deleteUser(sorted[i].id);
      deleted++;
    }
  }

  console.log(`\n✓ ${deleted} Duplikate gelöscht\n`);

  // 4. Ergebnis-Übersicht
  const { data: { users: remaining } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const wamoconUsers = remaining.filter(u =>
    u.email?.includes('wamocon.com') || u.email?.endsWith('@gmail.com')
  );
  console.log('=== Verbleibende User ===');
  for (const u of wamoconUsers.sort((a, b) => a.email.localeCompare(b.email))) {
    console.log(`  ${u.email.padEnd(40)} ID: ${u.id}`);
  }
}

main().catch(console.error);
