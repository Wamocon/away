-- ============================================================
-- AWAY – Fix: Alle 10 WAMOCON-User auf allen Umgebungen
-- ============================================================
-- Stellt sicher, dass alle 10 User in auth.users vorhanden sind
-- und sich mit dem Passwort TeamRadar2026! anmelden können.
-- Anschließend werden Rollen und Einstellungen in allen 3 Schemas
-- (away-dev, away-test, away-prod) gesetzt.
--
-- IDEMPOTENT – kann gefahrlos mehrfach ausgeführt werden.
--
-- Ausführen im Supabase SQL-Editor: Alles markieren → Run
-- ============================================================

DO $$
DECLARE
  -- ── Stabile UUIDs ────────────────────────────────────────────────────────
  nikolaj_id UUID := 'aa000001-0000-0000-0000-000000000001';
  erwin_id   UUID := 'aa000001-0000-0000-0000-000000000002';
  daniel_id  UUID := 'aa000001-0000-0000-0000-000000000003';
  waleri_id  UUID := 'aa000001-0000-0000-0000-000000000004';
  leon_id    UUID := 'aa000001-0000-0000-0000-000000000005';
  olga_id    UUID := 'aa000001-0000-0000-0000-000000000006';
  elias_id   UUID := 'aa000001-0000-0000-0000-000000000007';
  yash_id    UUID := 'aa000001-0000-0000-0000-000000000008';
  maanik_id  UUID := 'aa000001-0000-0000-0000-000000000009';
  nurzhan_id UUID := 'aa000001-0000-0000-0000-000000000010';

  -- ── Org-IDs ───────────────────────────────────────────────────────────────
  wamocon_id UUID := '10000000-0000-0000-0000-000000000001';

  -- ── Passwort-Hash (einmalig generieren für alle User) ────────────────────
  pwd_hash TEXT := crypt('TeamRadar2026!', gen_salt('bf'));

  -- ── Hilfsvariablen ────────────────────────────────────────────────────────
  schemas   TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s         TEXT;
  plan_id   UUID;

  -- Typen für User-Datensätze
  u_id    UUID;
  u_email TEXT;
  u_first TEXT;
  u_last  TEXT;
  u_role  TEXT;

  -- Arrays für die 10 User
  user_ids    UUID[]  := ARRAY[
    'aa000001-0000-0000-0000-000000000001',
    'aa000001-0000-0000-0000-000000000002',
    'aa000001-0000-0000-0000-000000000003',
    'aa000001-0000-0000-0000-000000000004',
    'aa000001-0000-0000-0000-000000000005',
    'aa000001-0000-0000-0000-000000000006',
    'aa000001-0000-0000-0000-000000000007',
    'aa000001-0000-0000-0000-000000000008',
    'aa000001-0000-0000-0000-000000000009',
    'aa000001-0000-0000-0000-000000000010'
  ]::UUID[];

  user_emails TEXT[] := ARRAY[
    'nikolaj.schefner@wamocon.com',
    'erwin.moretz@wamocon.com',
    'daniel.moretz@wamocon.com',
    'waleri.moretz@wamocon.com',
    'leon.moretz@wamocon.com',
    'olga.moretz@wamocon.com',
    'elias.felsing@wamocon.com',
    'yash.bhesaniya@wamocon.com',
    'maanik.garg@wamocon.com',
    'nurzhan.kukeyev@wamocon.com'
  ];

  user_firsts TEXT[] := ARRAY[
    'Nikolaj','Erwin','Daniel','Waleri','Leon',
    'Olga','Elias','Yash','Maanik','Nurzhan'
  ];

  user_lasts TEXT[] := ARRAY[
    'Schefner','Moretz','Moretz','Moretz','Moretz',
    'Moretz','Felsing','Bhesaniya','Garg','Kukeyev'
  ];

  -- Rollen laut Spezifikation
  --   Nikolaj  → admin          (+ super_admin)
  --   Erwin    → employee
  --   Daniel   → approver       (Abteilungsleiter; department_lead seit v4_8 nicht mehr gültig)
  --   Waleri   → cio
  --   Leon–Nurzhan → employee
  user_roles TEXT[] := ARRAY[
    'admin',
    'employee',
    'approver',
    'cio',
    'employee',
    'employee',
    'employee',
    'employee',
    'employee',
    'employee'
  ];

  i INT;

BEGIN

  -- ════════════════════════════════════════════════════════════════════════
  -- 1. auth.users: anlegen oder Passwort/E-Mail aktualisieren
  -- ════════════════════════════════════════════════════════════════════════
  FOR i IN 1..10 LOOP
    u_id    := user_ids[i];
    u_email := user_emails[i];
    u_first := user_firsts[i];
    u_last  := user_lasts[i];

    IF EXISTS (SELECT 1 FROM auth.users WHERE id = u_id) THEN
      -- Vorhanden: Passwort + E-Mail sicherstellen
      UPDATE auth.users
        SET encrypted_password = pwd_hash,
            email              = u_email,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            aud                = 'authenticated',
            role               = 'authenticated',
            updated_at         = now()
      WHERE id = u_id;
      RAISE NOTICE '[%/%] UPDATE: % (UUID: %)', i, 10, u_email, u_id;

    ELSIF EXISTS (SELECT 1 FROM auth.users WHERE email = u_email) THEN
      -- Andere UUID mit gleicher E-Mail → Passwort + aud fixen
      UPDATE auth.users
        SET encrypted_password = pwd_hash,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            aud                = 'authenticated',
            role               = 'authenticated',
            updated_at         = now()
      WHERE email = u_email;
      -- Stabile UUID für spätere Schritte holen
      SELECT id INTO u_id FROM auth.users WHERE email = u_email;
      user_ids[i] := u_id;
      RAISE NOTICE '[%/%] UPDATE (fremde UUID %): %', i, 10, u_id, u_email;

    ELSE
      -- Nicht vorhanden: neu anlegen
      INSERT INTO auth.users (
        id, instance_id, aud, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, role,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        u_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        u_email,
        pwd_hash,
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('firstName', u_first, 'lastName', u_last),
        now(), now(),
        'authenticated',
        '', '', '', ''
      );
      RAISE NOTICE '[%/%] INSERT: % (UUID: %)', i, 10, u_email, u_id;
    END IF;
  END LOOP;

  -- ════════════════════════════════════════════════════════════════════════
  -- 2. auth.identities: sicherstellen (Provider "email")
  -- ════════════════════════════════════════════════════════════════════════
  FOR i IN 1..10 LOOP
    u_id    := user_ids[i];
    u_email := user_emails[i];

    IF NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = u_id AND provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        u_email,
        u_id,
        jsonb_build_object('sub', u_id::text, 'email', u_email),
        'email',
        now(), now(), now()
      );
      RAISE NOTICE '[identities] angelegt: %', u_email;
    END IF;
  END LOOP;

  -- ════════════════════════════════════════════════════════════════════════
  -- 3. Super-Admin: Nikolaj
  -- ════════════════════════════════════════════════════════════════════════
  INSERT INTO public.super_admins (user_id)
  VALUES (nikolaj_id)
  ON CONFLICT (user_id) DO NOTHING;
  RAISE NOTICE '[super_admins] Nikolaj gesichert';

  -- ════════════════════════════════════════════════════════════════════════
  -- 4. Schemas: Org, user_roles, user_settings, Subscription
  -- ════════════════════════════════════════════════════════════════════════
  FOREACH s IN ARRAY schemas LOOP

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = s
    ) THEN
      RAISE NOTICE 'Schema % nicht vorhanden – übersprungen.', s;
      CONTINUE;
    END IF;

    -- Org sicherstellen
    EXECUTE format(
      'INSERT INTO %I.organizations (id, name)
       VALUES (%L, %L)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name',
      s, wamocon_id, 'WAMOCON GmbH'
    );

    -- user_roles + user_settings für alle 10 User
    FOR i IN 1..10 LOOP
      u_id    := user_ids[i];
      u_email := user_emails[i];
      u_first := user_firsts[i];
      u_last  := user_lasts[i];
      u_role  := user_roles[i];

      EXECUTE format(
        'INSERT INTO %I.user_roles (user_id, organization_id, role)
         VALUES (%L, %L, %L)
         ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role',
        s, u_id, wamocon_id, u_role
      );

      EXECUTE format(
        'INSERT INTO %I.user_settings (user_id, organization_id, settings)
         VALUES (%L, %L, %L::jsonb)
         ON CONFLICT (user_id, organization_id) DO UPDATE
           SET settings = %I.user_settings.settings || %L::jsonb',
        s, u_id, wamocon_id,
        jsonb_build_object(
          'firstName', u_first,
          'lastName', u_last,
          'email', u_email,
          'vacationQuota', 30,
          'carryOver', 0
        )::text,
        s,
        jsonb_build_object(
          'firstName', u_first,
          'lastName', u_last,
          'email', u_email
        )::text
      );

    END LOOP;

    -- Subscription aktiv halten (Pro, 3 Jahre)
    EXECUTE format(
      'SELECT id FROM %I.subscription_plans WHERE name ILIKE ''pro'' LIMIT 1',
      s
    ) INTO plan_id;
    IF plan_id IS NULL THEN
      EXECUTE format('SELECT id FROM %I.subscription_plans LIMIT 1', s) INTO plan_id;
    END IF;

    IF plan_id IS NOT NULL THEN
      EXECUTE format(
        'INSERT INTO %I.subscriptions
           (organization_id, plan_id, status, trial_start, trial_end, activated_by)
         VALUES (%L, %L, ''active'', now(), now() + INTERVAL ''3 years'', %L)
         ON CONFLICT (organization_id) DO UPDATE
           SET status = ''active'',
               trial_end = now() + INTERVAL ''3 years''',
        s, wamocon_id, plan_id, nikolaj_id
      );
      RAISE NOTICE '[%] Subscription aktiv gesetzt', s;
    ELSE
      RAISE NOTICE '[%] WARNUNG: Kein subscription_plan gefunden – Subscription nicht gesetzt', s;
    END IF;

    RAISE NOTICE '[%] ✓ alle 10 User eingetragen', s;
  END LOOP;

  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE '✓ Fix abgeschlossen. Alle 10 User können';
  RAISE NOTICE '  sich mit TeamRadar2026! anmelden.';
  RAISE NOTICE '══════════════════════════════════════════';
END;
$$;


-- ── Verifikation ─────────────────────────────────────────────────────────────
-- Zeigt den Status aller 10 User nach dem Fix

SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL        AS email_ok,
  EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  )                                        AS identity_ok,
  ur_dev.role                              AS rolle_dev,
  ur_test.role                             AS rolle_test,
  ur_prod.role                             AS rolle_prod
FROM auth.users u
LEFT JOIN "away-dev".user_roles  ur_dev  ON ur_dev.user_id  = u.id AND ur_dev.organization_id  = '10000000-0000-0000-0000-000000000001'
LEFT JOIN "away-test".user_roles ur_test ON ur_test.user_id = u.id AND ur_test.organization_id = '10000000-0000-0000-0000-000000000001'
LEFT JOIN "away-prod".user_roles ur_prod ON ur_prod.user_id = u.id AND ur_prod.organization_id = '10000000-0000-0000-0000-000000000001'
WHERE u.email IN (
  'nikolaj.schefner@wamocon.com',
  'erwin.moretz@wamocon.com',
  'daniel.moretz@wamocon.com',
  'waleri.moretz@wamocon.com',
  'leon.moretz@wamocon.com',
  'olga.moretz@wamocon.com',
  'elias.felsing@wamocon.com',
  'yash.bhesaniya@wamocon.com',
  'maanik.garg@wamocon.com',
  'nurzhan.kukeyev@wamocon.com'
)
ORDER BY u.email;
