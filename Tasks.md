# TODO-Liste für Away App

## Version 2 — Abgeschlossen ✅

- [x] CI/CD-Workflows auf `wamocon/github_workflow` Reusable-Workflows umgestellt (`pr-pipeline.yml`, `deploy.yml`)
- [x] Light-Mode CSS repariert: dunklere Textfarben, stärkere Borders, Card-Schatten, `role-cio` CSS-Klasse ergänzt
- [x] Breadcrumbs-Komponente erstellt und in `AppShell.tsx` eingebunden
- [x] FAQ-Seite (`/legal/faq`) und Hilfe-Seite (`/legal/help`) erstellt; `LegalLinks.tsx` erweitert
- [x] InApp-NotificationCenter (Glocken-Icon + Dropdown) erstellt und in Sidebar integriert
- [x] i18n-System erstellt: `i18n.ts` (DE/EN), `LanguageProvider.tsx` Context, Einstellungsseite verdrahtet
- [x] Sidebar vereinfacht: neue Reihenfolge, „Neuer Antrag" → Wizard-URL, Abschnitt „Organisationen" für Admin
- [x] `notifications.ts` komplett überarbeitet: `window.location.origin` Server-Crash behoben, CIO/Approver erhalten nun E-Mails
- [x] Rollen-Fixes: `getUserRole` nutzt `.maybeSingle()`, Middleware erlaubt CIO den Admin-Bereich
- [x] Test-Coverage stark ausgebaut: i18n, utils, auth, notifications, roles — 102 Tests grün
- [x] Playwright GUI-Tests erstellt (5 Spec-Dateien in `e2e/`); lokal only (`.gitignore`)

## Offene Aufgaben

- [ ] OAuth2-Integration für E-Mail-Dienste (nur für E-Mail-Versand, nicht für App-Login)
- [ ] API-Route für E-Mail-Versand mit OAuth2-Token (Google/Microsoft)
- [ ] Outlook-Kalender-Integration (Urlaub als Termin eintragen)
- [ ] Termin-Einladung an Team bei Urlaubsantrag (Outlook)
- [ ] UI: Button für Kalender-Eintrag und Einladung
- [ ] Dokumentation und Hinweise im Code
- [ ] `admin/settings/page.tsx`: Tailwind `block`/`flex`-Klassen-Konflikte bereinigen (pre-existing)
- [x] **BugFix v4.9**: Rekursive RLS-Policy `super_admins_all` auf `public.super_admins` entfernt + nicht-rekursiv mit `is_super_admin()` ersetzt → behebt 500-Fehler in der Aboverwaltung

Ich werde diese Liste bei jedem Schritt aktualisieren und abhaken.
