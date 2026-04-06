-- ============================================================
-- AWAY – Fix WMC-User Org-Zuweisung
-- ============================================================
-- Weist die WMC-Testbenutzer einer Organisation zu und stellt
-- sicher dass eine aktive Trial-Subscription existiert.
--
-- UUIDs aus Diagnose-Skript (Screenshot):
--   admin@wmc.com       → e60b2350-c110-4760-8430-9c363cfd2182
--   cio@wmc.com         → f129571c-41de-4b4e-8044-8316e7ab2c4d
--   genehmiger@wmc.com  → 0338d42f-26ec-485f-a38c-c7a6f8b5b06c
--   mitarbeiter@wmc.com → 8c5ad760-6978-4cfa-8193-df011bf4bf3e
-- ============================================================

DO $$
DECLARE
  admin_id    UUID := 'e60b2350-c110-4760-8430-9c363cfd2182';
  cio_id      UUID := 'f129571c-41de-4b4e-8044-8316e7ab2c4d';
  gehn_id     UUID := '0338d42f-26ec-485f-a38c-c7a6f8b5b06c';
  mita_id     UUID := '8c5ad760-6978-4cfa-8193-df011bf4bf3e';

  org_id      UUID := 'f0000000-0000-0000-0000-000000000001';  -- WMC Test-Org (neue stabile ID)
  org_name    TEXT := 'WMC Test-Organisation';

  lite_plan_id  UUID;
  schemas       TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s             TEXT;
BEGIN

  -- ── 1. WMC-Organisation in allen Schemas anlegen ──────────────────────────
  FOREACH s IN ARRAY schemas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
      EXECUTE format(
        'INSERT INTO %I.organizations (id, name) VALUES (%L, %L) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name',
        s, org_id, org_name
      );
      RAISE NOTICE 'Org in Schema % angelegt/aktualisiert.', s;
    END IF;
  END LOOP;

  -- ── 2. user_roles & user_settings in allen Schemas eintragen ──────────────
  FOREACH s IN ARRAY schemas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN

      -- Admin
      EXECUTE format(
        'INSERT INTO %I.user_roles (user_id, organization_id, role) VALUES (%L, %L, %L) ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role',
        s, admin_id, org_id, 'admin'
      );
      EXECUTE format(
        'INSERT INTO %I.user_settings (user_id, organization_id, settings) VALUES (%L, %L, %L::jsonb) ON CONFLICT (user_id, organization_id) DO NOTHING',
        s, admin_id, org_id, '{"email":"admin@wmc.com","firstName":"WMC","lastName":"Admin"}'
      );

      -- CIO
      EXECUTE format(
        'INSERT INTO %I.user_roles (user_id, organization_id, role) VALUES (%L, %L, %L) ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role',
        s, cio_id, org_id, 'cio'
      );
      EXECUTE format(
        'INSERT INTO %I.user_settings (user_id, organization_id, settings) VALUES (%L, %L, %L::jsonb) ON CONFLICT (user_id, organization_id) DO NOTHING',
        s, cio_id, org_id, '{"email":"cio@wmc.com","firstName":"WMC","lastName":"CIO"}'
      );

      -- Genehmiger
      EXECUTE format(
        'INSERT INTO %I.user_roles (user_id, organization_id, role) VALUES (%L, %L, %L) ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role',
        s, gehn_id, org_id, 'approver'
      );
      EXECUTE format(
        'INSERT INTO %I.user_settings (user_id, organization_id, settings) VALUES (%L, %L, %L::jsonb) ON CONFLICT (user_id, organization_id) DO NOTHING',
        s, gehn_id, org_id, '{"email":"genehmiger@wmc.com","firstName":"WMC","lastName":"Genehmiger"}'
      );

      -- Mitarbeiter
      EXECUTE format(
        'INSERT INTO %I.user_roles (user_id, organization_id, role) VALUES (%L, %L, %L) ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role',
        s, mita_id, org_id, 'employee'
      );
      EXECUTE format(
        'INSERT INTO %I.user_settings (user_id, organization_id, settings) VALUES (%L, %L, %L::jsonb) ON CONFLICT (user_id, organization_id) DO NOTHING',
        s, mita_id, org_id, '{"email":"mitarbeiter@wmc.com","firstName":"WMC","lastName":"Mitarbeiter"}'
      );

      RAISE NOTICE 'Schema %: Rollen eingetragen.', s;
    END IF;
  END LOOP;

  -- ── 3. Subscription sicherstellen (Lite Trial, 1 Jahr) ────────────────────
  -- Plan-ID holen (Lite)
  FOREACH s IN ARRAY schemas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = s AND table_name = 'subscriptions') THEN

      -- Lite Plan ID
      EXECUTE format(
        'SELECT id FROM %I.subscription_plans WHERE name IN (''lite'', ''Lite'') LIMIT 1',
        s
      ) INTO lite_plan_id;

      IF lite_plan_id IS NULL THEN
        RAISE NOTICE 'Schema %: Kein Lite-Plan gefunden – Subscription wird nicht angelegt.', s;
      ELSE
        EXECUTE format(
          'INSERT INTO %I.subscriptions
             (id, organization_id, plan_id, status, trial_start, trial_end, created_at)
           VALUES
             (gen_random_uuid(), %L, %L, ''trial'', now(), now() + INTERVAL ''365 days'', now())
           ON CONFLICT (organization_id) DO UPDATE
             SET status = ''trial'',
                 trial_end = now() + INTERVAL ''365 days''',
          s, org_id, lite_plan_id
        );
        RAISE NOTICE 'Schema %: Subscription angelegt/erneuert.', s;
      END IF;

    END IF;
  END LOOP;

END;
$$;

-- ── Ergebnis prüfen ──────────────────────────────────────────────────────────
SELECT 'away-dev' AS schema, ur.user_id, u.email, ur.role, ur.organization_id
FROM "away-dev".user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.organization_id = 'f0000000-0000-0000-0000-000000000001'
ORDER BY u.email;
