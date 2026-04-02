-- ============================================================
-- Away v4.1 – Erweiterungen: User-Settings, Performance-Indizes
-- ============================================================
-- Ausführen pro Schema (dev / test / prod):
--   SET search_path TO "away-dev", public;
--   -- oder: SET search_path TO "away-test", public;
--   -- oder: SET search_path TO "away-prod", public;

-- BITTE SETZEN:
SET search_path TO "away-dev", public;

-- ============================================================
-- 1. user_settings.settings – JSONB-Schema-Dokumentation
-- ============================================================
-- Ab v4.1 enthält das JSONB-Objekt `settings` folgende Felder:
--
-- Profil:
--   firstName         TEXT     -- Vorname
--   lastName          TEXT     -- Nachname
--   email             TEXT     -- E-Mail Adresse
--   language          TEXT     -- Sprachcode: 'de' | 'en'
--   timezone          TEXT     -- IANA-Timezone, z.B. 'Europe/Berlin'
--   signatureUrl      TEXT     -- Storage-Pfad zur Unterschrift (Bucket: signatures)
--
-- Urlaubsplanung:
--   vacationQuota     INT      -- Urlaubstage pro Jahr (Standard: 30)
--   carryOver         INT      -- Übertrag aus Vorjahr (Standard: 0)
--
-- Stellvertretung:
--   deputyName        TEXT     -- Name der Vertretungsperson
--   deputyEmail       TEXT     -- E-Mail der Vertretungsperson
--
-- Benachrichtigungen:
--   notifyOnApproval  BOOL     -- Benachrichtigung bei Genehmigung (Standard: true)
--   notifyOnRejection BOOL     -- Benachrichtigung bei Ablehnung (Standard: true)
--   notifyOnReminder  BOOL     -- Erinnerungsbenachrichtigungen (Standard: false)
--
-- Kalender-OAuth (ab v3.x):
--   googleTokens      JSONB    -- { access_token, refresh_token, expiry }
--   outlookTokens     JSONB    -- { access_token, refresh_token, expiry }

COMMENT ON TABLE user_settings IS
  'Benutzereinstellungen als JSONB. Ab v4.1 inkl. Urlaubskontingent, Stellvertretung und Benachrichtigungseinstellungen.';

-- Sicherstellen, dass der user_settings-Check auf `settings` korrekt ist:
-- (Keine Schema-Änderung nötig – JSONB ist flexibel; Kommentar dient der Dokumentation)


-- ============================================================
-- 2. document_numbers – Nummerierungslogik
-- ============================================================
-- Tabelle bereits in Migration 20240331_document_numbers.sql angelegt.
-- Format der document_id ab v4.1:
--   [Initial Vorname][2 Buchstaben Nachname][Jahr][laufende Zahl]
--   Beispiel: NSC20260, NSC20261, NSC20262, ...
--   (kein Zero-Padding mehr, rein numerischer Zähler)

-- Performanz-Index für Lookup nach Organisation:
CREATE INDEX IF NOT EXISTS idx_document_numbers_org
  ON document_numbers (organization_id);

-- Index für direktes Lookup des letzten Zählers pro User/Org:
CREATE INDEX IF NOT EXISTS idx_document_numbers_user_org
  ON document_numbers (organization_id, user_id, created_at DESC);

COMMENT ON COLUMN document_numbers.document_id IS
  'Einzigartiger Belegbezeichner im Format [FNameInitial][2xNachname][Jahr][Zähler], z.B. NSC20260';


-- ============================================================
-- 3. vacation_requests – Performance-Indizes für SystemTab
-- ============================================================
-- Der Admin-System-Tab führt Aggregat-Queries nach Status und Organisation aus.

CREATE INDEX IF NOT EXISTS idx_vacation_requests_org_status
  ON vacation_requests (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_vacation_requests_org_created
  ON vacation_requests (organization_id, created_at DESC);

-- Für rollenbasierte Dashboards (isAdminView):
CREATE INDEX IF NOT EXISTS idx_vacation_requests_user_org
  ON vacation_requests (user_id, organization_id);


-- ============================================================
-- 4. organization_members – Alias-View für Kompatibilität
-- ============================================================
-- Der SystemTab und Reports-Screen lesen aus organization_members.
-- Falls die Tabelle nicht existiert (ältere Installationen), nutzen wir user_roles:

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = current_schema()
    AND tablename = 'organization_members'
  ) THEN
    EXECUTE $sql$
      CREATE VIEW organization_members AS
        SELECT
          id,
          user_id,
          organization_id,
          role,
          created_at
        FROM user_roles;
      COMMENT ON VIEW organization_members IS
        'Kompatibilitäts-View: mappt user_roles auf organization_members für SystemTab/Reports';
    $sql$;
  END IF;
END $$;


-- ============================================================
-- 5. user_settings – Standard-JSONB-Schema via Trigger
-- ============================================================
-- Beim INSERT ohne bestimmte Felder werden Standardwerte gesetzt.

CREATE OR REPLACE FUNCTION set_default_user_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Standardwerte für neue Felder im JSONB mergen (vorhandene Felder bleiben erhalten)
  NEW.settings := '{
    "vacationQuota": 30,
    "carryOver": 0,
    "notifyOnApproval": true,
    "notifyOnRejection": true,
    "notifyOnReminder": false
  }'::jsonb || NEW.settings;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_user_settings ON user_settings;
CREATE TRIGGER trg_default_user_settings
  BEFORE INSERT ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_default_user_settings();


-- ============================================================
-- 6. RLS-Policy: Admin kann Einstellungen aller Org-Mitglieder lesen
-- ============================================================
-- Admins müssen gelegentlich Stellvertreter-Infos einsehen.

DROP POLICY IF EXISTS "Settings_Admin_Read" ON user_settings;
CREATE POLICY "Settings_Admin_Read" ON user_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id = user_settings.organization_id
      AND user_roles.role = 'admin'
    )
  );


-- ============================================================
-- Fertig – Bitte analog für away-test und away-prod ausführen.
-- ============================================================
