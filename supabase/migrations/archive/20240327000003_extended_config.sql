-- Away – Finalized Schema & Security Config
-- ==========================================

-- BITTE SETZEN: SCHEMA ZIEL (z.B. "away-dev", "away-test" oder "away-prod")
SET search_path TO "away-dev", public;

-- 1. Grant Schema Usage (Grants are often schema-specific)
-- Use: GRANT USAGE ON SCHEMA "your-schema" TO authenticated, anon, service_role;

-- 2. Helper Security Function
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
            (SELECT current_schema()), 
            (SELECT organization_id FROM vacation_requests WHERE id::text = (storage.foldername(name))[1])
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
ALTER TABLE vacation_requests 
ADD COLUMN IF NOT EXISTS template_fields JSONB DEFAULT '{}'::jsonb;

-- 5. Fix possible missing from/to in legacy records
-- (Ensure all records match the new schema expectations)
ALTER TABLE vacation_requests ALTER COLUMN "from" SET NOT NULL;
ALTER TABLE vacation_requests ALTER COLUMN "to" SET NOT NULL;
