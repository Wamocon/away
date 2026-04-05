-- ============================================================
-- Away v4.5 – document_templates: Schema-Fix & Cache-Reload
-- ============================================================
-- Behebt: "COULD NOT FIND THE 'STORAGE_PATH' COLUMN OF
--          'DOCUMENT_TEMPLATES' IN THE SCHEMA CACHE"
--
-- Was passiert:
--   1. Stellt sicher, dass document_templates in allen drei
--      Schemas existiert und storage_path-Spalte vorhanden ist.
--   2. Stellt sicher, dass der Storage-Bucket "templates"
--      und "signatures" existiert.
--   3. Triggert PostgREST-Schema-Cache-Reload.
-- ============================================================

DO $fix$
DECLARE
  schemas TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s       TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = s
    ) THEN
      RAISE NOTICE 'Schema % nicht gefunden – übersprungen.', s;
      CONTINUE;
    END IF;

    -- ── 1. Tabelle anlegen falls nicht vorhanden ──────────────────────────
    EXECUTE format(
      $tbl$
      CREATE TABLE IF NOT EXISTS %I.document_templates (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            TEXT NOT NULL,
        type            TEXT NOT NULL CHECK (type IN ('pdf', 'docx', 'xlsx')),
        storage_path    TEXT NOT NULL DEFAULT '',
        organization_id UUID NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT now()
      )
      $tbl$,
      s
    );

    -- ── 2. Spalten per ALTER TABLE sicherstellen (idempotent) ────────────
    EXECUTE format(
      'ALTER TABLE %I.document_templates ADD COLUMN IF NOT EXISTS storage_path TEXT NOT NULL DEFAULT ''''',
      s
    );
    EXECUTE format(
      'ALTER TABLE %I.document_templates ADD COLUMN IF NOT EXISTS name TEXT',
      s
    );
    EXECUTE format(
      'ALTER TABLE %I.document_templates ADD COLUMN IF NOT EXISTS type TEXT',
      s
    );
    EXECUTE format(
      'ALTER TABLE %I.document_templates ADD COLUMN IF NOT EXISTS organization_id UUID',
      s
    );
    EXECUTE format(
      'ALTER TABLE %I.document_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()',
      s
    );

    -- ── 3. RLS aktivieren ────────────────────────────────────────────────
    EXECUTE format('ALTER TABLE %I.document_templates ENABLE ROW LEVEL SECURITY', s);

    EXECUTE format('DROP POLICY IF EXISTS "Template_View"   ON %I.document_templates', s);
    EXECUTE format(
      $f$CREATE POLICY "Template_View" ON %I.document_templates
         FOR SELECT
         USING (EXISTS (
           SELECT 1 FROM %I.user_roles
           WHERE organization_id = %I.document_templates.organization_id
             AND user_id = auth.uid()
         ))$f$,
      s, s, s
    );

    EXECUTE format('DROP POLICY IF EXISTS "Template_Manage" ON %I.document_templates', s);
    EXECUTE format(
      $f$CREATE POLICY "Template_Manage" ON %I.document_templates
         FOR ALL
         USING (public.is_admin_in_org(%L, organization_id))$f$,
      s, s
    );

    RAISE NOTICE 'document_templates in Schema % sichergestellt.', s;
  END LOOP;
END;
$fix$;

-- ── 4. Storage Buckets sicherstellen ─────────────────────────────────────
DO $buckets$
BEGIN
  -- templates bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'templates',
    'templates',
    false,
    10485760,  -- 10 MB
    ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  )
  ON CONFLICT (id) DO NOTHING;

  -- signatures bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'signatures',
    'signatures',
    false,
    2097152,   -- 2 MB
    ARRAY['image/png','image/jpeg']
  )
  ON CONFLICT (id) DO NOTHING;

  -- Storage-Policies (idempotent)
  DROP POLICY IF EXISTS "Templates_Upload" ON storage.objects;
  CREATE POLICY "Templates_Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'templates');

  DROP POLICY IF EXISTS "Templates_Read" ON storage.objects;
  CREATE POLICY "Templates_Read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'templates');

  DROP POLICY IF EXISTS "Templates_Update" ON storage.objects;
  CREATE POLICY "Templates_Update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'templates');

  DROP POLICY IF EXISTS "Templates_Delete" ON storage.objects;
  CREATE POLICY "Templates_Delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'templates');

  DROP POLICY IF EXISTS "Signatures_Upload" ON storage.objects;
  CREATE POLICY "Signatures_Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'signatures');

  DROP POLICY IF EXISTS "Signatures_Read" ON storage.objects;
  CREATE POLICY "Signatures_Read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'signatures');

  RAISE NOTICE 'Storage Buckets und Policies sichergestellt.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage-Setup Fehler (ggf. bereits vorhanden): %', SQLERRM;
END;
$buckets$;

-- ── 5. PostgREST Schema-Cache-Reload ─────────────────────────────────────
NOTIFY pgrst, 'reload schema';

RAISE NOTICE 'Away v4.5 Migration erfolgreich. PostgREST Schema-Cache wird neu geladen.';
