-- ======================================================
-- Away – Rollen-Korrektur V3 (Der definitive Radikal-Fix)
-- ======================================================

DO $$ 
DECLARE
    role_constraint_name TEXT;
BEGIN 
    -- 1. Finde den exakten Namen des Constraints auf der Spalte 'role'
    SELECT conname INTO role_constraint_name
    FROM pg_constraint 
    WHERE conrelid = '"away-dev".user_roles'::regclass 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%';

    -- 2. Falls ein Constraint gefunden wurde, lösche ihn
    IF role_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "away-dev".user_roles DROP CONSTRAINT ' || quote_ident(role_constraint_name);
        RAISE NOTICE 'Constraint % wurde gelöscht.', role_constraint_name;
    END IF;

    -- 3. Den neuen, umfassenden Constraint hinzufügen
    -- Erlaubt alle Rollen für Away und Trace (TeamRadar-Style)
    ALTER TABLE "away-dev".user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('admin', 'approver', 'employee', 'cio', 'department_lead', 'user'));

    -- 4. Daten-Migration: Bestehende 'user' Einträge zu 'employee' machen
    UPDATE "away-dev".user_roles SET role = 'employee' WHERE role = 'user';

    -- 5. Berechtigungen sicherstellen
    GRANT ALL ON SCHEMA "away-dev" TO authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA "away-dev" TO authenticated, service_role;

    RAISE NOTICE 'Rollen-Migration erfolgreich abgeschlossen.';
END $$;
