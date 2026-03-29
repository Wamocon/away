# Produkthandbuch: Away – Professionelle Urlaubsplanung

## 1. Executive Summary
Away ist eine hochmoderne, webbasierte Software-as-a-Service-Lösung zur effizienten Steuerung von Urlaubsansprüchen und Abwesenheiten in Teams und Organisationen. Die Anwendung digitalisiert den gesamten Workflow von der Antragstellung über die Genehmigungslogik bis hin zur revisionssicheren Dokumentation.

**Leistungskern:**
- **Automatisierung**: Vollständige Ablösung papierbasierter oder Excel-gestützter Prozesse.
- **Transparenz**: Echtzeit-Kalender für Teams zur Vermeidung von Kapazitätsengpässen.
- **Compliance**: Integrierte Rechtskonformität durch digitales Consent-Tracking und DSGVO-konforme Datenverarbeitung.
- **Mobilität**: Responsive Web-Technologie für den Zugriff von jedem Endgerät.

---

## 2. Produktübersicht
### 2.1 Produktbeschreibung
Away adressiert die Komplexität moderner Arbeitswelten durch eine intuitive Oberfläche und robuste Backend-Logik. Die Applikation ermöglicht es Organisationen, Urlaubsregeln global zu definieren und dennoch individuell auf Team-Ebene zu steuern.

### 2.2 Zielgruppen
- **Mitarbeiter (Endbenutzer)**: Einfache Erfassung von Anträgen, Einsicht in den eigenen Urlaubsstatus.
- **Teamleiter (Approver)**: Koordination von Team-Abwesenheiten, Genehmigung oder Ablehnung mit Kommentarfunktion.
- **Administratoren**: Organisationsweite Steuerung, Benutzerverwaltung, Compliance-Audit und Reporting.

### 2.3 Funktionsmatrix
| Funktion | Beschreibung | Status |
| :--- | :--- | :--- |
| Urlaubs-Wizard | Geführte Erfassung von Abwesenheiten inkl. Typprüfung | ✅ Operativ |
| Genehmigungs-Workflow | Mehrstufige Statusübergänge (Pending, Approved, Rejected) | ✅ Operativ |
| Team-Kalender | Visualisierung aller Abwesenheiten zur Koordination | ✅ Operativ |
| Dokumenten-Export | Generierung von Excel-Listen und PDF-Nachweisen | ✅ Operativ |
| Legal Consent | Versionierte Speicherung von AGB- und Datenschutz-Zustimmungen | ✅ Operativ |

---

## 3. Benutzerhandbuch
### 3.1 Registrierung & Anmeldung
Nutzer treten der Plattform primär über einen geschützten **Einladungsprozess** bei. Während der Annahme einer Einladung erfolgt die obligatorische Zustimmung zu den aktuellen Rechtstexten.

### 3.2 Urlaubsantrag stellen
Über den Button „Neuer Antrag“ öffnet sich ein geführter Dialog:
1. **Zeitraum**: Auswahl von Start- und Enddatum.
2. **Grund**: Optionale Angabe des Abwesenheitsgrundes.
3. **Abschluss**: Nach Absenden wird die zuständige Führungskraft automatisch (optional via E-Mail) benachrichtigt.

### 3.3 Statusverfolgung
Anträge können in der „Meine Anträge“-Ansicht verfolgt werden. Nutzer sehen unmittelbar, wenn ein Antrag genehmigt oder unter Angabe von Gründen abgelehnt wurde.

---

## 4. Rollen- und Berechtigungskonzept
Away nutzt ein striktes **Role-Based Access Control (RBAC)** Modell:

| Rolle | Berechtigungen |
| :--- | :--- |
| **User** | Eigene Anträge erstellen, Team-Kalender einsehen, eigene Einstellungen verwalten. |
| **Admin** | Alle Anträge der Organisation verwalten, Nutzer einladen, Rollen zuweisen, Compliance-Dashboard einsehen. |

---

## 5. Technische Architektur
### 5.1 Systemübersicht
Die Anwendung basiert auf dem **Next.js App-Router** in Kombination mit **Supabase** als Backend-as-a-Service.

- **Frontend**: React 19, Tailwind CSS (Vanilla-Basis), Lucide Icons.
- **Backend / Database**: Supabase PostgreSQL mit Row Level Security (RLS).
- **Infrastruktur**: Vercel-Deployment, Edge-Functions für E-Mail-Versand.

### 5.2 Offline-Konzept
Durch die Nutzung moderner Web-Technologien und lokaler State-Management-Ansätze sind Grundfunktionen der Ansicht auch bei temporärer Instabilität der Internetverbindung verfügbar.

---

## 6. Rechtliche Dokumentation & Compliance
### 6.1 Zustimmungslogik (Legal Guard)
Away erzwingt für alle neuen Benutzer die aktive Zustimmung zu:
1. **Allgemeinen Geschäftsbedingungen (AGB)**
2. **Datenschutzerklärung**
3. **DSGVO-konformer Datenverarbeitung**

### 6.2 Nachweisbarkeit (Audit Trail)
Jede Zustimmung wird in der Tabelle `legal_consents` mit folgenden Metadaten gespeichert:
- Eindeutige User-ID
- Typ der Zustimmung
- Versionsnummer des Dokuments
- Zeitstempel (Server-Zeit)

---

## 7. Admin-Auswertung & Governance
Das Admin-Dashboard bietet eine dedizierte Compliance-Ansicht (`/admin/consents`). 
- **Transparenz**: Übersicht über den Zustimmungsstatus aller Nutzer.
- **Revisionssicherheit**: Dokumentation von Akzeptanzzeitpunkten für Audits oder Datenschutzprüfungen.
- **Legacy-Handling**: Kennzeichnung von Alt-Accounts als „Unvollständig“, um Migrationsrisiken transparent zu machen.

---

## 8. K6-Synthese: Compliance Framework
Aus Sicht der Corporate Governance stellt Away nicht nur ein Werkzeug zur Urlaubsplanung dar, sondern ein **zentrales Element der digitalen Nachweisführung**:

- **Governance**: Automatisierte Durchsetzung von Richtlinien.
- **Risikomanagement**: Minimierung rechtlicher Risiken durch lückenlose Dokumentation.
- **Operationalisierung**: Transformation von Rechtstexten in technische Schranken (Check-Before-Action).

---

## 9. Audit-Bericht & Fazit
### Status der Rechtslücken
Frühere Defizite (fehlende Impressums-Integration, unklarer Zustimmungsstatus) wurden vollständig behoben. Die Applikation verfügt über produktiv integrierte Rechtstexte und eine technische Sperre für unautorisierte Datennutzung ohne vorherige Zustimmung.

**Bewertung des Reifegrads:** 
🚀 **Produktionsreif (v1.0)** – Technisch implementiert, administrativ auswertbar, juristisch vorbereitet.
