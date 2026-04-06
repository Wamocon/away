-- ============================================================
-- AWAY – Diagnose & Fix: Benutzer sehen keine Organisation
-- ============================================================
-- Führe diese Abfragen im Supabase SQL-Editor aus um den Zustand
-- der WMC-Testbenutzer zu überprüfen.
-- ============================================================

-- ── 1. Aktuelle UUIDs aller WMC / Test-Benutzer anzeigen ───────────────────
SELECT
  u.id          AS user_uuid,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  u.created_at
FROM auth.users u
WHERE u.email ILIKE '%wmc%'
   OR u.email ILIKE '%away.de%'
ORDER BY u.email;

-- ── 2. Org-Zuweisung prüfen (alle 3 Schemas) ────────────────────────────────
SELECT 'away-dev'   AS schema, ur.user_id, u.email, ur.organization_id, ur.role
FROM "away-dev".user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email ILIKE '%wmc%' OR u.email ILIKE '%away.de%'
UNION ALL
SELECT 'away-test'  AS schema, ur.user_id, u.email, ur.organization_id, ur.role
FROM "away-test".user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email ILIKE '%wmc%' OR u.email ILIKE '%away.de%'
UNION ALL
SELECT 'away-prod'  AS schema, ur.user_id, u.email, ur.organization_id, ur.role
FROM "away-prod".user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email ILIKE '%wmc%' OR u.email ILIKE '%away.de%'
ORDER BY schema, email;

-- ── 3. Subscriptions der WMC-Orgs prüfen ───────────────────────────────────
SELECT 'away-dev' AS schema, o.id, o.name, s.status, s.trial_end,
       s.trial_end > now() AS trial_noch_aktiv
FROM "away-dev".organizations o
LEFT JOIN "away-dev".subscriptions s ON s.organization_id = o.id
WHERE o.name ILIKE '%wmc%' OR o.name ILIKE '%Wamocon%' OR o.id = 'f0000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'away-test' AS schema, o.id, o.name, s.status, s.trial_end,
       s.trial_end > now() AS trial_noch_aktiv
FROM "away-test".organizations o
LEFT JOIN "away-test".subscriptions s ON s.organization_id = o.id
WHERE o.name ILIKE '%wmc%' OR o.name ILIKE '%Wamocon%' OR o.id = 'f0000000-0000-0000-0000-000000000000';

-- ── 4. auth.identities prüfen ───────────────────────────────────────────────
SELECT
  i.provider,
  i.provider_id,
  i.user_id,
  u.email,
  i.identity_data->>'sub'   AS identity_sub
FROM auth.identities i
JOIN auth.users u ON u.id = i.user_id
WHERE u.email ILIKE '%wmc%' OR u.email ILIKE '%away.de%'
ORDER BY u.email;

-- ── FIX: Fehlende user_roles wiederherstellen ────────────────────────────────
-- Wenn Abfrage 2 für einen User leere Org-Zuweisung zeigt, stelle sie wieder
-- her. Ersetze <USER_UUID> durch die UUID aus Abfrage 1.
--
-- Beispiel (auskommentiert – erst nach Diagnose anpassen und ausführen):
--
-- DO $$
-- DECLARE
--   user_uuid  UUID := '<USER_UUID>';          -- aus Abfrage 1
--   org_id     UUID := 'f0000000-0000-0000-0000-000000000000'; -- WMC Org
--   user_role  TEXT := 'employee';              -- admin / approver / employee
--   schemas    TEXT[] := ARRAY['away-dev','away-test','away-prod'];
--   s TEXT;
-- BEGIN
--   FOREACH s IN ARRAY schemas LOOP
--     EXECUTE format(
--       'INSERT INTO %I.user_roles (user_id, organization_id, role)
--        VALUES (%L, %L, %L) ON CONFLICT DO NOTHING',
--       s, user_uuid, org_id, user_role
--     );
--     EXECUTE format(
--       'INSERT INTO %I.user_settings (user_id, organization_id, settings)
--        VALUES (%L, %L, %L) ON CONFLICT DO NOTHING',
--       s, user_uuid, org_id, '{}'
--     );
--   END LOOP;
--   RAISE NOTICE 'Fertig: % wurde Org % zugewiesen.', user_uuid, org_id;
-- END;
-- $$;

-- ── FIX: Trial-Subscription erneuern (falls abgelaufen) ─────────────────────
-- Wenn Abfrage 3 zeigt dass trial_noch_aktiv = false ist:
--
-- UPDATE "away-dev".subscriptions
-- SET status = 'trial', trial_end = now() + INTERVAL '365 days'
-- WHERE organization_id = 'f0000000-0000-0000-0000-000000000000';
--
-- UPDATE "away-test".subscriptions
-- SET status = 'trial', trial_end = now() + INTERVAL '365 days'
-- WHERE organization_id = 'f0000000-0000-0000-0000-000000000000';
