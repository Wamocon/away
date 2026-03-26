-- ============================================================
-- Away – Schema: away-dev  (Entwicklungsumgebung)
-- In Supabase SQL-Editor ausführen
-- ============================================================

-- ── Schema & Rechte ──────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS "away-dev";
GRANT USAGE  ON SCHEMA "away-dev" TO authenticated, anon, service_role;
GRANT ALL    ON ALL TABLES    IN SCHEMA "away-dev" TO authenticated, service_role;
GRANT ALL    ON ALL SEQUENCES IN SCHEMA "away-dev" TO authenticated, service_role;

-- ── Organizations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-dev".organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "away-dev".organizations TO authenticated;

ALTER TABLE "away-dev".organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orgs lesen" ON "away-dev".organizations;
CREATE POLICY "Orgs lesen" ON "away-dev".organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "away-dev".user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = organizations.id
    )
  );

-- ── User Roles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-dev".user_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES "away-dev".organizations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_user_roles_user_id ON "away-dev".user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_user_roles_org_id  ON "away-dev".user_roles(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON "away-dev".user_roles TO authenticated;

ALTER TABLE "away-dev".user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigene Rollen lesen" ON "away-dev".user_roles;
CREATE POLICY "Eigene Rollen lesen" ON "away-dev".user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Rollen erstellen" ON "away-dev".user_roles;
CREATE POLICY "Eigene Rollen erstellen" ON "away-dev".user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Vacation Requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-dev".vacation_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES "away-dev".organizations(id) ON DELETE CASCADE,
  "from"          DATE NOT NULL,
  "to"            DATE NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_vacation_user_id ON "away-dev".vacation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_vacation_org_id  ON "away-dev".vacation_requests(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON "away-dev".vacation_requests TO authenticated;

ALTER TABLE "away-dev".vacation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigene Urlaubsanträge lesen" ON "away-dev".vacation_requests;
CREATE POLICY "Eigene Urlaubsanträge lesen" ON "away-dev".vacation_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Urlaubsanträge erstellen" ON "away-dev".vacation_requests;
CREATE POLICY "Eigene Urlaubsanträge erstellen" ON "away-dev".vacation_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Urlaubsanträge ändern" ON "away-dev".vacation_requests;
CREATE POLICY "Eigene Urlaubsanträge ändern" ON "away-dev".vacation_requests
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Urlaubsanträge löschen" ON "away-dev".vacation_requests;
CREATE POLICY "Eigene Urlaubsanträge löschen" ON "away-dev".vacation_requests
  FOR DELETE USING (auth.uid() = user_id);

-- ── Templates ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-dev".templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES "away-dev".organizations(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  uploaded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_templates_org_id ON "away-dev".templates(organization_id);

GRANT SELECT, INSERT, DELETE ON "away-dev".templates TO authenticated;

ALTER TABLE "away-dev".templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Templates lesen" ON "away-dev".templates;
CREATE POLICY "Templates lesen" ON "away-dev".templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "away-dev".user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = templates.organization_id
    )
  );

DROP POLICY IF EXISTS "Templates erstellen (Admin)" ON "away-dev".templates;
CREATE POLICY "Templates erstellen (Admin)" ON "away-dev".templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "away-dev".user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = templates.organization_id
        AND user_roles.role = 'admin'
    )
  );

-- ── User Settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-dev".user_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_user_settings_user_id ON "away-dev".user_settings(user_id);

GRANT SELECT, INSERT, UPDATE ON "away-dev".user_settings TO authenticated;

ALTER TABLE "away-dev".user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigene Einstellungen lesen" ON "away-dev".user_settings;
CREATE POLICY "Eigene Einstellungen lesen" ON "away-dev".user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Einstellungen erstellen" ON "away-dev".user_settings;
CREATE POLICY "Eigene Einstellungen erstellen" ON "away-dev".user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Einstellungen ändern" ON "away-dev".user_settings;
CREATE POLICY "Eigene Einstellungen ändern" ON "away-dev".user_settings
  FOR UPDATE USING (auth.uid() = user_id);
