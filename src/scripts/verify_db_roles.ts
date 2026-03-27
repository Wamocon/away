import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

/**
 * Automatisierter Datenbank-Rollen-Validierer.
 * Prüft gegen das away-dev Schema, ob alle Rollen akzeptiert werden.
 */
async function verifyRoles() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const schema = 'away-dev';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ FEHLER: Supabase URL oder Service Key fehlen in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema }
  });

  console.log(`🔍 Starte Rollen-Validierung für Schema: ${schema}...`);

  const testRoles = ['admin', 'cio', 'department_lead', 'approver', 'employee'];
  const testUserId = '58e8e8f8-e925-482c-8b11-adbe91fe940a'; // Beispiel-Nutzer aus deinem Schema

  let allGreen = true;

  for (const role of testRoles) {
    process.stdout.write(`⏳ Prüfe Rolle [${role.padEnd(15)}] ... `);
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role })
      .eq('user_id', testUserId);

    if (error) {
      process.stdout.write(`❌ FEHLGESCHLAGEN: (Code: ${error.code}) ${error.message}\n`);
      allGreen = false;
    } else {
      process.stdout.write(`✅ GRÜN\n`);
    }
  }

  if (allGreen) {
    console.log('\n✨ ERGEBNIS: Alle Rollen-Checks sind GRÜN. Die Datenbank-Constraints sind korrekt konfiguriert!');
  } else {
    console.error('\n⚠️  WARNUNG: Einige Rollen-Checks sind FEHLGESCHLAGEN. Bitte führe das SQL-Fix-Skript erneut aus.');
    process.exit(1);
  }
}

verifyRoles();
