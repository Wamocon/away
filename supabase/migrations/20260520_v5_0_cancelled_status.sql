-- ============================================================
-- Away v5.0 – 'cancelled' Status für vacation_requests
-- ============================================================
-- Fügt den Wert 'cancelled' zur CHECK-Constraint auf
-- vacation_requests.status in allen drei Schemas hinzu.
--
-- Anleitung: Einmalig im Supabase SQL-Editor ausführen.
-- Schemas, die nicht existieren, werden automatisch übersprungen.
-- ============================================================

DO $migration$
DECLARE
  schemas TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s       TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
      RAISE NOTICE 'Schema % nicht gefunden – übersprungen.', s;
      CONTINUE;
    END IF;

    -- 1. Bestehende CHECK-Constraint entfernen (Name kann variieren)
    EXECUTE format(
      'ALTER TABLE %I.vacation_requests DROP CONSTRAINT IF EXISTS vacation_requests_status_check',
      s
    );

    -- 2. Constraint neu anlegen mit 'cancelled'
    EXECUTE format(
      $f$ALTER TABLE %I.vacation_requests
         ADD CONSTRAINT vacation_requests_status_check
         CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))$f$,
      s
    );

    RAISE NOTICE 'Schema %: vacation_requests CHECK constraint aktualisiert.', s;
  END LOOP;
END
$migration$;

-- 3. Falls vacation_status als ENUM-Typ existiert: Wert ergänzen
--    (läuft außerhalb des Schema-Loops, da ENUMs in pg global sind)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'vacation_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'vacation_status' AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE vacation_status ADD VALUE 'cancelled';
    RAISE NOTICE 'ENUM vacation_status: Wert ''cancelled'' hinzugefügt.';
  END IF;
END
$$;
