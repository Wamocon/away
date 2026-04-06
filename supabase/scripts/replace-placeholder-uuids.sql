-- ============================================================
-- Away – Platzhalter-UUIDs durch echte UUIDs ersetzen
-- ============================================================
-- Ersetzt alle 00000000-0000-0000-0000-XXXXXXXXXXXX UUIDs
-- konsistent in auth.users, auth.identities und allen App-Schemas.
--
-- ⚠️  Nur in Dev/Test-Umgebungen ausführen!
-- ⚠️  Alle eingeloggten Sessions dieser User werden ungültig.
-- ============================================================

BEGIN;

-- ── 1. FK-Checks deaktivieren (für die Dauer der Transaktion) ──────────────
SET session_replication_role = replica;

-- ── 2. UUID-Mapping erstellen: alte Platzhalter → neue echte UUIDs ─────────
CREATE TEMP TABLE _uuid_map AS
SELECT
  u.id          AS old_uuid,
  gen_random_uuid() AS new_uuid,
  u.email       AS email
FROM auth.users u
WHERE u.id::text ~ '^0{8}-0{4}-0{4}-0{4}-0+[0-9]+$'
ORDER BY u.id;

-- Mapping ausgeben (zur Info)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM _uuid_map ORDER BY email LOOP
    RAISE NOTICE 'Mapping: % (%s) → %', r.old_uuid, r.email, r.new_uuid;
  END LOOP;
END;
$$;

-- ── 3. auth.identities aktualisieren ───────────────────────────────────────
UPDATE auth.identities i
SET
  user_id       = m.new_uuid,
  provider_id   = m.new_uuid::text,
  identity_data = jsonb_set(
    jsonb_set(i.identity_data, '{sub}',   to_jsonb(m.new_uuid::text)),
    '{email}', to_jsonb(m.email)
  )
FROM _uuid_map m
WHERE i.user_id = m.old_uuid;

-- ── 4. auth.users aktualisieren ────────────────────────────────────────────
UPDATE auth.users u
SET id = m.new_uuid
FROM _uuid_map m
WHERE u.id = m.old_uuid;

-- ── 5. public.super_admins aktualisieren ────────────────────────────────────
UPDATE public.super_admins sa
SET user_id = m.new_uuid
FROM _uuid_map m
WHERE sa.user_id = m.old_uuid;

-- ── 5b. auth.sessions aktualisieren (sonst bleiben Sessions ungültig) ───────
UPDATE auth.sessions s
SET user_id = m.new_uuid
FROM _uuid_map m
WHERE s.user_id = m.old_uuid;

-- ── 5c. auth.refresh_tokens aktualisieren ────────────────────────────────────
UPDATE auth.refresh_tokens rt
SET user_id = m.new_uuid
FROM _uuid_map m
WHERE rt.user_id = m.old_uuid;

-- ── 6. Alle App-Schemas aktualisieren ───────────────────────────────────────
DO $$
DECLARE
  schemas TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s TEXT;
  tbl TEXT;
  tables_with_user_id TEXT[] := ARRAY[
    'user_roles',
    'user_settings',
    'vacation_requests',
    'calendar_events',
    'document_numbers',
    'legal_consents'
  ];
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    FOREACH tbl IN ARRAY tables_with_user_id LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = s AND table_name = tbl
      ) THEN
        EXECUTE format(
          'UPDATE %I.%I t SET user_id = m.new_uuid FROM _uuid_map m WHERE t.user_id = m.old_uuid',
          s, tbl
        );
        RAISE NOTICE 'Aktualisiert: %.%', s, tbl;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- ── 7. FK-Checks wieder aktivieren ─────────────────────────────────────────
RESET session_replication_role;

-- ── 8. Ergebnis: neues Mapping anzeigen ────────────────────────────────────
SELECT
  m.old_uuid,
  m.new_uuid,
  m.email,
  u.id AS confirmed_in_auth
FROM _uuid_map m
JOIN auth.users u ON u.id = m.new_uuid
ORDER BY m.email;

COMMIT;
