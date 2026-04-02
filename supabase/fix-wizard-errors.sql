-- ============================================================
-- AWAY – FIX WIZARD ERRORS & SIGNATURE POLICIES
-- ============================================================

-- 1. DATABASE TABLES (document_numbers)
-- Repeat for all schemas to ensure they exist
DO $$ 
DECLARE 
    schema_name TEXT;
BEGIN 
    FOR schema_name IN SELECT unnest(ARRAY['away-dev', 'away-test', 'away-prod']) LOOP
        -- Check if schema exists
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = schema_name) THEN
            -- Create table in schema
            EXECUTE format('CREATE TABLE IF NOT EXISTS %I.document_numbers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id UUID NOT NULL REFERENCES %I.organizations(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
                document_id TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now(),
                UNIQUE (organization_id, document_id)
            )', schema_name, schema_name);

            -- RLS Enable
            EXECUTE format('ALTER TABLE %I.document_numbers ENABLE ROW LEVEL SECURITY', schema_name);

            -- Drop existing if any to avoid errors
            EXECUTE format('DROP POLICY IF EXISTS "View_Used_Doc_IDs" ON %I.document_numbers', schema_name);
            EXECUTE format('DROP POLICY IF EXISTS "Insert_Doc_ID" ON %I.document_numbers', schema_name);

            -- Policies
            EXECUTE format('CREATE POLICY "View_Used_Doc_IDs" ON %I.document_numbers FOR SELECT USING (EXISTS (SELECT 1 FROM %I.user_roles WHERE organization_id = %I.document_numbers.organization_id AND user_id = auth.uid()))', schema_name, schema_name, schema_name);
            EXECUTE format('CREATE POLICY "Insert_Doc_ID" ON %I.document_numbers FOR INSERT WITH CHECK (auth.uid() = user_id)', schema_name);

            -- Grants
            EXECUTE format('GRANT ALL ON %I.document_numbers TO authenticated, service_role', schema_name);
        END IF;
    END LOOP;
END $$;

-- 2. STORAGE BUCKET & UPDATED POLICIES
-- Ensure 'signatures' bucket is public=false (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Fix the Signature policies to correctly use request_id folder
DROP POLICY IF EXISTS "Away_Signature_Select" ON storage.objects;
CREATE POLICY "Away_Signature_Select" ON storage.objects
FOR SELECT USING (
    bucket_id = 'signatures' 
    AND (
        -- Requester can see their own signatures
        EXISTS (
            SELECT 1 FROM "away-dev".vacation_requests 
            WHERE id::text = (storage.foldername(name))[1] 
            AND user_id = auth.uid()
        )
        OR 
        -- Approver can see it
        public.is_approver_in_org(
            'away-dev', 
            (SELECT organization_id FROM "away-dev".vacation_requests WHERE id::text = (storage.foldername(name))[1])
        )
    )
);

DROP POLICY IF EXISTS "Away_Signature_Insert" ON storage.objects;
CREATE POLICY "Away_Signature_Insert" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'signatures' 
    AND (
        -- Requester can upload to their own request folder
        EXISTS (
            SELECT 1 FROM "away-dev".vacation_requests 
            WHERE id::text = (storage.foldername(name))[1] 
            AND user_id = auth.uid()
        )
    )
);
