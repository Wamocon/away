-- ======================================================
-- Away – Rollen-Korrektur (Radikaler Fix für Constraints)
-- ======================================================

DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN 
    -- 1. Alle CHECK-Constraints der Tabelle user_roles im Schema away-dev finden und löschen
    -- Dies stellt sicher, dass wir wirklich einen sauberen Tisch haben, egal wie der alte Constraint heißt.
    FOR constraint_record IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = '"away-dev".user_roles'::regclass 
        AND contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE "away-dev".user_roles DROP CONSTRAINT ' || quote_ident(constraint_record.conname);
    END LOOP;

    -- 2. Den neuen, korrekten Constraint hinzufügen
    -- Inklusive ALLER Rollen, die wir im Switcher haben wollen.
    ALTER TABLE "away-dev".user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('admin', 'approver', 'employee', 'cio', 'department_lead', 'user'));

    -- 3. Daten-Bereinigung: Falls noch 'user' existieren, zu 'employee' machen
    UPDATE "away-dev".user_roles SET role = 'employee' WHERE role = 'user';

    -- 4. Berechtigungen (Grant) für den Service Role Key sicherstellen
    GRANT ALL ON SCHEMA "away-dev" TO service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA "away-dev" TO service_role;
END $$;
