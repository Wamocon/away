-- ============================================================
-- Away – Final Schema Update & Enhancements
-- ============================================================

-- 1. Update Roles check constraint
-- First, drop the old constraint if it exists (requires knowing the constraint name or using a block)
DO $$ 
BEGIN 
    ALTER TABLE "away-dev".user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
    ALTER TABLE "away-dev".user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'approver', 'employee'));
END $$;

-- Update existing 'user' roles to 'employee'
UPDATE "away-dev".user_roles SET role = 'employee' WHERE role = 'user';

-- 2. Create Calendar Events Table for Sync
CREATE TABLE IF NOT EXISTS "away-dev".calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES "away-dev".organizations(id) ON DELETE CASCADE,
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
CREATE POLICY "Calendar_View" ON "away-dev".calendar_events 
FOR SELECT USING (EXISTS (SELECT 1 FROM "away-dev".user_roles WHERE organization_id = "away-dev".calendar_events.organization_id AND user_id = auth.uid()));

-- All (Insert/Update/Delete): Only the owner can manage their synced events
CREATE POLICY "Calendar_Manage" ON "away-dev".calendar_events 
FOR ALL USING (auth.uid() = user_id);

-- 4. Update vacation_requests to include specialized tracking (optional polish)
ALTER TABLE "away-dev".vacation_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE "away-dev".vacation_requests ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- 5. Grant Permissions (Safety)
GRANT ALL ON "away-dev".calendar_events TO authenticated, service_role;
