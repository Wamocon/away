import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ORPHANS = [
  '16df0da7-f655-447b-bf3e-4445d253b807',
  '330a04fe-5446-4375-b428-194c2901e5d3',
  '3db76798-c8e5-40d1-b76c-2ceb0b3ed599',
  '31260f1b-f549-4680-b20b-c71fb5917316',
  '4233dee0-de1f-4d04-b7fa-57fceca08384',
  '86ef364f-2259-4480-a131-0717b036a1a5',
  '07af0543-a3c9-4a68-a783-493df8a297b8',
];

for (const schema of ['away-dev', 'away-test']) {
  const sb = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema }
  });
  for (const table of ['user_roles', 'user_settings']) {
    const { error } = await sb.from(table).delete().in('user_id', ORPHANS);
    console.log(error ? '✗' : '✓', `${schema}.${table}`, error?.message ?? 'bereinigt');
  }
}
console.log('\n✅ Bereinigung abgeschlossen.');
