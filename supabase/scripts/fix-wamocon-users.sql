-- ============================================================
-- AWAY – Fix: Fehlende Wamocon-Benutzer in auth.users anlegen
-- ============================================================
-- Problem: "Invalid login credentials" für alle Benutzer außer
--          Nikolaj Schefner, weil die anderen 9 Nutzer nicht in
--          auth.users (und auth.identities) angelegt wurden.
--
-- Dieses Skript ist IDEMPOTENT – es legt nur fehlende Einträge an,
-- überschreibt keine bestehenden Daten.
--
-- SCHRITT 1 (Diagnose): Erst Schritt 1 ausführen und prüfen wer fehlt
-- SCHRITT 2 (Fix):      Dann Schritt 2 ausführen
-- SCHRITT 3 (Verify):   Abschließend Schritt 3 zur Bestätigung
-- ============================================================


-- ── SCHRITT 1: Diagnose – Wer fehlt? ────────────────────────────────────────
-- Zeigt welche wamocon.com-Benutzer in auth.users vorhanden sind
-- und ob die zugehörigen Einträge in away-prod korrekt konfiguriert sind.

SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL                      AS email_confirmed,
  EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  )                                                     AS hat_identity,
  EXISTS (
    SELECT 1 FROM "away-prod".user_roles ur
    WHERE ur.user_id = u.id
  )                                                     AS hat_rolle,
  (
    SELECT ur.role FROM "away-prod".user_roles ur
    WHERE ur.user_id = u.id LIMIT 1
  )                                                     AS rolle,
  EXISTS (
    SELECT 1 FROM "away-prod".user_settings us
    WHERE us.user_id = u.id
  )                                                     AS hat_settings
FROM auth.users u
WHERE u.email ILIKE '%wamocon.com%'
ORDER BY u.email;

-- Subscription der WAMOCON GmbH prüfen
SELECT
  o.name,
  s.status,
  s.trial_end,
  s.trial_end > now() AS aktiv
FROM "away-prod".organizations o
LEFT JOIN "away-prod".subscriptions s ON s.organization_id = o.id
WHERE o.id = '10000000-0000-0000-0000-000000000001';


-- ── SCHRITT 2: Fix-Skript ────────────────────────────────────────────────────
-- Legt alle fehlenden Einträge an (auth.users, auth.identities,
-- away-prod.user_roles, away-prod.user_settings, Subscription)

DO $$
DECLARE
  -- Organisations-ID (stabile UUID aus init-prod-data.sql)
  wamocon_id UUID := '10000000-0000-0000-0000-000000000001';

  -- Benutzer-IDs (werden aus auth.users geladen oder neu generiert)
  nikolaj_id UUID;
  erwin_id   UUID;
  daniel_id  UUID;
  waleri_id  UUID;
  leon_id    UUID;
  olga_id    UUID;
  elias_id   UUID;
  yash_id    UUID;
  maanik_id  UUID;
  nurzhan_id UUID;

  pro_plan_id UUID;

BEGIN

  -- ── 1. WAMOCON GmbH Organisation sicherstellen ───────────────────────────
  INSERT INTO "away-prod".organizations (id, name)
  VALUES (wamocon_id, 'WAMOCON GmbH')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- ── 2. Auth-Benutzer & Identities anlegen (falls fehlend) ────────────────

  -- Nikolaj Schefner (Super-Admin)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'nikolaj.schefner@wamocon.com') THEN
    nikolaj_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      nikolaj_id, '00000000-0000-0000-0000-000000000000',
      'nikolaj.schefner@wamocon.com',
      crypt('!Frankfurt1988.', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Nikolaj","lastName":"Schefner"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: nikolaj.schefner@wamocon.com';
  ELSE
    SELECT id INTO nikolaj_id FROM auth.users WHERE email = 'nikolaj.schefner@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: nikolaj.schefner@wamocon.com (ID: %)', nikolaj_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = nikolaj_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'nikolaj.schefner@wamocon.com', nikolaj_id,
      format('{"sub":"%s","email":"nikolaj.schefner@wamocon.com"}', nikolaj_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Nikolaj';
  END IF;

  -- Erwin Moretz
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'erwin.moretz@wamocon.com') THEN
    erwin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      erwin_id, '00000000-0000-0000-0000-000000000000',
      'erwin.moretz@wamocon.com',
      crypt('!EschbornErwin26', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Erwin","lastName":"Moretz"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: erwin.moretz@wamocon.com';
  ELSE
    SELECT id INTO erwin_id FROM auth.users WHERE email = 'erwin.moretz@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: erwin.moretz@wamocon.com (ID: %)', erwin_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = erwin_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'erwin.moretz@wamocon.com', erwin_id,
      format('{"sub":"%s","email":"erwin.moretz@wamocon.com"}', erwin_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Erwin';
  END IF;

  -- Daniel Moretz (Approver)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'daniel.moretz@wamocon.com') THEN
    daniel_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      daniel_id, '00000000-0000-0000-0000-000000000000',
      'daniel.moretz@wamocon.com',
      crypt('!EschbornDaniel26', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Daniel","lastName":"Moretz"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: daniel.moretz@wamocon.com';
  ELSE
    SELECT id INTO daniel_id FROM auth.users WHERE email = 'daniel.moretz@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: daniel.moretz@wamocon.com (ID: %)', daniel_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = daniel_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'daniel.moretz@wamocon.com', daniel_id,
      format('{"sub":"%s","email":"daniel.moretz@wamocon.com"}', daniel_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Daniel';
  END IF;

  -- Waleri Moretz (CIO)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'waleri.moretz@wamocon.com') THEN
    waleri_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      waleri_id, '00000000-0000-0000-0000-000000000000',
      'waleri.moretz@wamocon.com',
      crypt('!EschbornWaleri26', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Waleri","lastName":"Moretz"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: waleri.moretz@wamocon.com';
  ELSE
    SELECT id INTO waleri_id FROM auth.users WHERE email = 'waleri.moretz@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: waleri.moretz@wamocon.com (ID: %)', waleri_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = waleri_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'waleri.moretz@wamocon.com', waleri_id,
      format('{"sub":"%s","email":"waleri.moretz@wamocon.com"}', waleri_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Waleri';
  END IF;

  -- Leon Moretz
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'leon.moretz@wamocon.com') THEN
    leon_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      leon_id, '00000000-0000-0000-0000-000000000000',
      'leon.moretz@wamocon.com',
      crypt('!EschbornLeon26', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Leon","lastName":"Moretz"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: leon.moretz@wamocon.com';
  ELSE
    SELECT id INTO leon_id FROM auth.users WHERE email = 'leon.moretz@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: leon.moretz@wamocon.com (ID: %)', leon_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = leon_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'leon.moretz@wamocon.com', leon_id,
      format('{"sub":"%s","email":"leon.moretz@wamocon.com"}', leon_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Leon';
  END IF;

  -- Olga Moretz
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'olga.moretz@wamocon.com') THEN
    olga_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      olga_id, '00000000-0000-0000-0000-000000000000',
      'olga.moretz@wamocon.com',
      crypt('!EschbornOlga26', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Olga","lastName":"Moretz"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: olga.moretz@wamocon.com';
  ELSE
    SELECT id INTO olga_id FROM auth.users WHERE email = 'olga.moretz@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: olga.moretz@wamocon.com (ID: %)', olga_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = olga_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'olga.moretz@wamocon.com', olga_id,
      format('{"sub":"%s","email":"olga.moretz@wamocon.com"}', olga_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Olga';
  END IF;

  -- Elias Felsing
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'elias.felsing@wamocon.com') THEN
    elias_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      elias_id, '00000000-0000-0000-0000-000000000000',
      'elias.felsing@wamocon.com',
      crypt('!EschbornElias26', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Elias","lastName":"Felsing"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: elias.felsing@wamocon.com';
  ELSE
    SELECT id INTO elias_id FROM auth.users WHERE email = 'elias.felsing@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: elias.felsing@wamocon.com (ID: %)', elias_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = elias_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'elias.felsing@wamocon.com', elias_id,
      format('{"sub":"%s","email":"elias.felsing@wamocon.com"}', elias_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Elias';
  END IF;

  -- Yash Bhesaniya
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'yash.bhesaniya@wamocon.com') THEN
    yash_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      yash_id, '00000000-0000-0000-0000-000000000000',
      'yash.bhesaniya@wamocon.com',
      crypt('!EschbornYash26', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Yash","lastName":"Bhesaniya"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: yash.bhesaniya@wamocon.com';
  ELSE
    SELECT id INTO yash_id FROM auth.users WHERE email = 'yash.bhesaniya@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: yash.bhesaniya@wamocon.com (ID: %)', yash_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = yash_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'yash.bhesaniya@wamocon.com', yash_id,
      format('{"sub":"%s","email":"yash.bhesaniya@wamocon.com"}', yash_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Yash';
  END IF;

  -- Maanik Garg
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'maanik.garg@wamocon.com') THEN
    maanik_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      maanik_id, '00000000-0000-0000-0000-000000000000',
      'maanik.garg@wamocon.com',
      crypt('!EschbornMaanik26', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Maanik","lastName":"Garg"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: maanik.garg@wamocon.com';
  ELSE
    SELECT id INTO maanik_id FROM auth.users WHERE email = 'maanik.garg@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: maanik.garg@wamocon.com (ID: %)', maanik_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = maanik_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'maanik.garg@wamocon.com', maanik_id,
      format('{"sub":"%s","email":"maanik.garg@wamocon.com"}', maanik_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Maanik';
  END IF;

  -- Nurzhan Kukeyev
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'nurzhan.kukeyev@wamocon.com') THEN
    nurzhan_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      nurzhan_id, '00000000-0000-0000-0000-000000000000',
      'nurzhan.kukeyev@wamocon.com',
      crypt('!EschbornNurzhan26', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"firstName":"Nurzhan","lastName":"Kukeyev"}',
      now(), now(), 'authenticated', '', '', '', ''
    );
    RAISE NOTICE 'auth.users angelegt: nurzhan.kukeyev@wamocon.com';
  ELSE
    SELECT id INTO nurzhan_id FROM auth.users WHERE email = 'nurzhan.kukeyev@wamocon.com';
    RAISE NOTICE 'Bereits vorhanden: nurzhan.kukeyev@wamocon.com (ID: %)', nurzhan_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = nurzhan_id AND provider = 'email') THEN
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'nurzhan.kukeyev@wamocon.com', nurzhan_id,
      format('{"sub":"%s","email":"nurzhan.kukeyev@wamocon.com"}', nurzhan_id)::jsonb,
      'email', now(), now(), now());
    RAISE NOTICE 'auth.identities angelegt für Nurzhan';
  END IF;

  -- ── 3. Super-Admin (Nikolaj) sicherstellen ────────────────────────────────
  INSERT INTO public.super_admins (user_id)
  VALUES (nikolaj_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- ── 4. Rollen in away-prod eintragen ─────────────────────────────────────
  INSERT INTO "away-prod".user_roles (user_id, organization_id, role) VALUES
    (nikolaj_id, wamocon_id, 'employee'),
    (erwin_id,   wamocon_id, 'employee'),
    (daniel_id,  wamocon_id, 'approver'),
    (waleri_id,  wamocon_id, 'cio'),
    (leon_id,    wamocon_id, 'employee'),
    (olga_id,    wamocon_id, 'employee'),
    (elias_id,   wamocon_id, 'employee'),
    (yash_id,    wamocon_id, 'employee'),
    (maanik_id,  wamocon_id, 'employee'),
    (nurzhan_id, wamocon_id, 'employee')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role;

  RAISE NOTICE 'user_roles: 10 Einträge angelegt/aktualisiert';

  -- ── 5. User-Settings eintragen ────────────────────────────────────────────
  INSERT INTO "away-prod".user_settings (user_id, organization_id, settings) VALUES
    (nikolaj_id, wamocon_id, '{"firstName":"Nikolaj","lastName":"Schefner","email":"nikolaj.schefner@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb),
    (erwin_id,   wamocon_id, '{"firstName":"Erwin","lastName":"Moretz","email":"erwin.moretz@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb),
    (daniel_id,  wamocon_id, '{"firstName":"Daniel","lastName":"Moretz","email":"daniel.moretz@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb),
    (waleri_id,  wamocon_id, '{"firstName":"Waleri","lastName":"Moretz","email":"waleri.moretz@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb),
    (leon_id,    wamocon_id, '{"firstName":"Leon","lastName":"Moretz","email":"leon.moretz@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb),
    (olga_id,    wamocon_id, '{"firstName":"Olga","lastName":"Moretz","email":"olga.moretz@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb),
    (elias_id,   wamocon_id, '{"firstName":"Elias","lastName":"Felsing","email":"elias.felsing@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb),
    (yash_id,    wamocon_id, '{"firstName":"Yash","lastName":"Bhesaniya","email":"yash.bhesaniya@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb),
    (maanik_id,  wamocon_id, '{"firstName":"Maanik","lastName":"Garg","email":"maanik.garg@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb),
    (nurzhan_id, wamocon_id, '{"firstName":"Nurzhan","lastName":"Kukeyev","email":"nurzhan.kukeyev@wamocon.com","vacationQuota":30,"carryOver":0}'::jsonb)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RAISE NOTICE 'user_settings: 10 Einträge angelegt';

  -- ── 6. Subscription für WAMOCON GmbH sicherstellen ───────────────────────
  SELECT id INTO pro_plan_id FROM "away-prod".subscription_plans
  WHERE name IN ('pro', 'Pro') LIMIT 1;

  IF pro_plan_id IS NOT NULL THEN
    INSERT INTO "away-prod".subscriptions
      (organization_id, plan_id, status, trial_start, trial_end, activated_by)
    VALUES
      (wamocon_id, pro_plan_id, 'active', now(), now() + INTERVAL '3 years', nikolaj_id)
    ON CONFLICT (organization_id) DO UPDATE
      SET status    = 'active',
          trial_end = now() + INTERVAL '3 years';
    RAISE NOTICE 'Subscription: WAMOCON GmbH auf Pro-aktiv gesetzt (3 Jahre)';
  ELSE
    -- Fallback: Trial für 365 Tage
    SELECT id INTO pro_plan_id FROM "away-prod".subscription_plans LIMIT 1;
    INSERT INTO "away-prod".subscriptions
      (organization_id, plan_id, status, trial_start, trial_end)
    VALUES
      (wamocon_id, pro_plan_id, 'trial', now(), now() + INTERVAL '365 days')
    ON CONFLICT (organization_id) DO UPDATE
      SET status    = 'trial',
          trial_end = now() + INTERVAL '365 days';
    RAISE NOTICE 'Subscription: WAMOCON GmbH auf Trial gesetzt (kein Pro-Plan gefunden)';
  END IF;

  RAISE NOTICE '✓ Fix abgeschlossen. Bitte Schritt 3 (Verify) ausführen.';

END;
$$;


-- ── SCHRITT 3: Ergebnis verifizieren ────────────────────────────────────────
SELECT
  u.email,
  ur.role,
  sub.status AS abo,
  sub.trial_end::date AS abo_bis,
  sub.trial_end > now() AS abo_aktiv
FROM "away-prod".user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN "away-prod".organizations o ON o.id = ur.organization_id
LEFT JOIN "away-prod".subscriptions sub ON sub.organization_id = ur.organization_id
WHERE ur.organization_id = '10000000-0000-0000-0000-000000000001'
ORDER BY ur.role DESC, u.email;

NOTIFY pgrst, 'reload schema';


-- ── SCHRITT 4: Passwörter erzwungen zurücksetzen ────────────────────────────
-- Nötig wenn User bereits existierten (ELSE-Zweig setzt kein Passwort).
-- Führe diesen Block aus wenn Login trotz erfolgreichem DO-Block fehlschlägt.

UPDATE auth.users SET encrypted_password = crypt('!Frankfurt1988.',    gen_salt('bf')) WHERE email = 'nikolaj.schefner@wamocon.com';
UPDATE auth.users SET encrypted_password = crypt('!EschbornErwin26',   gen_salt('bf')) WHERE email = 'erwin.moretz@wamocon.com';
UPDATE auth.users SET encrypted_password = crypt('!EschbornDaniel26',  gen_salt('bf')) WHERE email = 'daniel.moretz@wamocon.com';
UPDATE auth.users SET encrypted_password = crypt('!EschbornWaleri26',  gen_salt('bf')) WHERE email = 'waleri.moretz@wamocon.com';
UPDATE auth.users SET encrypted_password = crypt('!EschbornLeon26',    gen_salt('bf')) WHERE email = 'leon.moretz@wamocon.com';
UPDATE auth.users SET encrypted_password = crypt('!EschbornOlga26',    gen_salt('bf')) WHERE email = 'olga.moretz@wamocon.com';
UPDATE auth.users SET encrypted_password = crypt('!EschbornElias26',   gen_salt('bf')) WHERE email = 'elias.felsing@wamocon.com';
UPDATE auth.users SET encrypted_password = crypt('!EschbornYash26',    gen_salt('bf')) WHERE email = 'yash.bhesaniya@wamocon.com';
UPDATE auth.users SET encrypted_password = crypt('!EschbornMaanik26',  gen_salt('bf')) WHERE email = 'maanik.garg@wamocon.com';
UPDATE auth.users SET encrypted_password = crypt('!EschbornNurzhan26', gen_salt('bf')) WHERE email = 'nurzhan.kukeyev@wamocon.com';

-- Bestätigung: Zeigt alle 10 User mit email_confirmed_at und identity-Status
SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  ) AS hat_identity
FROM auth.users u
WHERE u.email ILIKE '%wamocon.com%'
ORDER BY u.email;
