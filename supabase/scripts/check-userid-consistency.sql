-- ============================================================
-- Vollständige User-ID-Konsistenzprüfung aller Schemas
-- ============================================================
-- Prüft ob user_ids in allen bekannten App-Schemas in auth.users existieren.
-- Zeigt verwaiste (orphaned) Referenzen die nach dem Cleanup entstanden
-- sein könnten.
-- ============================================================

-- ── 1. Übersicht: Welche User sind aktuell in auth.users? ────────────────────
SELECT
  id,
  email,
  aud,
  email_confirmed_at IS NOT NULL AS confirmed,
  created_at::date AS erstellt
FROM auth.users
ORDER BY created_at, email;


-- ── 2. AWAY-PROD: Verwaiste user_id-Referenzen ───────────────────────────────
SELECT 'away-prod' AS schema, 'user_roles' AS tabelle, user_id, NULL::text AS info
FROM "away-prod".user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-prod', 'user_settings', user_id, NULL
FROM "away-prod".user_settings
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-prod', 'vacation_requests', user_id, NULL
FROM "away-prod".vacation_requests
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-prod', 'calendar_events', user_id, NULL
FROM "away-prod".calendar_events
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-prod', 'legal_consents', user_id, NULL
FROM "away-prod".legal_consents
WHERE user_id NOT IN (SELECT id FROM auth.users)

-- ── 2b. AWAY-DEV ─────────────────────────────────────────────────────────────
UNION ALL
SELECT 'away-dev', 'user_roles', user_id, NULL
FROM "away-dev".user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-dev', 'user_settings', user_id, NULL
FROM "away-dev".user_settings
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-dev', 'vacation_requests', user_id, NULL
FROM "away-dev".vacation_requests
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-dev', 'calendar_events', user_id, NULL
FROM "away-dev".calendar_events
WHERE user_id NOT IN (SELECT id FROM auth.users)

-- ── 2c. AWAY-TEST ────────────────────────────────────────────────────────────
UNION ALL
SELECT 'away-test', 'user_roles', user_id, NULL
FROM "away-test".user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-test', 'user_settings', user_id, NULL
FROM "away-test".user_settings
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-test', 'vacation_requests', user_id, NULL
FROM "away-test".vacation_requests
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'away-test', 'calendar_events', user_id, NULL
FROM "away-test".calendar_events
WHERE user_id NOT IN (SELECT id FROM auth.users)

-- ── 3. TRACE-Schemas (falls vorhanden) ───────────────────────────────────────
UNION ALL
SELECT 'trace-prod', 'user_roles', user_id, NULL
FROM "trace-prod".user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'trace-dev', 'user_roles', user_id, NULL
FROM "trace-dev".user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'trace-test', 'user_roles', user_id, NULL
FROM "trace-test".user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users)

-- ── 4. TeamRadar-Schemas ─────────────────────────────────────────────────────
UNION ALL
SELECT 'public (TeamRadar)', 'user_roles', user_id, NULL
FROM public.user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'test (TeamRadar)', 'user_roles', user_id, NULL
FROM test.user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'prod (TeamRadar)', 'user_roles', user_id, NULL
FROM prod.user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users)

ORDER BY 1, 2;


-- ── 5. public.super_admins Konsistenz ────────────────────────────────────────
SELECT 'super_admins' AS tabelle, user_id, 'FEHLT in auth.users' AS problem
FROM public.super_admins
WHERE user_id NOT IN (SELECT id FROM auth.users);


-- ── 6. Zusammenfassung: Alle User-IDs die in away-prod aktiv sind ─────────────
SELECT
  u.email,
  u.aud,
  ur.role,
  ur.organization_id
FROM "away-prod".user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.role DESC, u.email;
