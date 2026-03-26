-- ============================================================
-- Away – Schema: away-prod  (Produktionsumgebung)
-- In Supabase SQL-Editor ausführen
-- ============================================================

-- ── Schema & Rechte ──────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS "away-prod";
GRANT USAGE  ON SCHEMA "away-prod" TO authenticated, anon, service_role;
GRANT ALL    ON ALL TABLES    IN SCHEMA "away-prod" TO authenticated, service_role;
GRANT ALL    ON ALL SEQUENCES IN SCHEMA "away-prod" TO authenticated, service_role;

-- ── Organizations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-prod".organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "away-prod".organizations TO authenticated;

ALTER TABLE "away-prod".organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orgs lesen" ON "away-prod".organizations;
CREATE POLICY "Orgs lesen" ON "away-prod".organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "away-prod".user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = organizations.id
    )
  );

-- ── User Roles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-prod".user_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES "away-prod".organizations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_prod_user_roles_user_id ON "away-prod".user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_prod_user_roles_org_id  ON "away-prod".user_roles(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON "away-prod".user_roles TO authenticated;

ALTER TABLE "away-prod".user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigene Rollen lesen" ON "away-prod".user_roles;
CREATE POLICY "Eigene Rollen lesen" ON "away-prod".user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Rollen erstellen" ON "away-prod".user_roles;
CREATE POLICY "Eigene Rollen erstellen" ON "away-prod".user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Vacation Requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-prod".vacation_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES "away-prod".organizations(id) ON DELETE CASCADE,
  "from"          DATE NOT NULL,
  "to"            DATE NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prod_vacation_user_id ON "away-prod".vacation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prod_vacation_org_id  ON "away-prod".vacation_requests(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON "away-prod".vacation_requests TO authenticated;

ALTER TABLE "away-prod".vacation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigene Urlaubsanträge lesen" ON "away-prod".vacation_requests;
CREATE POLICY "Eigene Urlaubsanträge lesen" ON "away-prod".vacation_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Urlaubsanträge erstellen" ON "away-prod".vacation_requests;
CREATE POLICY "Eigene Urlaubsanträge erstellen" ON "away-prod".vacation_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Urlaubsanträge ändern" ON "away-prod".vacation_requests;
CREATE POLICY "Eigene Urlaubsanträge ändern" ON "away-prod".vacation_requests
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Urlaubsanträge löschen" ON "away-prod".vacation_requests;
CREATE POLICY "Eigene Urlaubsanträge löschen" ON "away-prod".vacation_requests
  FOR DELETE USING (auth.uid() = user_id);

-- ── Templates ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-prod".templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES "away-prod".organizations(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  uploaded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prod_templates_org_id ON "away-prod".templates(organization_id);

GRANT SELECT, INSERT, DELETE ON "away-prod".templates TO authenticated;

ALTER TABLE "away-prod".templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Templates lesen" ON "away-prod".templates;
CREATE POLICY "Templates lesen" ON "away-prod".templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "away-prod".user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = templates.organization_id
    )
  );

DROP POLICY IF EXISTS "Templates erstellen (Admin)" ON "away-prod".templates;
CREATE POLICY "Templates erstellen (Admin)" ON "away-prod".templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "away-prod".user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = templates.organization_id
        AND user_roles.role = 'admin'
    )
  );

-- ── User Settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "away-prod".user_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prod_user_settings_user_id ON "away-prod".user_settings(user_id);

GRANT SELECT, INSERT, UPDATE ON "away-prod".user_settings TO authenticated;

ALTER TABLE "away-prod".user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigene Einstellungen lesen" ON "away-prod".user_settings;
CREATE POLICY "Eigene Einstellungen lesen" ON "away-prod".user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Einstellungen erstellen" ON "away-prod".user_settings;
CREATE POLICY "Eigene Einstellungen erstellen" ON "away-prod".user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigene Einstellungen ändern" ON "away-prod".user_settings;
CREATE POLICY "Eigene Einstellungen ändern" ON "away-prod".user_settings
  FOR UPDATE USING (auth.uid() = user_id);
