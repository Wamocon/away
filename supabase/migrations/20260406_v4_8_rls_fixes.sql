-- ============================================================
-- Away v4.8 – RLS Fixes & User-Settings Self-Read
-- ============================================================
-- Probleme:
--  1. Mitarbeiter/Employee können ihre eigenen user_settings nicht lesen
--     (nur Settings_Admin_Read Policy existiert)
--  2. cio-Rolle fehlt ggf. im role-check constraint
-- ============================================================

DO $$
DECLARE
  schemas TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN

      -- ── 1. user_settings: Self-Read für alle User ─────────────────────────
      EXECUTE format(
        'DROP POLICY IF EXISTS "Settings_Self_Read" ON %I.user_settings',
        s
      );
      EXECUTE format(
        $pol$
        CREATE POLICY "Settings_Self_Read" ON %I.user_settings
          FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id)
        $pol$,
        s
      );
      RAISE NOTICE 'Policy Settings_Self_Read erstellt: %', s;

      -- ── 2. user_settings: Self-Write für alle User ────────────────────────
      EXECUTE format(
        'DROP POLICY IF EXISTS "Settings_Self_Write" ON %I.user_settings',
        s
      );
      EXECUTE format(
        $pol$
        CREATE POLICY "Settings_Self_Write" ON %I.user_settings
          FOR ALL
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id)
        $pol$,
        s
      );
      RAISE NOTICE 'Policy Settings_Self_Write erstellt: %', s;

      -- ── 3. cio-Rolle im role_check constraint ergänzen (falls fehlt) ──────
      -- Constraint erst droppen, dann neu anlegen (idempotent)
      EXECUTE format(
        'ALTER TABLE %I.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check',
        s
      );
      EXECUTE format(
        $c$
        ALTER TABLE %I.user_roles
          ADD CONSTRAINT user_roles_role_check
          CHECK (role IN ('admin', 'cio', 'approver', 'employee'))
        $c$,
        s
      );
      RAISE NOTICE 'Role-Check Constraint erneuert: %', s;

    END IF;
  END LOOP;
END;
$$;
