# Away Urlaubsplanungs-App

## Setup

1. `.env.local` mit Supabase-Daten füllen
2. `npm run dev` starten

## Features
- Supabase Auth & DB (App-Login)
- Multi-Organisation, Rollen (Admin/User)
- Datei-Upload (Excel-Vorlage)
- Urlaubsantrag stellen
- E-Mail-Versand des Antrags (OAuth2, Google/Microsoft, echter Flow via /api/oauth/google)
- Outlook-Kalenderintegration: Urlaub als Termin + Team-Einladung
- Modular für Integration in andere Apps (Exports via src/exports.ts)

## Hinweise
- Die App-Authentifizierung läuft ausschließlich über Supabase.
- Die OAuth2-Anbindung (Google/Microsoft) wird nur für den E-Mail-Versand und Kalender genutzt, nicht für den App-Login.
- API-Routen für E-Mail und Kalender sind vorbereitet, echter Google-OAuth2-Flow ist implementiert (siehe /api/oauth/google).
- Komponenten können als Modul/Micro-Frontend via src/exports.ts genutzt werden.
- User-E-Mail kann im UserSettings-Dialog gespeichert werden (persistiert in Supabase).
- Tasks.md im Projektroot dokumentiert den aktuellen Stand und die nächsten Schritte.

## Weiterentwicklung
- Echte OAuth2-Flows für Google/Microsoft produktiv schalten
- TeamRadar-Integration
- UI/UX-Feinschliff
