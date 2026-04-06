-- ============================================================
-- Away v4.7 – Super-Admin Vollzugriff via RLS
-- ============================================================
-- Erstellt public.is_super_admin() PostgreSQL-Funktion
-- Ergänzt alle Tabellen in allen drei Schemas mit einer
-- SuperAdmin_All Policy, die vollständigen Lese- und
-- Schreibzugriff für Super-Admins gewährt.
-- ============================================================

-- ── 1. Hilfsfunktion: is_super_admin() ──────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = uid
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;

-- ── 2. Super-Admin Policies für alle Schemas ─────────────────
DO $migration$
DECLARE
  schemas TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s       TEXT;
  tbl     TEXT;
  tables  TEXT[] := ARRAY[
    'organizations',
    'user_roles',
    'user_settings',
    'vacation_requests',
    'calendar_events',
    'document_templates',
    'document_numbers',
    'legal_consents'
  ];
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    FOREACH tbl IN ARRAY tables LOOP
      -- Prüfen ob die Tabelle im Schema existiert
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = s AND table_name = tbl
      ) THEN
        -- Alte Policy entfernen falls vorhanden (Idempotenz)
        EXECUTE format(
          'DROP POLICY IF EXISTS "SuperAdmin_All" ON %I.%I',
          s, tbl
        );
        -- Neue Policy: Super-Admin darf alles lesen und schreiben
        EXECUTE format(
          $pol$
          CREATE POLICY "SuperAdmin_All" ON %I.%I
            FOR ALL
            TO authenticated
            USING (public.is_super_admin())
            WITH CHECK (public.is_super_admin());
          $pol$,
          s, tbl
        );
        RAISE NOTICE 'Policy SuperAdmin_All erstellt: %.%', s, tbl;
      ELSE
        RAISE NOTICE 'Tabelle nicht gefunden, übersprungen: %.%', s, tbl;
      END IF;
    END LOOP;

    -- Auch subscriptions-Tabelle abdecken (falls v4.6-Migration gelaufen)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = s AND table_name = 'subscriptions'
    ) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS "SuperAdmin_All" ON %I.subscriptions',
        s
      );
      EXECUTE format(
        $pol$
        CREATE POLICY "SuperAdmin_All" ON %I.subscriptions
          FOR ALL
          TO authenticated
          USING (public.is_super_admin())
          WITH CHECK (public.is_super_admin());
        $pol$,
        s
      );
    END IF;

    -- subscription_plans ebenfalls
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = s AND table_name = 'subscription_plans'
    ) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS "SuperAdmin_All" ON %I.subscription_plans',
        s
      );
      EXECUTE format(
        $pol$
        CREATE POLICY "SuperAdmin_All" ON %I.subscription_plans
          FOR ALL
          TO authenticated
          USING (public.is_super_admin())
          WITH CHECK (public.is_super_admin());
        $pol$,
        s
      );
    END IF;
  END LOOP;
END;
$migration$;
