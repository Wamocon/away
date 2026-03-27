-- ============================================================
-- Away – Migration: Rollenkonzept + Kalender-Sync + Template-Fields
-- Dieses Skript EINMALIG in Supabase SQL-Editor ausführen!
-- Für jedes Schema separat ausführen: away-dev, away-prod, away-test
-- ============================================================
-- 
-- ANLEITUNG:
-- 1. Gehe zu https://app.supabase.com → Dein Projekt → SQL Editor
-- 2. Kopiere dieses Skript und führe es aus
-- 3. Wähle oben "away-dev" (oder das jeweilige Schema)
-- 4. Ersetze im Skript '<SCHEMA>' durch: away-dev, away-prod oder away-test
-- ============================================================

-- ── Schritt 1: Rollen-Constraint erweitern ──────────────────
-- Altes Constraint entfernen (admin | user) → Neues (admin | approver | employee)
DO $$
DECLARE
  schema_name TEXT := 'away-dev'; -- << HIER SCHEMA ANPASSEN
BEGIN
  EXECUTE format('
    ALTER TABLE %I.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
    ALTER TABLE %I.user_roles ADD CONSTRAINT user_roles_role_check 
      CHECK (role IN (''admin'', ''approver'', ''employee''));
  ', schema_name, schema_name);
  
  -- Bestehende 'user' Rollen zu 'employee' migrieren
  EXECUTE format('
    UPDATE %I.user_roles SET role = ''employee'' WHERE role = ''user'';
  ', schema_name);
END;
$$;

-- ── Schritt 2: vacation_requests erweitern ──────────────────
DO $$
DECLARE
  schema_name TEXT := 'away-dev'; -- << HIER SCHEMA ANPASSEN
BEGIN
  -- Template-Felder für Wizard
  EXECUTE format('
    ALTER TABLE %I.vacation_requests 
    ADD COLUMN IF NOT EXISTS template_id UUID,
    ADD COLUMN IF NOT EXISTS template_fields JSONB DEFAULT ''{}'',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS approved_by UUID,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
  ', schema_name);
END;
$$;

-- ── Schritt 3: Templates-Tabelle ────────────────────────────
DO $$
DECLARE
  schema_name TEXT := 'away-dev'; -- << HIER SCHEMA ANPASSEN
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.vacation_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES %I.organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      file_url TEXT,
      file_name TEXT,
      fields JSONB NOT NULL DEFAULT ''[]'',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE %I.vacation_templates ENABLE ROW LEVEL SECURITY;
    CREATE POLICY IF NOT EXISTS "Template_Org_Self" ON %I.vacation_templates
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM %I.user_roles 
          WHERE organization_id = %I.vacation_templates.organization_id 
          AND user_id = auth.uid()
        )
      );
  ', schema_name, schema_name, schema_name, schema_name, schema_name, schema_name);
END;
$$;

-- ── Schritt 4: Calendar Events (für Outlook/Google Sync) ────
DO $$
DECLARE
  schema_name TEXT := 'away-dev'; -- << HIER SCHEMA ANPASSEN
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      organization_id UUID REFERENCES %I.organizations(id) ON DELETE CASCADE,
      external_id TEXT,
      provider TEXT NOT NULL CHECK (provider IN (''outlook'', ''google'', ''manual'')),
      title TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      all_day BOOLEAN DEFAULT true,
      description TEXT,
      synced_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, external_id, provider)
    );
    ALTER TABLE %I.calendar_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY IF NOT EXISTS "Events_Self" ON %I.calendar_events
      FOR ALL USING (auth.uid() = user_id);
  ', schema_name, schema_name, schema_name, schema_name);
END;
$$;

-- ── Schritt 5: OAuth Provider Settings ─────────────────────
DO $$
DECLARE
  schema_name TEXT := 'away-dev'; -- << HIER SCHEMA ANPASSEN
BEGIN
  -- Erweitere user_settings für OAuth-Tokens
  EXECUTE format('
    COMMENT ON TABLE %I.user_settings IS 
    ''JSONB structure: {email, outlook_token, google_token, outlook_email, google_email, notify_email}'';
  ', schema_name);
END;
$$;

-- ── Grants ──────────────────────────────────────────────────
DO $$
DECLARE
  schema_name TEXT := 'away-dev'; -- << HIER SCHEMA ANPASSEN
BEGIN
  EXECUTE format('
    GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated, service_role;
  ', schema_name, schema_name);
END;
$$;

-- ============================================================
-- Für away-prod: Oben alle schema_name auf 'away-prod' ändern
-- Für away-test: Oben alle schema_name auf 'away-test' ändern
-- ============================================================
