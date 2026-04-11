-- ============================================================
-- AWAY – Seed: away-dev & away-test
-- ============================================================
-- Verwendet die bestehenden @wamocon.com-Accounts aus away-prod.
-- Alle User-IDs sind die stabilen aa000001-...-Werte.
-- ============================================================

-- ── SCHRITT 1: Letztes gmail-Duplikat (Nikolaj) manuell löschen ─────────────
-- FK: subscriptions.activated_by → auf wamocon.com-Nikolaj umbiegen
UPDATE "away-prod".subscriptions  SET activated_by = 'aa000001-0000-0000-0000-000000000001' WHERE activated_by = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
UPDATE "away-dev".subscriptions   SET activated_by = 'aa000001-0000-0000-0000-000000000001' WHERE activated_by = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
UPDATE "away-test".subscriptions  SET activated_by = 'aa000001-0000-0000-0000-000000000001' WHERE activated_by = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
UPDATE "trace-prod".subscriptions SET activated_by = 'aa000001-0000-0000-0000-000000000001' WHERE activated_by = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
UPDATE "trace-dev".subscriptions  SET activated_by = 'aa000001-0000-0000-0000-000000000001' WHERE activated_by = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
UPDATE "trace-test".subscriptions SET activated_by = 'aa000001-0000-0000-0000-000000000001' WHERE activated_by = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';

DELETE FROM public.super_admins  WHERE user_id = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
DELETE FROM auth.identities      WHERE user_id = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
DELETE FROM auth.sessions        WHERE user_id = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
DELETE FROM auth.refresh_tokens  WHERE user_id = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
DELETE FROM auth.mfa_factors     WHERE user_id = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';
DELETE FROM auth.users           WHERE id      = 'd13ba241-8df2-44e5-8ebb-235264b0acb9';

-- ── SCHRITT 2: aud-Sicherung für alle wamocon.com-User ───────────────────────
UPDATE auth.users
SET aud = 'authenticated'
WHERE email ILIKE '%wamocon.com%'
  AND (aud IS NULL OR aud != 'authenticated');

-- ── SCHRITT 3: away-dev & away-test befüllen ─────────────────────────────────
DO $$
DECLARE
  wamocon_id UUID := '10000000-0000-0000-0000-000000000001';
  academy_id UUID := '10000000-0000-0000-0000-000000000002';

  -- Stabile IDs aus dem initialen Seed (aa000001-...)
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

  plan_id UUID;

BEGIN

  -- Super-Admin sicherstellen (jetzt mit wamocon.com-ID)
  INSERT INTO public.super_admins (user_id) VALUES (nikolaj_id) ON CONFLICT (user_id) DO NOTHING;

  -- ════════════════════════════════
  -- AWAY-DEV
  -- ════════════════════════════════

  INSERT INTO "away-dev".organizations (id, name) VALUES
    (wamocon_id, 'WAMOCON GmbH'),
    (academy_id, 'WAMOCON ACADEMY GmbH')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES
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

  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES
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

  SELECT id INTO plan_id FROM "away-dev".subscription_plans WHERE name ILIKE 'pro' LIMIT 1;
  IF plan_id IS NULL THEN SELECT id INTO plan_id FROM "away-dev".subscription_plans LIMIT 1; END IF;
  INSERT INTO "away-dev".subscriptions (organization_id, plan_id, status, trial_start, trial_end, activated_by)
    VALUES (wamocon_id, plan_id, 'active', now(), now() + INTERVAL '3 years', nikolaj_id)
    ON CONFLICT (organization_id) DO UPDATE SET status='active', trial_end=now()+INTERVAL '3 years';
  INSERT INTO "away-dev".subscriptions (organization_id, plan_id, status, trial_start, trial_end, activated_by)
    VALUES (academy_id, plan_id, 'active', now(), now() + INTERVAL '3 years', nikolaj_id)
    ON CONFLICT (organization_id) DO UPDATE SET status='active', trial_end=now()+INTERVAL '3 years';

  RAISE NOTICE 'away-dev: fertig';

  -- ════════════════════════════════
  -- AWAY-TEST
  -- ════════════════════════════════

  INSERT INTO "away-test".organizations (id, name) VALUES
    (wamocon_id, 'WAMOCON GmbH'),
    (academy_id, 'WAMOCON ACADEMY GmbH')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES
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

  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES
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

  SELECT id INTO plan_id FROM "away-test".subscription_plans WHERE name ILIKE 'pro' LIMIT 1;
  IF plan_id IS NULL THEN SELECT id INTO plan_id FROM "away-test".subscription_plans LIMIT 1; END IF;
  INSERT INTO "away-test".subscriptions (organization_id, plan_id, status, trial_start, trial_end, activated_by)
    VALUES (wamocon_id, plan_id, 'active', now(), now() + INTERVAL '3 years', nikolaj_id)
    ON CONFLICT (organization_id) DO UPDATE SET status='active', trial_end=now()+INTERVAL '3 years';
  INSERT INTO "away-test".subscriptions (organization_id, plan_id, status, trial_start, trial_end, activated_by)
    VALUES (academy_id, plan_id, 'active', now(), now() + INTERVAL '3 years', nikolaj_id)
    ON CONFLICT (organization_id) DO UPDATE SET status='active', trial_end=now()+INTERVAL '3 years';

  RAISE NOTICE 'away-test: fertig';
  RAISE NOTICE '✓ Seed komplett';

END;
$$;

-- ── Verify ───────────────────────────────────────────────────────────────────
SELECT 'away-dev' AS schema, u.email, ur.role, sub.status
FROM "away-dev".user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN "away-dev".subscriptions sub ON sub.organization_id = ur.organization_id
WHERE ur.organization_id = '10000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'away-test', u.email, ur.role, sub.status
FROM "away-test".user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN "away-test".subscriptions sub ON sub.organization_id = ur.organization_id
WHERE ur.organization_id = '10000000-0000-0000-0000-000000000001'
ORDER BY 1, 3 DESC, 2;
