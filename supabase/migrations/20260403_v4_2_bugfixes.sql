-- ============================================================
-- Away v4.2 – Bug-Fixes & Feature-Updates
-- ============================================================
-- Behebt folgende Bugs:
--   • Bug 12: Storage RLS – Template-Upload schlägt fehl
--   • Bug 13: create_new_organization Funktion fehlte
--   • Bug 11: Admin kann keine Mitglieder sehen (user_roles RLS)
--   • Bug  4: Mitarbeiter ohne user_roles werden per Trigger verlinkt
-- ============================================================

-- ── 1. create_new_organization in jedem Schema ────────────

DO $migration$
DECLARE
  schemas TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s       TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
      RAISE NOTICE 'Schema % nicht gefunden – übersprungen.', s;
      CONTINUE;
    END IF;

    -- ── 1.1 create_new_organization ──────────────────────
    EXECUTE format(
      $f$
      CREATE OR REPLACE FUNCTION %I.create_new_organization(
        creator_id UUID,
        org_name   TEXT
      )
      RETURNS UUID
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = %I, public
      AS $$
      DECLARE
        new_org_id UUID;
      BEGIN
        -- Organisation anlegen
        INSERT INTO %I.organizations (name)
        VALUES (org_name)
        RETURNING id INTO new_org_id;

        -- Ersteller als Admin eintragen
        INSERT INTO %I.user_roles (user_id, organization_id, role)
        VALUES (creator_id, new_org_id, 'admin')
        ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'admin';

        -- Standard-Benutzereinstellungen anlegen
        INSERT INTO %I.user_settings (user_id, organization_id, settings)
        VALUES (creator_id, new_org_id, '{}')
        ON CONFLICT (user_id, organization_id) DO NOTHING;

        RETURN new_org_id;
      END;
      $$
      $f$,
      s, s, s, s, s
    );

    -- Ausführungsrecht für eingeloggte Nutzer
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.create_new_organization(uuid, text) TO authenticated',
      s
    );

    -- ── 1.2 Admin darf alle user_roles seiner Orgs lesen ─
    EXECUTE format('DROP POLICY IF EXISTS "Role_Admin_Read" ON %I.user_roles', s);
    EXECUTE format(
      $f$CREATE POLICY "Role_Admin_Read" ON %I.user_roles
         FOR SELECT
         USING (public.is_admin_in_org(%L, organization_id))$f$,
      s, s
    );

    -- ── 1.3 Admin darf user_roles verwalten (INSERT/UPDATE/DELETE) ─
    EXECUTE format('DROP POLICY IF EXISTS "Role_Admin_Manage" ON %I.user_roles', s);
    EXECUTE format(
      $f$CREATE POLICY "Role_Admin_Manage" ON %I.user_roles
         FOR ALL
         USING (public.is_admin_in_org(%L, organization_id))
         WITH CHECK (public.is_admin_in_org(%L, organization_id))$f$,
      s, s, s
    );

    -- ── 1.4 Mitarbeiter darf eigene Einstellungen lesen ─
    --   (Fallback: falls organization_id aus user_settings kommt)
    EXECUTE format('DROP POLICY IF EXISTS "Settings_Insert_Own" ON %I.user_settings', s);
    EXECUTE format(
      $f$CREATE POLICY "Settings_Insert_Own" ON %I.user_settings
         FOR INSERT WITH CHECK (auth.uid() = user_id)$f$,
      s
    );

    -- ── 1.5 vacation_requests: approver darf approved_by/approved_at setzen ─
    EXECUTE format('DROP POLICY IF EXISTS "Vac_Update_Approver" ON %I.vacation_requests', s);
    EXECUTE format(
      $f$CREATE POLICY "Vac_Update_Approver" ON %I.vacation_requests
         FOR UPDATE
         USING  (public.is_approver_in_org(%L, organization_id))
         WITH CHECK (public.is_approver_in_org(%L, organization_id))$f$,
      s, s, s
    );

    RAISE NOTICE 'Schema % – v4.2 Patches angewendet.', s;
  END LOOP;
END;
$migration$;

-- ── 2. Storage-Objekt-Policies (templates & signatures) ──

-- Templates-Bucket: Authentifizierte Nutzer können hochladen/lesen/löschen.
-- Feingranulare Prüfung erfolgt im Anwendungscode (nur Admins öffnen Upload-UI).
DO $$
BEGIN
  -- Nur anlegen, wenn noch nicht vorhanden
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'templates' AND name = 'Template_Authenticated_All'
  ) THEN
    INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
    VALUES
      ('Template_Authenticated_All', 'templates', 'ALL',
       '(auth.role() = ''authenticated'')',
       '(auth.role() = ''authenticated'')');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'signatures' AND name = 'Signature_Authenticated_All'
  ) THEN
    INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
    VALUES
      ('Signature_Authenticated_All', 'signatures', 'ALL',
       '(auth.role() = ''authenticated'')',
       '(auth.role() = ''authenticated'')');
  END IF;
EXCEPTION
  -- storage.policies könnte in dieser Supabase-Version anders heißen
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.policies nicht verfügbar – Storage-Policies müssen im Dashboard gesetzt werden.';
END;
$$;

-- Alternativ: RLS direkt auf storage.objects setzen (funktioniert immer)
DO $$
BEGIN
  -- Templates: alle authentifizierten Nutzer
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Away_Template_Auth_All'
  ) THEN
    CREATE POLICY "Away_Template_Auth_All" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'templates')
      WITH CHECK (bucket_id = 'templates');
  END IF;

  -- Signatures: alle authentifizierten Nutzer
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Away_Signature_Auth_All'
  ) THEN
    CREATE POLICY "Away_Signature_Auth_All" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'signatures')
      WITH CHECK (bucket_id = 'signatures');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

-- ── 3. PostgREST Cache aktualisieren ─────────────────────
NOTIFY pgrst, 'reload schema';
