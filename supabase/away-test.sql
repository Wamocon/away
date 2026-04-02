-- ============================================================
-- Away – Schema: away-test  (Test-Umgebung)
-- ============================================================
-- Für NEUES Deployment: Dieses Skript einmalig im Supabase SQL-Editor ausführen.
-- Für BESTEHENDES Deployment: migrations/20260402_v4_1_consolidated.sql nutzen.
-- ============================================================

-- ── Public-Hilfsfunktionen (schema-übergreifend) ───────────

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

CREATE OR REPLACE FUNCTION public.set_default_user_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.settings := '{"vacationQuota":30,"carryOver":0,"notifyOnApproval":true,"notifyOnRejection":true,"notifyOnReminder":false}'::jsonb || NEW.settings;
  RETURN NEW;
END;
$$;

-- ── Storage Buckets ────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('templates',  'templates',  false) ON CONFLICT (id) DO NOTHING;

-- ── Schema ────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS "away-test";

-- Organisationen
CREATE TABLE IF NOT EXISTS "away-test".organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  settings   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rollen
CREATE TABLE IF NOT EXISTS "away-test".user_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES "away-test".organizations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'employee'
                  CHECK (role IN ('admin', 'cio', 'approver', 'employee', 'department_lead')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- Benutzereinstellungen (JSONB-Struktur, schema siehe migrations/README.md)
CREATE TABLE IF NOT EXISTS "away-test".user_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID REFERENCES "away-test".organizations(id) ON DELETE CASCADE,
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- Urlaubsanträge
CREATE TABLE IF NOT EXISTS "away-test".vacation_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES "away-test".organizations(id) ON DELETE CASCADE,
  "from"          DATE NOT NULL,
  "to"            DATE NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  template_fields JSONB DEFAULT '{}'::jsonb,
  template_id     UUID,
  notes           TEXT,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Kalender-Ereignisse (Outlook/Google Sync)
CREATE TABLE IF NOT EXISTS "away-test".calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID REFERENCES "away-test".organizations(id) ON DELETE CASCADE,
  external_id     TEXT,
  provider        TEXT NOT NULL CHECK (provider IN ('outlook', 'google', 'manual')),
  title           TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  all_day         BOOLEAN DEFAULT true,
  description     TEXT,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, external_id, provider)
);

-- Dokumentvorlagen
CREATE TABLE IF NOT EXISTS "away-test".document_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('pdf', 'docx', 'xlsx')),
  storage_path    TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES "away-test".organizations(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Belegnummern-Tracking
CREATE TABLE IF NOT EXISTS "away-test".document_numbers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES "away-test".organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  document_id     TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, document_id)
);

-- DSGVO-Einwilligungen
CREATE TABLE IF NOT EXISTS "away-test".legal_consents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('agb', 'privacy', 'dsgvo')),
  version      TEXT NOT NULL,
  accepted_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, consent_type, version)
);

-- ── RLS aktivieren ─────────────────────────────────────────

ALTER TABLE "away-test".organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-test".user_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-test".user_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-test".vacation_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-test".calendar_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-test".document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-test".document_numbers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-test".legal_consents     ENABLE ROW LEVEL SECURITY;

-- ── Grants ─────────────────────────────────────────────────

GRANT USAGE ON SCHEMA "away-test" TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA "away-test" TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "away-test" TO authenticated, service_role;

-- ── Policies ───────────────────────────────────────────────

-- organizations
CREATE POLICY "Org_View"      ON "away-test".organizations FOR SELECT USING (EXISTS (SELECT 1 FROM "away-test".user_roles WHERE organization_id = id AND user_id = auth.uid()));
CREATE POLICY "Org_All_Admin" ON "away-test".organizations FOR ALL    USING (public.is_admin_in_org('away-test', id));

-- user_roles
CREATE POLICY "Role_Self" ON "away-test".user_roles FOR SELECT USING (auth.uid() = user_id);

-- user_settings
CREATE POLICY "Settings_Self"       ON "away-test".user_settings FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Settings_Admin_Read" ON "away-test".user_settings FOR SELECT USING (public.is_admin_in_org('away-test', organization_id));

-- vacation_requests
CREATE POLICY "Vac_Self"            ON "away-test".vacation_requests FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Vac_View_Approver"   ON "away-test".vacation_requests FOR SELECT USING (public.is_approver_in_org('away-test', organization_id));
CREATE POLICY "Vac_Update_Approver" ON "away-test".vacation_requests FOR UPDATE USING (public.is_approver_in_org('away-test', organization_id));

-- calendar_events
CREATE POLICY "Events_Self" ON "away-test".calendar_events FOR ALL USING (auth.uid() = user_id);

-- document_templates
CREATE POLICY "Template_View"   ON "away-test".document_templates FOR SELECT USING (EXISTS (SELECT 1 FROM "away-test".user_roles WHERE organization_id = "away-test".document_templates.organization_id AND user_id = auth.uid()));
CREATE POLICY "Template_Manage" ON "away-test".document_templates FOR ALL    USING (public.is_admin_in_org('away-test', organization_id));

-- document_numbers
CREATE POLICY "DocNum_View"     ON "away-test".document_numbers FOR SELECT USING (EXISTS (SELECT 1 FROM "away-test".user_roles WHERE organization_id = "away-test".document_numbers.organization_id AND user_id = auth.uid()));
CREATE POLICY "DocNum_Register" ON "away-test".document_numbers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- legal_consents
CREATE POLICY "Consents_View_Own"   ON "away-test".legal_consents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Consents_View_Admin" ON "away-test".legal_consents FOR SELECT USING (EXISTS (SELECT 1 FROM "away-test".user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Consents_Insert_Own" ON "away-test".legal_consents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Indizes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_vacation_requests_org_status  ON "away-test".vacation_requests (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_org_created ON "away-test".vacation_requests (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_user_org    ON "away-test".vacation_requests (user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_document_numbers_org          ON "away-test".document_numbers  (organization_id);
CREATE INDEX IF NOT EXISTS idx_document_numbers_user_org     ON "away-test".document_numbers  (organization_id, user_id, created_at DESC);

-- ── Trigger: Standardwerte für user_settings ───────────────

DROP TRIGGER IF EXISTS trg_default_user_settings ON "away-test".user_settings;
CREATE TRIGGER trg_default_user_settings
  BEFORE INSERT ON "away-test".user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_default_user_settings();

-- ── Kompatibilitäts-View ───────────────────────────────────

CREATE OR REPLACE VIEW "away-test".organization_members AS
  SELECT id, user_id, organization_id, role, created_at
  FROM "away-test".user_roles;

NOTIFY pgrst, 'reload schema';
