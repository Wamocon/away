-- ============================================================
-- AWAY – FIX: ADD SETTINGS COLUMN TO ORGANIZATIONS
-- ============================================================

-- This script adds the missing 'settings' column to the organizations table
-- across all relevant schemas (away-dev, away-prod, away-test).

DO $$
DECLARE
  schema_names TEXT[] := ARRAY['away-dev', 'away-prod', 'away-test'];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY schema_names
  LOOP
    -- 1. Check if schema exists before proceeding
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
      
      -- 2. Add 'settings' column if it doesn't exist
      EXECUTE format('
        ALTER TABLE %I.organizations 
        ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT ''{}'';
      ', s);
      
      -- 3. Ensure RLS is enabled (should be already, but for safety)
      EXECUTE format('ALTER TABLE %I.organizations ENABLE ROW LEVEL SECURITY;', s);
      
      -- 4. Add/Update policies for the settings column
      -- Policy for SELECT (already exists usually, but refined)
      EXECUTE format('
        DROP POLICY IF EXISTS "Org_View" ON %I.organizations;
        CREATE POLICY "Org_View" ON %I.organizations 
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM %I.user_roles 
            WHERE organization_id = id AND user_id = auth.uid()
          )
        );
      ', s, s, s, s);

      -- Policy for UPDATE (only admins can change settings)
      -- Using the stored function public.is_admin_in_org if it exists, or a direct check
      EXECUTE format('
        DROP POLICY IF EXISTS "Org_Update_Admin" ON %I.organizations;
        CREATE POLICY "Org_Update_Admin" ON %I.organizations 
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM %I.user_roles 
            WHERE organization_id = id 
            AND user_id = auth.uid() 
            AND role = ''admin''
          )
        );
      ', s, s, s);

      RAISE NOTICE 'Schema %: settings column added and RLS policies updated.', s;
    END IF;
  END LOOP;
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
