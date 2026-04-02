-- ============================================================
-- Away v4.1 – Konsolidierte Migration (Alle Schemas)
-- ============================================================
-- Kann auf BESTEHENDEN Datenbanken mehrfach sicher ausgeführt werden.
-- Bestehende Nutzer, Organisationen und Anträge bleiben unberührt.
--
-- Anleitung: Dieses Skript einmalig im Supabase SQL-Editor ausführen.
-- Es verarbeitet automatisch alle drei Schemas (away-dev, away-test, away-prod),
-- sofern sie in der Datenbank vorhanden sind.
-- ============================================================

-- ── 1. Public-Hilfsfunktionen (idempotent via CREATE OR REPLACE) ──

CREATE OR REPLACE FUNCTION public.is_admin_in_org(schema_name text, org_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result boolean;
BEGIN
  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM %I.user_roles WHERE user_id = auth.uid() AND organization_id = $1 AND role = ''admin'')',
    schema_name
  ) INTO result USING org_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_approver_in_org(schema_name text, org_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result boolean;
BEGIN
  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM %I.user_roles WHERE user_id = auth.uid() AND organization_id = $1 AND role IN (''admin'', ''cio'', ''approver''))',
    schema_name
  ) INTO result USING org_id;
  RETURN result;
END;
$$;

-- Trigger-Funktion für Standardwerte in user_settings (einmalig in public)
CREATE OR REPLACE FUNCTION public.set_default_user_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Standardwerte werden nur gesetzt, wenn der Key noch nicht im JSONB vorhanden ist.
  -- Vorhandene Werte bleiben erhalten (||  gibt dem rechten Operanden Vorrang).
  NEW.settings := '{
    "vacationQuota": 30,
    "carryOver": 0,
    "notifyOnApproval": true,
    "notifyOnRejection": true,
    "notifyOnReminder": false
  }'::jsonb || NEW.settings;
  RETURN NEW;
END;
$$;

-- ── 2. Storage Buckets ─────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('templates',  'templates',  false) ON CONFLICT (id) DO NOTHING;

-- ── 3. Schema-Migration (DO-Loop über alle drei Schemas) ───

DO $migration$
DECLARE
  schemas TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s       TEXT;
  c       TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP

    -- Schema vorhanden?
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
      RAISE NOTICE 'Schema % nicht gefunden – übersprungen.', s;
      CONTINUE;
    END IF;

    RAISE NOTICE '── Migriere Schema: % ────────────────────────────────', s;

    -- ── 3.1 organizations.settings ──────────────────────────
    EXECUTE format(
      $f$ALTER TABLE %I.organizations ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'$f$,
      s
    );
    EXECUTE format('ALTER TABLE %I.organizations ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('DROP POLICY IF EXISTS "Org_View"      ON %I.organizations', s);
    EXECUTE format('DROP POLICY IF EXISTS "Org_All_Admin" ON %I.organizations', s);
    EXECUTE format(
      $f$CREATE POLICY "Org_View" ON %I.organizations FOR SELECT
         USING (EXISTS (SELECT 1 FROM %I.user_roles WHERE organization_id = id AND user_id = auth.uid()))$f$,
      s, s
    );
    EXECUTE format(
      $f$CREATE POLICY "Org_All_Admin" ON %I.organizations FOR ALL
         USING (public.is_admin_in_org(%L, id))$f$,
      s, s
    );

    -- ── 3.2 user_roles: Constraint auf vollständige Rollenliste ─
    -- Alten Constraint finden und entfernen (Name kann variieren)
    FOR c IN (
      SELECT conname FROM pg_constraint
      WHERE  conrelid = (format('%I.user_roles', s))::regclass
      AND    contype  = 'c'
      AND    pg_get_constraintdef(oid) LIKE '%role%'
    ) LOOP
      EXECUTE format('ALTER TABLE %I.user_roles DROP CONSTRAINT %I', s, c);
    END LOOP;
    EXECUTE format(
      $f$ALTER TABLE %I.user_roles
         ADD CONSTRAINT user_roles_role_check
         CHECK (role IN ('admin','cio','approver','employee','department_lead'))$f$,
      s
    );
    -- Veraltete 'user'-Rolle zu 'employee' migrieren (keine Datenverlust)
    EXECUTE format($f$UPDATE %I.user_roles SET role = 'employee' WHERE role = 'user'$f$, s);
    EXECUTE format('ALTER TABLE %I.user_roles ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('DROP POLICY IF EXISTS "Role_Self" ON %I.user_roles', s);
    EXECUTE format(
      $f$CREATE POLICY "Role_Self" ON %I.user_roles FOR SELECT USING (auth.uid() = user_id)$f$,
      s
    );

    -- ── 3.3 user_settings: Policies ─────────────────────────
    EXECUTE format('ALTER TABLE %I.user_settings ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('DROP POLICY IF EXISTS "Settings_Self"       ON %I.user_settings', s);
    EXECUTE format('DROP POLICY IF EXISTS "Settings_Admin_Read" ON %I.user_settings', s);
    EXECUTE format(
      $f$CREATE POLICY "Settings_Self" ON %I.user_settings FOR ALL USING (auth.uid() = user_id)$f$,
      s
    );
    EXECUTE format(
      $f$CREATE POLICY "Settings_Admin_Read" ON %I.user_settings FOR SELECT
         USING (public.is_admin_in_org(%L, organization_id))$f$,
      s, s
    );

    -- ── 3.4 vacation_requests: fehlende Spalten ─────────────
    EXECUTE format($f$ALTER TABLE %I.vacation_requests ADD COLUMN IF NOT EXISTS template_fields JSONB DEFAULT '{}'::jsonb$f$, s);
    EXECUTE format($f$ALTER TABLE %I.vacation_requests ADD COLUMN IF NOT EXISTS template_id  UUID$f$, s);
    EXECUTE format($f$ALTER TABLE %I.vacation_requests ADD COLUMN IF NOT EXISTS notes        TEXT$f$, s);
    EXECUTE format($f$ALTER TABLE %I.vacation_requests ADD COLUMN IF NOT EXISTS approved_by  UUID$f$, s);
    EXECUTE format($f$ALTER TABLE %I.vacation_requests ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ$f$, s);
    EXECUTE format($f$ALTER TABLE %I.vacation_requests ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now()$f$, s);
    EXECUTE format('ALTER TABLE %I.vacation_requests ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('DROP POLICY IF EXISTS "Vac_Self"            ON %I.vacation_requests', s);
    EXECUTE format('DROP POLICY IF EXISTS "Vac_View_Approver"   ON %I.vacation_requests', s);
    EXECUTE format('DROP POLICY IF EXISTS "Vac_Update_Approver" ON %I.vacation_requests', s);
    EXECUTE format(
      $f$CREATE POLICY "Vac_Self" ON %I.vacation_requests FOR ALL USING (auth.uid() = user_id)$f$,
      s
    );
    EXECUTE format(
      $f$CREATE POLICY "Vac_View_Approver" ON %I.vacation_requests FOR SELECT
         USING (public.is_approver_in_org(%L, organization_id))$f$,
      s, s
    );
    EXECUTE format(
      $f$CREATE POLICY "Vac_Update_Approver" ON %I.vacation_requests FOR UPDATE
         USING (public.is_approver_in_org(%L, organization_id))$f$,
      s, s
    );

    -- ── 3.5 calendar_events ──────────────────────────────────
    EXECUTE format(
      $f$CREATE TABLE IF NOT EXISTS %I.calendar_events (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL,
        organization_id UUID REFERENCES %I.organizations(id) ON DELETE CASCADE,
        external_id     TEXT,
        provider        TEXT NOT NULL CHECK (provider IN ('outlook','google','manual')),
        title           TEXT NOT NULL,
        start_date      DATE NOT NULL,
        end_date        DATE NOT NULL,
        all_day         BOOLEAN DEFAULT true,
        description     TEXT,
        synced_at       TIMESTAMPTZ DEFAULT now(),
        created_at      TIMESTAMPTZ DEFAULT now(),
        UNIQUE (user_id, external_id, provider)
      )$f$,
      s, s
    );
    EXECUTE format('ALTER TABLE %I.calendar_events ENABLE ROW LEVEL SECURITY', s);
    -- Alte Policies aus verschiedenen Versionen bereinigen
    EXECUTE format('DROP POLICY IF EXISTS "Calendar_View"   ON %I.calendar_events', s);
    EXECUTE format('DROP POLICY IF EXISTS "Calendar_Manage" ON %I.calendar_events', s);
    EXECUTE format('DROP POLICY IF EXISTS "Events_Self"     ON %I.calendar_events', s);
    EXECUTE format(
      $f$CREATE POLICY "Events_Self" ON %I.calendar_events FOR ALL USING (auth.uid() = user_id)$f$,
      s
    );

    -- ── 3.6 document_templates ───────────────────────────────
    EXECUTE format(
      $f$CREATE TABLE IF NOT EXISTS %I.document_templates (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            TEXT NOT NULL,
        type            TEXT NOT NULL CHECK (type IN ('pdf','docx','xlsx')),
        storage_path    TEXT NOT NULL,
        organization_id UUID NOT NULL REFERENCES %I.organizations(id) ON DELETE CASCADE,
        created_at      TIMESTAMPTZ DEFAULT now()
      )$f$,
      s, s
    );
    EXECUTE format('ALTER TABLE %I.document_templates ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('DROP POLICY IF EXISTS "Template_View"        ON %I.document_templates', s);
    EXECUTE format('DROP POLICY IF EXISTS "Template_Manage"      ON %I.document_templates', s);
    EXECUTE format('DROP POLICY IF EXISTS "Template_Manage_Admin" ON %I.document_templates', s);
    EXECUTE format(
      $f$CREATE POLICY "Template_View" ON %I.document_templates FOR SELECT
         USING (EXISTS (SELECT 1 FROM %I.user_roles WHERE organization_id = %I.document_templates.organization_id AND user_id = auth.uid()))$f$,
      s, s, s
    );
    EXECUTE format(
      $f$CREATE POLICY "Template_Manage" ON %I.document_templates FOR ALL
         USING (public.is_admin_in_org(%L, organization_id))$f$,
      s, s
    );

    -- ── 3.7 document_numbers ─────────────────────────────────
    EXECUTE format(
      $f$CREATE TABLE IF NOT EXISTS %I.document_numbers (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES %I.organizations(id) ON DELETE CASCADE,
        user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
        document_id     TEXT NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT now(),
        UNIQUE (organization_id, document_id)
      )$f$,
      s, s
    );
    EXECUTE format('ALTER TABLE %I.document_numbers ENABLE ROW LEVEL SECURITY', s);
    -- Alle historischen Policy-Namen bereinigen
    EXECUTE format('DROP POLICY IF EXISTS "View_Used_Doc_IDs"  ON %I.document_numbers', s);
    EXECUTE format('DROP POLICY IF EXISTS "Doc_Numbers_Select" ON %I.document_numbers', s);
    EXECUTE format('DROP POLICY IF EXISTS "DocNum_View"        ON %I.document_numbers', s);
    EXECUTE format('DROP POLICY IF EXISTS "Insert_Doc_ID"      ON %I.document_numbers', s);
    EXECUTE format('DROP POLICY IF EXISTS "Doc_Numbers_Insert" ON %I.document_numbers', s);
    EXECUTE format('DROP POLICY IF EXISTS "DocNum_Register"    ON %I.document_numbers', s);
    EXECUTE format(
      $f$CREATE POLICY "DocNum_View" ON %I.document_numbers FOR SELECT
         USING (EXISTS (SELECT 1 FROM %I.user_roles WHERE organization_id = %I.document_numbers.organization_id AND user_id = auth.uid()))$f$,
      s, s, s
    );
    EXECUTE format(
      $f$CREATE POLICY "DocNum_Register" ON %I.document_numbers FOR INSERT
         WITH CHECK (auth.uid() = user_id)$f$,
      s
    );

    -- ── 3.8 legal_consents ───────────────────────────────────
    EXECUTE format(
      $f$CREATE TABLE IF NOT EXISTS %I.legal_consents (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL,
        consent_type TEXT NOT NULL CHECK (consent_type IN ('agb','privacy','dsgvo')),
        version      TEXT NOT NULL,
        accepted_at  TIMESTAMPTZ DEFAULT now(),
        UNIQUE (user_id, consent_type, version)
      )$f$,
      s
    );
    EXECUTE format('ALTER TABLE %I.legal_consents ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('DROP POLICY IF EXISTS "Consents_View_Own"   ON %I.legal_consents', s);
    EXECUTE format('DROP POLICY IF EXISTS "Consents_View_Admin" ON %I.legal_consents', s);
    EXECUTE format('DROP POLICY IF EXISTS "Consents_Insert_Own" ON %I.legal_consents', s);
    EXECUTE format(
      $f$CREATE POLICY "Consents_View_Own" ON %I.legal_consents FOR SELECT USING (auth.uid() = user_id)$f$,
      s
    );
    EXECUTE format(
      $f$CREATE POLICY "Consents_View_Admin" ON %I.legal_consents FOR SELECT
         USING (EXISTS (SELECT 1 FROM %I.user_roles WHERE user_id = auth.uid() AND role = 'admin'))$f$,
      s, s
    );
    EXECUTE format(
      $f$CREATE POLICY "Consents_Insert_Own" ON %I.legal_consents FOR INSERT WITH CHECK (auth.uid() = user_id)$f$,
      s
    );

    -- ── 3.9 Grants ───────────────────────────────────────────
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated, anon, service_role', s);
    EXECUTE format('GRANT ALL ON ALL TABLES    IN SCHEMA %I TO authenticated, service_role', s);
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated, service_role', s);

    -- ── 3.10 Performance-Indizes ─────────────────────────────
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_vacation_requests_org_status  ON %I.vacation_requests (organization_id, status)', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_vacation_requests_org_created ON %I.vacation_requests (organization_id, created_at DESC)', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_vacation_requests_user_org    ON %I.vacation_requests (user_id, organization_id)', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_document_numbers_org          ON %I.document_numbers  (organization_id)', s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_document_numbers_user_org     ON %I.document_numbers  (organization_id, user_id, created_at DESC)', s);

    -- ── 3.11 organization_members View (SystemTab/Reports-Kompatibilität) ──
    IF NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname = s AND viewname = 'organization_members') THEN
      EXECUTE format(
        $f$CREATE VIEW %I.organization_members AS
           SELECT id, user_id, organization_id, role, created_at FROM %I.user_roles$f$,
        s, s
      );
    END IF;

    -- ── 3.12 user_settings Trigger (Standardwerte für neue Zeilen) ──
    EXECUTE format('DROP TRIGGER IF EXISTS trg_default_user_settings ON %I.user_settings', s);
    EXECUTE format(
      $f$CREATE TRIGGER trg_default_user_settings
         BEFORE INSERT ON %I.user_settings
         FOR EACH ROW EXECUTE FUNCTION public.set_default_user_settings()$f$,
      s
    );

    RAISE NOTICE 'Schema % erfolgreich migriert.', s;

  END LOOP;
END;
$migration$;

-- ── 4. PostgREST Cache aktualisieren ──────────────────────

NOTIFY pgrst, 'reload schema';
