# Produkthandbuch: Away - Professionelle Urlaubsplanung

> **Version 2.0** | Stand: April 2026 | WAMOCON

---

## Inhaltsverzeichnis

1. [Uebersicht](#1-uebersicht)
2. [Business Model: Lite und Pro](#2-business-model-lite-und-pro)
3. [Tutorials - Erste Schritte](#3-tutorials)
4. [How-to Guides](#4-how-to-guides)
5. [Funktionsreferenz](#5-funktionsreferenz)
6. [Technische Architektur](#6-technische-architektur)
7. [Compliance und DSGVO](#7-compliance-und-dsgvo)
8. [Glossar](#8-glossar)

---

## 1. Uebersicht

**Away** ist eine webbasierte SaaS-Loesung fuer die digitale Urlaubsplanung in Teams und Organisationen.

**Was Away loest:**
- Papierbasierte oder Excel-Prozesse abschaffen
- Echtzeit-Kalender fuer Teams
- DSGVO-konforme Dokumentation
- Zugriff von jedem Endgeraet

---

## 2. Business Model: Lite und Pro

Away ist in zwei Plaenen verfuegbar. Beide koennen **30 Tage kostenlos getestet** werden.

### 2.1 Planuebersicht

| Feature | Lite | Pro |
| :--- | :---: | :---: |
| Urlaubsantraege stellen und genehmigen | Ja | Ja |
| In-App Kalender | Ja | Ja |
| Rollen: Mitarbeiter, Genehmiger, Admin | Ja | Ja |
| Benutzereinstellungen | Ja | Ja |
| DSGVO-Consent | Ja | Ja |
| Einladungslink | Ja | Ja |
| Max. Benutzer | 50 | Unbegrenzt |
| Organisationen | 1 (fest) | Unbegrenzt |
| Externe Kalender-Sync (Outlook / Google) | Nein | Ja |
| E-Mail-Integration und Versand | Nein | Ja |
| Dokumentvorlagen (PDF / DOCX) | Nein | Ja |
| Reports und Analytics | Nein | Ja |
| Multi-Organisations-Verwaltung | Nein | Ja |
| DSGVO-Admin-Panel | Nein | Ja |
| Kalender-Einladungen (Outlook) | Nein | Ja |

### 2.2 Trial-System

Jede Registrierung startet automatisch einen 30-Tage-Trial.

Lebenszyklus:
- Registrierung → Trial (30 Tage) → Ablauf → Grace Period (30 Tage) → Datenloesch
- Bestellung waehrend Trial oder Grace → Aktiv (unbegrenzt)

| Status | Bedeutung | Zugang |
| :--- | :--- | :--- |
| trial | Testzeitraum laeuft | Voll |
| active | Bezahltes Abo aktiv | Voll |
| pending_order | Upgrade beantragt, Trial laeuft noch | Bis Trial-Ende |
| grace | Trial abgelaufen, Nachfrist (30 Tage) | Gesperrt |
| expired | Abgelaufen | Gesperrt |

### 2.3 Upgrade-Prozess

Per Klick auf Auf Pro upgraden in /settings/subscription:
1. Status wird auf pending_order gesetzt.
2. Mit E-Mail-Provider: automatische Benachrichtigung an WAMOCON.
3. Ohne E-Mail-Provider: System-Mail-Client oeffnet sich mit vorausgefuellter E-Mail.
4. Super-Admin schaltet Plan manuell im /admin/subscriptions-Panel frei.

---

## 3. Tutorials

### 3.1 Mitarbeiter: Ersten Antrag stellen

1. Einladungslink in E-Mail anklicken
2. Passwort vergeben (min. 8 Zeichen)
3. AGB, Datenschutz, DSGVO akzeptieren
4. Dashboard: Neuer Antrag klicken
5. Start- und Enddatum waehlen
6. Grund optional eintragen
7. Absenden - Genehmiger wird informiert
8. Status verfolgen unter Meine Antraege

### 3.2 Administrator: Neue Organisation registrieren

1. /auth/register oeffnen
2. Plan waehlen (Lite oder Pro)
3. Organisations-Name, E-Mail und Passwort eingeben
4. Alle rechtlichen Bedingungen akzeptieren
5. 30 Tage kostenlos starten klicken

### 3.3 Admin: Ersten Genehmiger einladen

1. /admin/settings navigieren
2. Benutzer einladen klicken
3. E-Mail eingeben, Rolle Genehmiger waehlen
4. Einladung senden

---

## 4. How-to Guides

### 4.1 Urlaubsantrag per E-Mail einreichen (ohne Provider)

1. Antrag im Wizard stellen
2. Per E-Mail einreichen klicken
3. System-Mail-Client oeffnet sich mit vorausgefuellter E-Mail (Empfaenger: Genehmiger, Betreff: Antragsdaten)
4. E-Mail pruefen und senden

### 4.2 Genehmiger: Antrag genehmigen oder ablehnen

1. Genehmigungen in Navigation klicken
2. Antrag anklicken
3. Genehmigen oder Ablehnen klicken
4. Optional: Kommentar schreiben

### 4.3 Administrator: Probeabo upgraden

1. /settings/subscription oeffnen
2. Auf Pro upgraden klicken
3. Mit Provider: automatisch; ohne Provider: System-Mail-Client
4. WAMOCON schaltet Plan frei

### 4.4 Pro: Kalender-Sync konfigurieren

1. /settings > OAuth / Kalender oeffnen
2. Anbieter waehlen (Outlook oder Google)
3. E-Mail und Token eingeben
4. Speichern

### 4.5 Super-Admin: Plan freischalten

1. /admin/subscriptions oeffnen
2. Organisation suchen
3. Lite aktiv oder Pro aktiv klicken
4. +30d Trial verlaengert den Testzeitraum
5. Sperren setzt Status auf expired

---

## 5. Funktionsreferenz

### 5.1 Routen-Uebersicht

| Route | Beschreibung | Zugriff |
| :--- | :--- | :--- |
| /auth/login | Anmeldung | Alle |
| /auth/register | Neue Organisation (Trial) | Oeffentlich |
| /auth/accept-invite | Einladung annehmen | Eingeladene |
| /dashboard | Startseite | Alle |
| /dashboard/requests | Meine Antraege | Alle |
| /dashboard/admin-requests | Genehmigungsuebersicht | Genehmiger+ |
| /dashboard/calendar | Teamkalender | Alle |
| /dashboard/organizations | Organisations-Verwaltung | Admin [Pro] |
| /dashboard/reports | Reports und Analytics | Genehmiger+ [Pro] |
| /settings | Profil und Einstellungen | Alle |
| /settings/subscription | Abonnement und Plan | Alle |
| /admin/settings | Organisations-Admin | Admin, CIO |
| /admin/consents | DSGVO-Audit | Admin [Pro] |
| /admin/subscriptions | Subscription-Verwaltung | Super-Admin only |

### 5.2 Rollen und Berechtigungen

| Berechtigung | Employee | Approver | Admin | CIO |
| :--- | :---: | :---: | :---: | :---: |
| Eigene Antraege stellen | Ja | Ja | Ja | Ja |
| Antraege genehmigen | Nein | Ja | Ja | Ja |
| Nutzer einladen | Nein | Nein | Ja | Ja |
| Admin-Einstellungen | Nein | Nein | Ja | Ja |
| Reports (Pro) | Nein | Ja | Ja | Ja |
| DSGVO-Panel (Pro) | Nein | Nein | Ja | Ja |

---

## 6. Technische Architektur

### 6.1 Stack

| Schicht | Technologie |
| :--- | :--- |
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL + RLS + Edge Functions) |
| Deployment | Vercel (serverless + Edge) |
| Tests | Vitest (Unit), Playwright (E2E) |
| Dokumentation | HTML + GitHub Pages |

### 6.2 Middleware-Checks

1. Auth: Nicht eingeloggt > /auth/login
2. Subscription: Abgelaufen > /settings/subscription
3. Plan-Gate: Lite auf Pro-Route > /settings/subscription?upgrade=1
4. Admin-Check: Nicht-Admin auf /admin/* > /dashboard

### 6.3 Cron Job

Taeglich 02:00 UTC via Vercel:
- Trial abgelaufen > expired
- Expired ohne Grace > Grace Period setzen (+30d)
- Grace abgelaufen > Daten loeschen

---

## 7. Compliance und DSGVO

Bei Registrierung und Einladungs-Annahme Pflicht-Zustimmung zu:
1. AGB
2. Datenschutzerklaerung
3. DSGVO-konforme Datenverarbeitung

Jede Einwilligung in legal_consents gespeichert mit user_id, Typ, Version, Zeitstempel.

Nach Grace Period automatisch geloescht: vacation_requests, user_settings, user_roles.

---

## 8. Glossar

| Begriff | Erklaerung |
| :--- | :--- |
| Trial | 30-taegiger kostenloser Testzeitraum |
| Grace Period | 30-taegige Nachfrist nach Trial-Ablauf |
| PlanGate | UI-Komponente fuer Feature-abhaengige Anzeige |
| Super-Admin | WAMOCON-interner Plattform-Administrator |
| RLS | Row Level Security - PostgreSQL-Datenisolation |
| mailto: Fallback | System-Mail-Client oeffnen wenn kein Provider konfiguriert |
| pending_order | Upgrade beantragt, Freischaltung ausstehend |
