# Away – Datenbank-Migrations-Anleitung

## Überblick

Away nutzt **drei eigene Postgres-Schemas** (kein `public`-Schema für App-Daten):

| Schema      | Zweck              | Env-Variable                     |
|-------------|--------------------|----------------------------------|
| `away-dev`  | Entwicklung        | `NEXT_PUBLIC_DB_SCHEMA=away-dev`  |
| `away-test` | Test / Staging     | `NEXT_PUBLIC_DB_SCHEMA=away-test` |
| `away-prod` | Produktion         | `NEXT_PUBLIC_DB_SCHEMA=away-prod` |

---

## Szenario A – Neues Deployment (leere Datenbank)

Ausführungsreihenfolge im **Supabase SQL-Editor**:

```
1. supabase/away-dev.sql    → Schema + alle Tabellen + Policies + Indizes (Entwicklung)
2. supabase/away-test.sql   → Schema + alle Tabellen + Policies + Indizes (Test)
3. supabase/away-prod.sql   → Schema + alle Tabellen + Policies + Indizes (Produktion)
4. supabase/seed-away-dev.sql   → (optional) Testdaten für Entwicklung
5. supabase/seed-away-test.sql  → (optional) Testdaten für Test/CI
6. supabase/create-test-users.sql → (optional) Testnutzer anlegen
```

> **Hinweis:** Die drei Basis-Skripte erstellen auch die Public-Hilfsfunktionen
> (`is_admin_in_org`, `is_approver_in_org`, `set_default_user_settings`).
> Es reicht, eines davon auszuführen – alle drei sind idempotent.

---

## Szenario B – Bestehendes Deployment aktualisieren (v4.1)

Nur **ein Skript** ausführen:

```
supabase/migrations/20260402_v4_1_consolidated.sql
```

Dieses Skript ist vollständig **idempotent** – es kann beliebig oft ausgeführt
werden ohne Datenverlust oder Fehler:

- Bestehende Nutzer, Rollen, Anträge und Organisationen bleiben erhalten
- Neue Spalten werden nur hinzugefügt, wenn sie noch nicht vorhanden sind
- Policies werden vor dem Erstellen gelöscht (DROP … IF EXISTS)
- Tabellen werden nur erstellt, wenn sie noch nicht vorhanden sind
- Der Rollenwert `'user'` wird automatisch zu `'employee'` migriert
- Nicht vorhandene Schemas werden übersprungen (z. B. wenn nur prod läuft)

### Was dieses Skript macht

| # | Änderung | Betrifft |
|---|----------|----------|
| 1 | Public-Hilfsfunktionen aktualisieren (`CREATE OR REPLACE`) | Alle Schemas |
| 2 | `organizations.settings` JSONB-Spalte hinzufügen (falls fehlt) | alle 3 |
| 3 | `user_roles` Constraint erweitern: `cio`, `department_lead` | alle 3 |
| 4 | `vacation_requests` Spalten ergänzen: `template_fields`, `template_id`, `notes`, `approved_by`, `approved_at`, `updated_at` | alle 3 |
| 5 | `calendar_events` Tabelle erstellen (falls fehlt) + Policies | alle 3 |
| 6 | `document_templates` Tabelle erstellen (falls fehlt) + Policies | alle 3 |
| 7 | `document_numbers` Tabelle erstellen (falls fehlt) + Policies (alle historischen Policy-Namen bereinigt) | alle 3 |
| 8 | `legal_consents` Tabelle erstellen (falls fehlt) + Policies | alle 3 |
| 9 | Grants für `authenticated` und `service_role` setzen | alle 3 |
| 10 | Performance-Indizes auf `vacation_requests` und `document_numbers` | alle 3 |
| 11 | `organization_members`-View anlegen (SystemTab/Reports-Kompatibilität) | alle 3 |
| 12 | Trigger `trg_default_user_settings` für JSONB-Standardwerte | alle 3 |
| 13 | Neue Policies: `Settings_Admin_Read`, `Vac_View_Approver`, `Vac_Update_Approver` | alle 3 |

---

## Weitere Hilfsskripte (Root-Verzeichnis)

| Datei | Zweck | Wann ausführen |
|-------|-------|----------------|
| `away-legacy-drop.sql` | Löscht veraltete Schemas `away_dev`, `away_test`, `away_prod` (Unterstrich-Varianten) | Einmalig, falls noch vorhanden |
| `create-test-users.sql` | Legt Testnutzer (Admin, Genehmiger, Mitarbeiter) in allen Schemas an | Nur in Dev/Test |
| `seed-away-dev.sql` | Befüllt `away-dev` mit Beispieldaten | Nur in Dev |
| `seed-away-test.sql` | Befüllt `away-test` mit Beispieldaten | Nur in Test/CI |

---

## JSONB-Schema: `user_settings.settings`

Ab v4.1 kann das `settings`-Objekt folgende Felder enthalten:

```jsonc
{
  // Profil
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "language": "de | en",
  "timezone": "Europe/Berlin",
  "signatureUrl": "string (Storage-Pfad)",

  // Urlaubsplanung
  "vacationQuota": 30,       // Standard: 30 Tage/Jahr
  "carryOver": 0,            // Übertrag aus Vorjahr

  // Stellvertretung
  "deputyName": "string",
  "deputyEmail": "string",

  // Benachrichtigungen
  "notifyOnApproval": true,
  "notifyOnRejection": true,
  "notifyOnReminder": false,

  // Kalender-OAuth (ab v3.x)
  "googleTokens": { "access_token": "...", "refresh_token": "...", "expiry": "..." },
  "outlookTokens": { "access_token": "...", "refresh_token": "...", "expiry": "..." }
}
```

---

## Archiv

Ältere Migrations-Skripte (bereits auf `away-dev` angewendet, dann auf alle Schemas übertragen)
befinden sich in `migrations/archive/`. Sie müssen **nicht** erneut ausgeführt werden –
ihr Inhalt ist vollständig in `20260402_v4_1_consolidated.sql` enthalten.
