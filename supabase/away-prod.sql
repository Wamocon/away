-- ============================================================
-- Away – Schema: away-prod  (Produktions-Umgebung)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS "away-prod";

-- Organizations
CREATE TABLE IF NOT EXISTS "away-prod".organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS "away-prod".user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES "away-prod".organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- User Settings (JSONB Struktur)
CREATE TABLE IF NOT EXISTS "away-prod".user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES "away-prod".organizations(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- Vacation Requests
CREATE TABLE IF NOT EXISTS "away-prod".vacation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES "away-prod".organizations(id) ON DELETE CASCADE,
  "from" DATE NOT NULL,
  "to" DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS & Grants
ALTER TABLE "away-prod".organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-prod".user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-prod".user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE "away-prod".vacation_requests ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "away-prod" TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "away-prod" TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "away-prod" TO authenticated, service_role;

-- Policies (Nicht-rekursiv über public function)
CREATE POLICY "Org_View" ON "away-prod".organizations FOR SELECT USING (EXISTS (SELECT 1 FROM "away-prod".user_roles WHERE organization_id = id AND user_id = auth.uid()));
CREATE POLICY "Org_All_Admin" ON "away-prod".organizations FOR ALL USING (public.is_admin_in_org('away-prod', id));
CREATE POLICY "Role_Self" ON "away-prod".user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Settings_Self" ON "away-prod".user_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Vac_Self" ON "away-prod".vacation_requests FOR ALL USING (auth.uid() = user_id);
