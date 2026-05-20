-- Migration v5.0: Add 'cancelled' to vacation_requests.status CHECK constraint
-- and resolve any DB-side blocks on the cancel feature.

-- 1. Drop the existing CHECK constraint on status (name may vary)
ALTER TABLE vacation_requests
  DROP CONSTRAINT IF EXISTS vacation_requests_status_check;

-- Also try common alternative constraint names
ALTER TABLE vacation_requests
  DROP CONSTRAINT IF EXISTS vacation_requests_status_fkey;

-- 2. Re-create with 'cancelled' included
ALTER TABLE vacation_requests
  ADD CONSTRAINT vacation_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- 3. If the column uses an ENUM type, add the value to the enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'vacation_status'
    AND e.enumlabel = 'pending'
  ) THEN
    -- Enum type exists – add 'cancelled' if not already present
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'vacation_status'
      AND e.enumlabel = 'cancelled'
    ) THEN
      ALTER TYPE vacation_status ADD VALUE 'cancelled';
    END IF;
  END IF;
END
$$;
