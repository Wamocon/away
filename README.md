# Away – Urlaubsplanung für Teams

> Moderne, DSGVO-konforme Abwesenheitsverwaltung für digitale Teams. Verfügbar als **Lite** und **Pro** – beide mit 30-tägigem Trial.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Business Model

| Feature | Lite | Pro |
|---|:---:|:---:|
| Urlaubsanträge & Genehmigungen | ✅ | ✅ |
| In-App Kalender | ✅ | ✅ |
| Rollen (Mitarbeiter, Genehmiger, Admin) | ✅ | ✅ |
| DSGVO-Consent & Rechtliches | ✅ | ✅ |
| **Max. Nutzer** | **50** | **Unbegrenzt** |
| Outlook / Google Kalender-Sync | ❌ | ✅ |
| E-Mail-Integration (OAuth2) | ❌ | ✅ |
| Reports & Analytics | ❌ | ✅ |
| Multi-Organisations-Verwaltung | ❌ | ✅ |
| DSGVO-Audit-Panel | ❌ | ✅ |

### Trial-Lifecycle

```
Registrierung → Trial (30d) → Ablauf → Grace Period (30d) → Datenlöschung
                                              ↕
                                      Upgrade → Aktiv (unbegrenzt)
```

---

## Quick Start

```bash
git clone https://github.com/wamocon/away
cd away
pnpm install
cp .env.example .env.local   # Umgebungsvariablen setzen
pnpm dev
```

---

## Setup

### Umgebungsvariablen (`.env.local`)

| Variable | Beschreibung | Pflicht |
|---|---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon-Key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-Role-Key (Server-only) | ✅ |
| `CRON_SECRET` | Geheimnis für den Cron-Endpunkt | ✅ |
| `NEXT_PUBLIC_UPGRADE_NOTIFY_EMAIL` | Upgrade-Benachrichtigungs-E-Mail | empfohlen |

### Datenbank

```bash
# Migration in Supabase ausführen
supabase db push
# oder manuell in der Supabase UI:
# supabase/migrations/20260405_v4_6_subscriptions.sql
```

### Super-Admin einrichten

```sql
-- In der Supabase SQL-Konsole ausführen:
INSERT INTO public.super_admins (user_id)
VALUES ('<deine-user-id>');
```

---

## Deployment

### Vercel

```bash
vercel deploy
```

Cron Job ist in `vercel.json` konfiguriert (täglich 02:00 UTC → `/api/cron/check-subscriptions`).

### Produkthandbuch (GitHub Pages)

Das Handbuch unter `docs/manual/` wird automatisch via GitHub Actions auf GitHub Pages veröffentlicht, wenn ein Push auf `main` erfolgt.

---

## Testing

```bash
# Unit Tests (Vitest)
pnpm test

# E2E Tests (Playwright)
pnpm playwright test

# Coverage
pnpm test:coverage
```

---

## Architektur

```
src/
  app/           – Next.js App Router (Seiten & API)
  components/    – React-Komponenten
    ui/          – PlanGate, SubscriptionProvider, ProductTour, …
    layout/      – Sidebar, Header
  lib/           – Supabase-Client, subscription.ts, email.ts, …
supabase/
  migrations/    – SQL-Migrationen
  functions/     – Edge Functions
docs/
  manual/        – Produkthandbuch (HTML + Markdown)
.github/
  workflows/     – CI/CD (GitHub Pages, Tests)
```

---

## Rollen

| Rolle | Beschreibung |
|---|---|
| `employee` | Anträge stellen, eigene Übersicht |
| `approver` | Anträge genehmigen/ablehnen |
| `admin` | Organisation verwalten, Nutzer einladen |
| `cio` | Erweiterte Admin-Rechte |
| Super-Admin | WAMOCON-intern: Subscription-Verwaltung |

---

## Beitragen

Pull Requests sind willkommen. Bitte beachte:
- TypeScript-Typen für alle neuen Funktionen
- Tests für neue Features (`src/__tests__/` oder `e2e/`)
- DSGVO-Konformität bei Datenbankänderungen (RLS-Policy prüfen)

---

## Lizenz

MIT © WAMOCON GmbH

