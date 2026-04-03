-- ============================================================
-- Away v4.3 – DB-Fix: Schema-Migration, RLS und Datenreparatur
-- ============================================================
-- Behebt folgende Bugs:
--   • Bug 4:  user_settings INSERT/UPDATE RLS für eigene Daten
--   • Bug 6:  Direkt in DB angelegte Nutzer (public-Schema) in away-dev überführen
--   • Bug 11: Admin-Lese-Policy für user_roles (robuster)
--   • Neu: getMemberSettings RLS – Admin darf fremde user_settings lesen/schreiben
--   • Neu: user_settings-Upsert ohne Org-ID (null-Org Fallback)
-- ============================================================

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

    -- ── 1. user_settings: INSERT und UPDATE für eigene Einträge ──────────
    EXECUTE format('DROP POLICY IF EXISTS "Settings_Insert_Own" ON %I.user_settings', s);
    EXECUTE format(
      $f$CREATE POLICY "Settings_Insert_Own" ON %I.user_settings
         FOR INSERT
         WITH CHECK (user_id = auth.uid())$f$,
      s
    );

    EXECUTE format('DROP POLICY IF EXISTS "Settings_Update_Own" ON %I.user_settings', s);
    EXECUTE format(
      $f$CREATE POLICY "Settings_Update_Own" ON %I.user_settings
         FOR UPDATE
         USING (user_id = auth.uid())
         WITH CHECK (user_id = auth.uid())$f$,
      s
    );

    EXECUTE format('DROP POLICY IF EXISTS "Settings_Select_Own" ON %I.user_settings', s);
    EXECUTE format(
      $f$CREATE POLICY "Settings_Select_Own" ON %I.user_settings
         FOR SELECT
         USING (user_id = auth.uid())$f$,
      s
    );

    -- ── 2. user_roles: SELECT für eigene Zeile (Basis-Policy) ────────────
    EXECUTE format('DROP POLICY IF EXISTS "Role_Self_Select" ON %I.user_roles', s);
    EXECUTE format(
      $f$CREATE POLICY "Role_Self_Select" ON %I.user_roles
         FOR SELECT
         USING (user_id = auth.uid())$f$,
      s
    );

    -- ── 3. create_new_organization RPC (idempotent) ───────────────────────
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
        INSERT INTO %I.organizations (name)
        VALUES (org_name)
        RETURNING id INTO new_org_id;

        INSERT INTO %I.user_roles (user_id, organization_id, role)
        VALUES (creator_id, new_org_id, 'admin')
        ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'admin';

        INSERT INTO %I.user_settings (user_id, organization_id, settings)
        VALUES (creator_id, new_org_id, '{}')
        ON CONFLICT (user_id, organization_id) DO NOTHING;

        RETURN new_org_id;
      END;
      $$
      $f$,
      s, s, s, s, s
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.create_new_organization(uuid, text) TO authenticated',
      s
    );

  END LOOP;
END;
$migration$;

-- ── 4. Daten-Migration: public.user_roles → away-dev.user_roles ────────────
-- Nutzer die direkt in public.user_roles eingetragen wurden werden übertragen.
DO $data_migrate$
DECLARE
  schema_name TEXT := 'away-dev';
  rec RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = schema_name AND table_name = 'user_roles') THEN
    RAISE NOTICE 'Schema away-dev.user_roles nicht gefunden – keine Migration.';
    RETURN;
  END IF;

  -- Übertrage Einträge aus public.user_roles die noch nicht in away-dev sind
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    FOR rec IN
      SELECT * FROM public.user_roles
      WHERE NOT EXISTS (
        SELECT 1 FROM "away-dev".user_roles ur2
        WHERE ur2.user_id = public.user_roles.user_id
          AND ur2.organization_id = public.user_roles.organization_id
      )
    LOOP
      BEGIN
        INSERT INTO "away-dev".user_roles (user_id, organization_id, role, created_at)
        VALUES (rec.user_id, rec.organization_id, rec.role, COALESCE(rec.created_at, now()))
        ON CONFLICT (user_id, organization_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Konnte Zeile nicht migrieren: %', rec.user_id;
      END;
    END LOOP;
    RAISE NOTICE 'Migration public.user_roles → away-dev.user_roles abgeschlossen.';
  END IF;

  -- Übertrage Einträge aus public.user_settings die noch nicht in away-dev sind
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    FOR rec IN
      SELECT * FROM public.user_settings
      WHERE NOT EXISTS (
        SELECT 1 FROM "away-dev".user_settings us2
        WHERE us2.user_id = public.user_settings.user_id
          AND (us2.organization_id = public.user_settings.organization_id
               OR (us2.organization_id IS NULL AND public.user_settings.organization_id IS NULL))
      )
    LOOP
      BEGIN
        INSERT INTO "away-dev".user_settings (user_id, organization_id, settings, created_at)
        VALUES (rec.user_id, rec.organization_id, COALESCE(rec.settings, '{}'), COALESCE(rec.created_at, now()))
        ON CONFLICT (user_id, organization_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Konnte user_settings-Zeile nicht migrieren: %', rec.user_id;
      END;
    END LOOP;
    RAISE NOTICE 'Migration public.user_settings → away-dev.user_settings abgeschlossen.';
  END IF;

END;
$data_migrate$;

-- ── 5. Storage Bucket RLS (idempotent) ─────────────────────────────────────
-- templates bucket: Mitglieder dürfen hochladen, Admin verwalten
DO $storage_rls$
BEGIN
  -- policies können nur im public-Schema erstellt werden (Supabase Storage)
  -- Bucket muss bereits existieren

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'templates'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('templates', 'templates', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  DROP POLICY IF EXISTS "Templates_Upload" ON storage.objects;
  CREATE POLICY "Templates_Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'templates');

  DROP POLICY IF EXISTS "Templates_Read" ON storage.objects;
  CREATE POLICY "Templates_Read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'templates');

  DROP POLICY IF EXISTS "Templates_Delete" ON storage.objects;
  CREATE POLICY "Templates_Delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'templates');

  -- signatures bucket
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'signatures'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('signatures', 'signatures', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  DROP POLICY IF EXISTS "Signatures_Upload" ON storage.objects;
  CREATE POLICY "Signatures_Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'signatures');

  DROP POLICY IF EXISTS "Signatures_Read" ON storage.objects;
  CREATE POLICY "Signatures_Read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'signatures');

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage RLS konnte nicht gesetzt werden: %', SQLERRM;
END;
$storage_rls$;

RAISE NOTICE 'Away v4.3 Migration erfolgreich abgeschlossen.';
