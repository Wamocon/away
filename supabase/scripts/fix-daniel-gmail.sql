-- ============================================================
-- AWAY – Fix: daniel.moretz@gmail.com wiederherstellen
-- ============================================================
-- Problem: cleanup-gmail-accounts.sql hat Daniel's @gmail.com-Account
--          gelöscht. Nikolaj und Erwin wurden danach manuell neu angelegt,
--          Daniel wurde dabei vergessen → "Invalid login credentials".
--
-- Lösung: Account in auth.users + auth.identities neu anlegen und
--         in allen 3 Schemas (away-dev, away-test, away-prod) in die
--         WAMOCON GmbH einhängen.
--
-- Dieses Script ist IDEMPOTENT – bei erneutem Ausführen werden
-- vorhandene Einträge NICHT doppelt angelegt.
--
-- SCHRITT 1: Diagnose ausführen und Ausgabe prüfen
-- SCHRITT 2: Fix ausführen
-- SCHRITT 3: Verifikation ausführen
-- ============================================================


-- ── SCHRITT 1: Diagnose ──────────────────────────────────────────────────────
-- Zeigt den Ist-Zustand aller drei Moretz-Brüder zum Vergleich

SELECT
  u.email,
  u.id,
  u.email_confirmed_at IS NOT NULL                           AS email_confirmed,
  u.created_at,
  EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  )                                                          AS hat_identity,
  EXISTS (
    SELECT 1 FROM "away-test".user_roles ur WHERE ur.user_id = u.id
  )                                                          AS hat_rolle_test,
  (
    SELECT ur.role FROM "away-test".user_roles ur WHERE ur.user_id = u.id LIMIT 1
  )                                                          AS rolle_test
FROM auth.users u
WHERE u.email IN (
  'nikolaj.schefner@gmail.com',
  'erwin.moretz@gmail.com',
  'daniel.moretz@gmail.com',
  'waleri.moretz@gmail.com',
  'leon.moretz@gmail.com',
  'olga.moretz@gmail.com',
  'elias.felsing@gmail.com',
  'yash.bhesaniya@gmail.com',
  'maanik.garg@wamocon.com',
  'nurzhan.kukeyev@wamocon.com'
)
ORDER BY u.email;


-- ── SCHRITT 2: Fix ──────────────────────────────────────────────────────────

DO $$
DECLARE
  -- Stabile UUID für Daniel (konsistent mit seed-dev-test-users.sql)
  daniel_id    UUID := 'aa000001-0000-0000-0000-000000000003';
  daniel_email TEXT := 'daniel.moretz@gmail.com';

  -- Erwin als Referenz für Org-Zugehörigkeit (muss existieren)
  erwin_id     UUID;

  -- WAMOCON GmbH (stabile UUID aus init-prod-data.sql)
  wamocon_id   UUID := '10000000-0000-0000-0000-000000000001';

  schemas      TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s            TEXT;
  existing_id  UUID;
BEGIN

  -- ── auth.users ─────────────────────────────────────────────────────────────
  SELECT id INTO existing_id FROM auth.users WHERE id = daniel_id;

  IF existing_id IS NULL THEN
    -- Prüfe ob die E-Mail unter anderem UUID existiert (Altlast)
    SELECT id INTO existing_id FROM auth.users WHERE email = daniel_email;
    IF existing_id IS NOT NULL THEN
      RAISE NOTICE 'WARNUNG: % existiert bereits mit anderer UUID %. Passwort-Reset wird durchgeführt.', daniel_email, existing_id;
      UPDATE auth.users
        SET encrypted_password = crypt('TeamRadar2026!', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at         = now()
      WHERE id = existing_id;
      -- Weiter mit der gefundenen UUID
      daniel_id := existing_id;
    ELSE
      -- Komplett neu anlegen mit stabiler UUID
      INSERT INTO auth.users (
        id, instance_id, aud, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, role,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        daniel_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        daniel_email,
        crypt('TeamRadar2026!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"firstName":"Daniel","lastName":"Moretz"}',
        now(), now(),
        'authenticated',
        '', '', '', ''
      );
      RAISE NOTICE 'auth.users angelegt: % (UUID: %)', daniel_email, daniel_id;
    END IF;
  ELSE
    RAISE NOTICE 'auth.users bereits vorhanden: % (UUID: %)', daniel_email, daniel_id;
    -- Passwort sicherheitshalber aktualisieren
    UPDATE auth.users
      SET encrypted_password = crypt('TeamRadar2026!', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          aud                = 'authenticated',
          updated_at         = now()
    WHERE id = daniel_id;
    RAISE NOTICE 'Passwort für % aktualisiert.', daniel_email;
  END IF;

  -- ── auth.identities ────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = daniel_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      daniel_email,
      daniel_id,
      jsonb_build_object('sub', daniel_id::text, 'email', daniel_email),
      'email',
      now(), now(), now()
    );
    RAISE NOTICE 'auth.identities angelegt für %', daniel_email;
  ELSE
    RAISE NOTICE 'auth.identities bereits vorhanden für %', daniel_email;
  END IF;

  -- ── Erwin als Referenz laden (für Fallback-Org) ───────────────────────────
  SELECT id INTO erwin_id FROM auth.users WHERE email = 'erwin.moretz@gmail.com';

  -- ── Schemas: user_roles + user_settings ───────────────────────────────────
  FOREACH s IN ARRAY schemas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = s
    ) THEN

      -- Org sicherstellen
      EXECUTE format(
        'INSERT INTO %I.organizations (id, name) VALUES (%L, %L) ON CONFLICT (id) DO NOTHING',
        s, wamocon_id, 'WAMOCON GmbH'
      );

      -- Rolle setzen (department_lead = Abteilungsleiter)
      EXECUTE format('
        INSERT INTO %I.user_roles (user_id, organization_id, role)
        VALUES (%L, %L, %L)
        ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role
      ', s, daniel_id, wamocon_id, 'department_lead');

      -- Einstellungen setzen
      EXECUTE format('
        INSERT INTO %I.user_settings (user_id, organization_id, settings)
        VALUES (%L, %L, %L::jsonb)
        ON CONFLICT (user_id, organization_id) DO NOTHING
      ', s, daniel_id, wamocon_id,
         '{"firstName":"Daniel","lastName":"Moretz","email":"daniel.moretz@gmail.com","vacationQuota":30,"carryOver":0}'
      );

      RAISE NOTICE 'Schema %: daniel.moretz@gmail.com als department_lead in WAMOCON GmbH eingetragen.', s;

      -- Falls Erwin auch in weiteren Orgs ist: Daniel dort ebenfalls ergänzen
      IF erwin_id IS NOT NULL THEN
        EXECUTE format('
          INSERT INTO %I.user_roles (user_id, organization_id, role)
          SELECT %L, organization_id, ''department_lead''
          FROM %I.user_roles
          WHERE user_id = %L
            AND organization_id != %L
          ON CONFLICT (user_id, organization_id) DO NOTHING
        ', s, daniel_id, s, erwin_id, wamocon_id);
      END IF;

    ELSE
      RAISE NOTICE 'Schema % nicht vorhanden – übersprungen.', s;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Fix abgeschlossen für %', daniel_email;
END;
$$;


-- ── SCHRITT 3: Verifikation ──────────────────────────────────────────────────
-- Nach dem Fix sollte daniel.moretz@gmail.com hier erscheinen

SELECT
  u.email,
  u.id,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  ur_dev.role                      AS rolle_dev,
  ur_test.role                     AS rolle_test,
  ur_prod.role                     AS rolle_prod
FROM auth.users u
LEFT JOIN "away-dev".user_roles  ur_dev  ON ur_dev.user_id  = u.id
LEFT JOIN "away-test".user_roles ur_test ON ur_test.user_id = u.id
LEFT JOIN "away-prod".user_roles ur_prod ON ur_prod.user_id = u.id
WHERE u.email = 'daniel.moretz@gmail.com';
