-- ==========================================
-- Away – Finalized Schema & Security Config
-- ==========================================

-- 1. Grant Schema Usage (Ensure Auth role can access away-dev)
GRANT USAGE ON SCHEMA "away-dev" TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "away-dev" TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "away-dev" TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA "away-dev" TO authenticated, service_role;

-- 2. Helper Security Function
CREATE OR REPLACE FUNCTION public.is_approver_in_org(org_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "away-dev".user_roles
        WHERE user_id = auth.uid()
        AND organization_id = org_id
        AND role IN ('admin', 'approver')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Storage Bucket & Policies
-- We use the existing 'signatures' bucket (safe via ON CONFLICT)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Unique policy names for Away App to avoid conflicts with TeamRadar etc.
DROP POLICY IF EXISTS "Away_Signature_Select" ON storage.objects;
CREATE POLICY "Away_Signature_Select" ON storage.objects
FOR SELECT USING (
    bucket_id = 'signatures' 
    AND (
        -- Is Owner of the vacation request folder
        (auth.uid())::text = (storage.foldername(name))[1] 
        OR 
        -- Is Admin/Approver of the organization the request belongs to
        public.is_approver_in_org(
            (SELECT organization_id FROM "away-dev".vacation_requests WHERE id::text = (storage.foldername(name))[1])
        )
    )
);

DROP POLICY IF EXISTS "Away_Signature_Insert" ON storage.objects;
CREATE POLICY "Away_Signature_Insert" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'signatures' 
    AND auth.role() = 'authenticated'
);

-- 4. Ensure Table Consistency
ALTER TABLE "away-dev".vacation_requests 
ADD COLUMN IF NOT EXISTS template_fields JSONB DEFAULT '{}'::jsonb;

-- 5. Fix possible missing from/to in legacy records
-- (Ensure all records match the new schema expectations)
ALTER TABLE "away-dev".vacation_requests ALTER COLUMN "from" SET NOT NULL;
ALTER TABLE "away-dev".vacation_requests ALTER COLUMN "to" SET NOT NULL;
