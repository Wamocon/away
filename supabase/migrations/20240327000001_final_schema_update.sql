-- Away – Final Schema Update & Enhancements
-- ============================================================

-- BITTE SETZEN: SCHEMA ZIEL (z.B. "away-dev", "away-test" oder "away-prod")
SET search_path TO "away-dev", public;

-- 1. Update Roles check constraint
-- First, drop the old constraint if it exists (requires knowing the constraint name or using a block)
DO $$ 
BEGIN 
    ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'approver', 'employee'));
END $$;

-- Update existing 'user' roles to 'employee'
UPDATE user_roles SET role = 'employee' WHERE role = 'user';

-- 2. Create Calendar Events Table for Sync
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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

-- 3. RLS Policies for calendar_events
ALTER TABLE "away-dev".calendar_events ENABLE ROW LEVEL SECURITY;

-- Select: Everyone in the org can see synced events (to avoid overlaps)
CREATE POLICY "Calendar_View" ON calendar_events 
FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE organization_id = calendar_events.organization_id AND user_id = auth.uid()));

-- All (Insert/Update/Delete): Only the owner can manage their synced events
CREATE POLICY "Calendar_Manage" ON calendar_events 
FOR ALL USING (auth.uid() = user_id);

-- 4. Update vacation_requests to include specialized tracking (optional polish)
ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- 5. Grant Permissions (Safety)
GRANT ALL ON calendar_events TO authenticated, service_role;
