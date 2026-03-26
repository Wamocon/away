# Supabase Setup Guide – Away App

Dieses Dokument beschreibt die vollständige Einrichtung der Supabase-Datenbank für die **Away** Urlaubsplanungs-App. Die App verwendet drei isolierte Schemas für Entwicklung, Test und Produktion.

---

## 1. Schemas & Environments

| Umgebung       | Schema       | Env-Variable (`NEXT_PUBLIC_SCHEMA`) | Vercel Kontext  |
|----------------|--------------|--------------------------------------|-----------------|
| Lokale Entwicklung | `away-dev`   | `away-dev`                          | (lokal)         |
| Testumgebung   | `away-test`  | `away-test`                          | Preview Deploy  |
| Produktion     | `away-prod`  | `away-prod`                          | Production      |

---

## 2. SQL-Skripte ausführen

Gehe im Supabase Dashboard zu **SQL Editor** und führe folgende Skripte aus:

1. **`supabase/away-dev.sql`** → für lokale Entwicklung
2. **`supabase/away-test.sql`** → für Testumgebung (Vercel Preview)
3. **`supabase/away-prod.sql`** → für Produktion

Jedes Skript erstellt:
- Schema mit korrekten Berechtigungen
- Tabellen: `organizations`, `user_roles`, `vacation_requests`, `templates`, `user_settings`
- Row Level Security (RLS) Policies
- Indexes

---

## 3. WICHTIG: Manuelle Rechtevergabe (GRANT USAGE)

> [!WARNING]
> Bei **Custom Schemas** in Supabase werden PostgREST-Zugriffsrechte **nicht automatisch** vergeben! Dies muss manuell erledigt werden.

### 3a. Schema in Supabase API freischalten

1. Gehe zu **Project Settings → API**
2. Scrolle zu **"Exposed schemas"**
3. Füge alle drei Schemas hinzu: `away-dev`, `away-test`, `away-prod`
4. Speichern und auf PostgREST-Neustart warten (ca. 30 Sekunden)

### 3b. Grant-Befehle (in den SQL-Skripten bereits enthalten)

Falls du sie manuell ausführen musst:

```sql
-- Für away-dev
GRANT USAGE ON SCHEMA "away-dev" TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "away-dev" TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "away-dev" TO authenticated, service_role;

-- Für away-test (analog)
GRANT USAGE ON SCHEMA "away-test" TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "away-test" TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "away-test" TO authenticated, service_role;

-- Für away-prod (analog)
GRANT USAGE ON SCHEMA "away-prod" TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "away-prod" TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "away-prod" TO authenticated, service_role;
```

---

## 4. Supabase Storage Bucket einrichten

Für den Excel-Vorlagen-Upload wird ein Storage Bucket benötigt:

1. Gehe zu **Storage → Buckets → New Bucket**
2. Name: `templates`
3. **Public**: Nein (privat)
4. Klicke auf "Create bucket"

Als nächstes: Storage Policies konfigurieren (im SQL-Editor):

```sql
-- Authentifizierte Benutzer können eigene Files hochladen
CREATE POLICY "Upload templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates');

-- Authentifizierte Benutzer können Files lesen
CREATE POLICY "Read templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'templates');
```

---

## 5. Supabase Edge Functions deployen

Die App enthält zwei Edge Functions für den E-Mail-Versand:

```bash
# Supabase CLI installieren (falls noch nicht vorhanden)
npm install -g supabase

# Login
supabase login

# Projekt verknüpfen (Projekt-Ref aus Dashboard)
supabase link --project-ref <DEIN_PROJECT_REF>

# Edge Functions deployen
supabase functions deploy send-vacation-mail
supabase functions deploy send-outlook-invite
```

---

## 6. Umgebungsvariablen setzen

### Lokal (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<dein-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<dein-service-role-key>
NEXT_PUBLIC_SCHEMA=away-dev
```

### Vercel (Preview Deployments)

```
NEXT_PUBLIC_SCHEMA=away-test
```

### Vercel (Production)

```
NEXT_PUBLIC_SCHEMA=away-prod
```

---

## 7. Tabellen-Übersicht

### `organizations`
| Spalte      | Typ        | Beschreibung               |
|-------------|------------|----------------------------|
| `id`        | UUID (PK)  | Eindeutige ID              |
| `name`      | TEXT       | Name der Organisation      |
| `created_at`| TIMESTAMPTZ| Erstellungsdatum           |

### `user_roles`
| Spalte            | Typ        | Beschreibung                        |
|-------------------|------------|-------------------------------------|
| `id`              | UUID (PK)  | Eindeutige ID                       |
| `user_id`         | UUID       | Supabase Auth User ID               |
| `organization_id` | UUID (FK)  | Verweis auf `organizations`         |
| `role`            | TEXT       | `'admin'` oder `'user'`             |

### `vacation_requests`
| Spalte            | Typ        | Beschreibung                               |
|-------------------|------------|--------------------------------------------|
| `id`              | UUID (PK)  | Eindeutige ID                              |
| `user_id`         | UUID       | Antragsteller                              |
| `organization_id` | UUID (FK)  | Organisation                               |
| `from`            | DATE       | Beginn des Urlaubs                         |
| `to`              | DATE       | Ende des Urlaubs                           |
| `reason`          | TEXT       | Begründung                                 |
| `status`          | TEXT       | `'pending'`, `'approved'` oder `'rejected'`|

### `templates`
| Spalte            | Typ        | Beschreibung                     |
|-------------------|------------|----------------------------------|
| `id`              | UUID (PK)  | Eindeutige ID                    |
| `organization_id` | UUID (FK)  | Organisation                     |
| `file_name`       | TEXT       | Dateiname im Storage Bucket      |

### `user_settings`
| Spalte      | Typ        | Beschreibung           |
|-------------|------------|------------------------|
| `id`        | UUID (PK)  | Eindeutige ID          |
| `user_id`   | UUID       | Supabase Auth User ID  |
| `email`     | TEXT       | Benachrichtigungs-Mail |

---

## 8. Fehlerdiagnose

**Fehler: "Schema not found" oder "Permission denied"**
- Kontrolliere ob das Schema unter **Project Settings → API → Exposed schemas** eingetragen ist.
- Führe die GRANT-Befehle aus Abschnitt 3b nochmals manuell im SQL-Editor aus.
- Warte 1–2 Minuten damit PostgREST den Cache aktualisiert.

**Fehler: "Row violates RLS policy"**
- Überprüfe ob der Nutzer ein gültiges JWT Token mitschickt (Supabase Auth Session muss aktiv sein).
- Kontrolliere die RLS-Policies für die betroffene Tabelle.
