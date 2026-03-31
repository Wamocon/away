-- ============================================================
-- Add 'cio' role to user_roles check constraint
-- ============================================================

DO $$ 
BEGIN 
    -- Drop existing constraint
    ALTER TABLE "away-dev".user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
    
    -- Add new constraint with 'cio'
    ALTER TABLE "away-dev".user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('admin', 'cio', 'approver', 'employee'));

    -- Update helper function to include 'cio' for approval permissions
    CREATE OR REPLACE FUNCTION public.is_approver_in_org(schema_name text, org_id uuid)
    RETURNS boolean AS $func$
    DECLARE
        found_rec boolean;
    BEGIN
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.user_roles WHERE user_id = auth.uid() AND organization_id = $1 AND role IN (''admin'', ''cio'', ''approver''))', schema_name)
        INTO found_rec
        USING org_id;
        RETURN found_rec;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

END $$;
