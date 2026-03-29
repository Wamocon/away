-- Migration: Add legal_consents table
CREATE TABLE IF NOT EXISTS "away-dev".legal_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('agb', 'privacy', 'dsgvo')),
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, consent_type, version)
);

ALTER TABLE "away-dev".legal_consents ENABLE ROW LEVEL SECURITY;

-- Users can see their own consents
CREATE POLICY "Consents_View_Own" ON "away-dev".legal_consents 
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can see all consents in their organization (simplified for now to allow global admin view)
CREATE POLICY "Consents_View_Admin" ON "away-dev".legal_consents 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "away-dev".user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

GRANT ALL ON "away-dev".legal_consents TO authenticated, service_role;
