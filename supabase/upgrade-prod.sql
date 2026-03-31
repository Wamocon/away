-- ============================================================
-- Away – Production Schema Upgrade (away-prod)
-- Run this in the Supabase SQL Editor to fix the Vacation Wizard
-- ============================================================

-- 1. Update roles check constraint (allowing 'approver' role)
DO $$ 
BEGIN 
    ALTER TABLE "away-prod".user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
    ALTER TABLE "away-prod".user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'approver', 'employee'));
END $$;

-- Update existing 'user' roles to 'employee'
UPDATE "away-prod".user_roles SET role = 'employee' WHERE role = 'user';

-- 2. Create Calendar Events Table for Sync
CREATE TABLE IF NOT EXISTS "away-prod".calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES "away-prod".organizations(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('outlook', 'google')),
    title TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, external_id, provider)
);

-- RLS Policies for calendar_events
ALTER TABLE "away-prod".calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Calendar_View" ON "away-prod".calendar_events 
FOR SELECT USING (EXISTS (SELECT 1 FROM "away-prod".user_roles WHERE organization_id = "away-prod".calendar_events.organization_id AND user_id = auth.uid()));
CREATE POLICY "Calendar_Manage" ON "away-prod".calendar_events 
FOR ALL USING (auth.uid() = user_id);

-- 3. Create Document Templates Table
CREATE TABLE IF NOT EXISTS "away-prod".document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'docx', 'xlsx')),
    storage_path TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES "away-prod".organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for document_templates
ALTER TABLE "away-prod".document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Template_View" ON "away-prod".document_templates
FOR SELECT USING (EXISTS (SELECT 1 FROM "away-prod".user_roles WHERE organization_id = "away-prod".document_templates.organization_id AND user_id = auth.uid()));
CREATE POLICY "Template_Manage_Admin" ON "away-prod".document_templates
FOR ALL USING (public.is_admin_in_org('away-prod', organization_id));

-- 4. Create Document Numbers Table (for Belegnummern tracking)
CREATE TABLE IF NOT EXISTS "away-prod".document_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES "away-prod".organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    document_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, document_id)
);

-- RLS Policies for document_numbers
ALTER TABLE "away-prod".document_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View_Used_Doc_IDs" ON "away-prod".document_numbers
FOR SELECT USING (EXISTS (
    SELECT 1 FROM "away-prod".user_roles 
    WHERE organization_id = "away-prod".document_numbers.organization_id 
    AND user_id = auth.uid()
));
CREATE POLICY "Insert_Doc_ID" ON "away-prod".document_numbers
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Update vacation_requests table with new columns
ALTER TABLE "away-prod".vacation_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE "away-prod".vacation_requests ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE "away-prod".vacation_requests ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES "away-prod".document_templates(id);
ALTER TABLE "away-prod".vacation_requests ADD COLUMN IF NOT EXISTS template_fields JSONB DEFAULT '{}'::jsonb;

-- 6. Grant Permissions (Safety)
GRANT USAGE ON SCHEMA "away-prod" TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "away-prod" TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "away-prod" TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA "away-prod" TO authenticated, service_role;

-- 7. Helper Security Function Updates (Refined)
CREATE OR REPLACE FUNCTION public.is_approver_in_org(schema_name text, org_id uuid)
RETURNS boolean AS $$
DECLARE
    found_rec boolean;
BEGIN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.user_roles WHERE user_id = auth.uid() AND organization_id = $1 AND role IN (''admin'', ''approver''))', schema_name)
    INTO found_rec
    USING org_id;
    RETURN found_rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Storage buckets 'templates' and 'vacation-documents' should be created manually in Supabase UI if they don't exist.
