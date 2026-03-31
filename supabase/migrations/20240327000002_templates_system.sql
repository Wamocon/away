-- Away – Document Templates & Storage
-- ============================================================

-- BITTE SETZEN: SCHEMA ZIEL (z.B. "away-dev", "away-test" oder "away-prod")
SET search_path TO "away-dev", public;

-- 1. Create Document Templates Table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'docx', 'xlsx')),
    storage_path TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS Policies for document_templates
ALTER TABLE "away-dev".document_templates ENABLE ROW LEVEL SECURITY;

-- Select: Everyone in the org can see templates
CREATE POLICY "Template_View" ON document_templates
FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE organization_id = document_templates.organization_id AND user_id = auth.uid()));

-- All (Insert/Update/Delete): Only admins can manage templates
CREATE POLICY "Template_Manage_Admin" ON document_templates
FOR ALL USING (public.is_admin_in_org('away-dev', organization_id));

-- 3. Update vacation_requests to track used template
ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES document_templates(id);

-- 4. Storage Bucket Setup (Metadata only, Bucket creation requires CLI/UI)
-- Note: The 'templates' and 'vacation-documents' buckets should be created in Supabase UI.
-- These are the recommended policies:
-- bucket 'templates': read: authenticated, write: admin
-- bucket 'vacation-documents': read: owner/admin, write: owner
