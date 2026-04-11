/**
 * Vollständige User-ID-Konsistenzprüfung über alle Apps und Schemas
 * AWAY:      away-dev, away-test, away-prod
 * TRACE:     trace-dev, trace-test, trace-prod
 * TeamRadar: public, test, prod
 */
import { createClient } from '@supabase/supabase-js';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Die gelöschten gmail-UUIDs
const DELETED_IDS = [
  'erwin.moretz@gmail.com  → 16df0da7-f655-447b-bf3e-4445d253b807',
  'daniel.moretz@gmail.com → 330a04fe-5446-4375-b428-194c2901e5d3',
  'waleri.moretz@gmail.com → 3db76798-c8e5-40d1-b76c-2ceb0b3ed599',
  'leon.moretz@gmail.com   → 31260f1b-f549-4680-b20b-c71fb5917316',
  'olga.moretz@gmail.com   → 4233dee0-de1f-4d04-b7fa-57fceca08384',
  'elias.felsing@gmail.com → 86ef364f-2259-4480-a131-0717b036a1a5',
  'yash.bhesaniya@gmail.com→ 07af0543-a3c9-4a68-a783-493df8a297b8',
];
const DELETED_UUIDS = [
  '16df0da7-f655-447b-bf3e-4445d253b807',
  '330a04fe-5446-4375-b428-194c2901e5d3',
  '3db76798-c8e5-40d1-b76c-2ceb0b3ed599',
  '31260f1b-f549-4680-b20b-c71fb5917316',
  '4233dee0-de1f-4d04-b7fa-57fceca08384',
  '86ef364f-2259-4480-a131-0717b036a1a5',
  '07af0543-a3c9-4a68-a783-493df8a297b8',
];

// Schema-Konfiguration: [schemaName, tabelle, userIdSpalte]
const CHECKS = [
  // AWAY
  ['away-prod',  'user_roles',        'user_id'],
  ['away-prod',  'user_settings',     'user_id'],
  ['away-prod',  'vacation_requests', 'user_id'],
  ['away-prod',  'calendar_events',   'user_id'],
  ['away-prod',  'legal_consents',    'user_id'],
  ['away-dev',   'user_roles',        'user_id'],
  ['away-dev',   'user_settings',     'user_id'],
  ['away-dev',   'vacation_requests', 'user_id'],
  ['away-dev',   'calendar_events',   'user_id'],
  ['away-test',  'user_roles',        'user_id'],
  ['away-test',  'user_settings',     'user_id'],
  ['away-test',  'vacation_requests', 'user_id'],
  ['away-test',  'calendar_events',   'user_id'],
  // TRACE
  ['trace-prod', 'org_memberships',      'user_id'],
  ['trace-prod', 'time_entries',         'user_id'],
  ['trace-prod', 'email_configs',        'user_id'],
  ['trace-prod', 'calendar_connections', 'user_id'],
  ['trace-dev',  'org_memberships',      'user_id'],
  ['trace-dev',  'time_entries',         'user_id'],
  ['trace-dev',  'email_configs',        'user_id'],
  ['trace-dev',  'calendar_connections', 'user_id'],
  ['trace-test', 'org_memberships',      'user_id'],
  ['trace-test', 'time_entries',         'user_id'],
  ['trace-test', 'email_configs',        'user_id'],
  ['trace-test', 'calendar_connections', 'user_id'],
  // TeamRadar
  ['public',     'members',       'user_id'],
  ['public',     'availabilities','user_id'],
  ['public',     'teams',         'user_id'],
  ['public',     'projects',      'user_id'],
  ['public',     'allocations',   'user_id'],
  ['public',     'user_consents', 'user_id'],
  ['public',     'notifications', 'user_id'],
  ['public',     'subscriptions', 'user_id'],
  ['public',     'oauth_tokens',  'user_id'],
  ['test',       'members',       'user_id'],
  ['test',       'availabilities','user_id'],
  ['test',       'teams',         'user_id'],
  ['test',       'projects',      'user_id'],
  ['test',       'allocations',   'user_id'],
  ['prod',       'members',       'user_id'],
  ['prod',       'availabilities','user_id'],
  ['prod',       'teams',         'user_id'],
  ['prod',       'projects',      'user_id'],
  ['prod',       'allocations',   'user_id'],
];

async function checkTable(schema, table, col) {
  const sb = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema }
  });
  const { data, error } = await sb
    .from(table)
    .select(col)
    .in(col, DELETED_UUIDS);

  if (error) {
    if (error.code === '42P01') return null; // Tabelle existiert nicht
    return { schema, table, error: error.message };
  }
  return { schema, table, orphans: data?.length ?? 0, rows: data };
}

async function main() {
  console.log('Gelöschte gmail-UUIDs:');
  DELETED_IDS.forEach(d => console.log(' ', d));
  console.log('\n=== Prüfe alle Schemas ===\n');

  const results = await Promise.all(
    CHECKS.map(([s, t, c]) => checkTable(s, t, c))
  );

  let totalOrphans = 0;
  let errors = [];

  for (const r of results) {
    if (!r) continue; // Tabelle nicht vorhanden
    if (r.error) { errors.push(r); continue; }
    if (r.orphans > 0) {
      console.log(`🚨 ORPHAN: ${r.schema}.${r.table} → ${r.orphans} Einträge mit gelöschten IDs!`);
      r.rows?.forEach(row => console.log('   ', JSON.stringify(row)));
      totalOrphans += r.orphans;
    } else {
      console.log(`  ✓ ${r.schema}.${r.table}`);
    }
  }

  // public.super_admins (immer public-Schema)
  const sbPub = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  });
  const { data: sa } = await sbPub.from('super_admins').select('user_id').in('user_id', DELETED_UUIDS);
  if (sa?.length) {
    console.log(`🚨 ORPHAN: public.super_admins → ${sa.length} Einträge!`);
    totalOrphans += sa.length;
  } else {
    console.log('  ✓ public.super_admins');
  }

  console.log('\n══════════════════════════════════════════');
  if (totalOrphans === 0) {
    console.log('✅ KEINE verwaisten Referenzen gefunden.');
    console.log('   Die gelöschten gmail-User wurden nirgendwo verwendet.');
  } else {
    console.log(`❌ ${totalOrphans} verwaiste Einträge gefunden — Reparatur nötig!`);
  }

  if (errors.length > 0) {
    console.log('\n⚠ Fehler bei folgenden Tabellen (wahrscheinlich nicht vorhanden):');
    errors.forEach(e => console.log(`  ${e.schema}.${e.table}: ${e.error}`));
  }
}

main().catch(console.error);
