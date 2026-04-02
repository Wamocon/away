-- ============================================================
-- AWAY – ABSOLUTE FINAL FIX FOR DOCUMENT TABLES
-- ============================================================

-- 1. Sicherstellen, dass das Schema existiert
CREATE SCHEMA IF NOT EXISTS "away-dev";

-- 2. Tabelle erstellen (explizit im away-dev Schema)
CREATE TABLE IF NOT EXISTS "away-dev".document_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES "away-dev".organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    document_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, document_id)
);

-- 3. Berechtigungen setzen (WICHTIG für API Zugriff)
GRANT USAGE ON SCHEMA "away-dev" TO authenticated, anon, service_role;
GRANT ALL ON "away-dev".document_numbers TO authenticated, service_role;

-- 4. RLS & Policies
ALTER TABLE "away-dev".document_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doc_Numbers_Select" ON "away-dev".document_numbers;
CREATE POLICY "Doc_Numbers_Select" ON "away-dev".document_numbers 
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Doc_Numbers_Insert" ON "away-dev".document_numbers;
CREATE POLICY "Doc_Numbers_Insert" ON "away-dev".document_numbers 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. CACHE RELOAD
-- Dies zwingt Supabase, die neuen Tabellen sofort in der API anzuzeigen
NOTIFY pgrst, 'reload schema';

-- HINWEIS: Wenn dies immer noch fehlschlägt, ist die Tabelle evtl. in einem
-- anderen Schema. Führen Sie diesen Befehl aus, um alle Tabellen zu sehen:
-- SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'document_numbers';
