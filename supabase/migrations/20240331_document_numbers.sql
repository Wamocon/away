-- ============================================================
-- Away – Document Numbers Uniqueness Tracking
-- ============================================================

-- Create a table specifically for tracking used Belegnummern (Document IDs)
-- per organization to ensure they are unique.

CREATE TABLE IF NOT EXISTS "away-dev".document_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES "away-dev".organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    document_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure document_id is unique within the same organization
    UNIQUE (organization_id, document_id)
);

-- RLS Policies
ALTER TABLE "away-dev".document_numbers ENABLE ROW LEVEL SECURITY;

-- Everybody in the same organization can see which document IDs are used
CREATE POLICY "View_Used_Doc_IDs" ON "away-dev".document_numbers
FOR SELECT USING (EXISTS (
    SELECT 1 FROM "away-dev".user_roles 
    WHERE organization_id = "away-dev".document_numbers.organization_id 
    AND user_id = auth.uid()
));

-- Any authenticated user can register their own document ID
CREATE POLICY "Insert_Doc_ID" ON "away-dev".document_numbers
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No updates or deletes allowed for auditing purposes
-- (Alternatively, we could allow admin to delete if an entry was wrong)

GRANT USAGE ON SCHEMA "away-dev" TO authenticated, service_role;
GRANT ALL ON "away-dev".document_numbers TO authenticated, service_role;
