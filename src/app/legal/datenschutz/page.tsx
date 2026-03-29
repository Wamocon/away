'use client';

import React from 'react';
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell';

export default function DatenschutzPage() {
  return (
    <LegalPageShell title="Datenschutzerklärung" updatedAt="März 2026">
      <LegalSection title="1. Verantwortlicher">
        <p>Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
        <div className="space-y-1 pt-1">
          <p className="font-bold">WAMOCON GmbH</p>
          <p>Mergenthalerallee 79 – 81, 65760 Eschborn</p>
          <p>Telefon: <a className="font-medium text-[var(--primary)] hover:underline" href="tel:+4961965838311">+49 6196 5838311</a></p>
          <p>E-Mail: <a className="font-medium text-[var(--primary)] hover:underline" href="mailto:info@wamocon.com">info@wamocon.com</a></p>
          <p>Projektkontakt: <a className="font-medium text-[var(--primary)] hover:underline" href="mailto:info@away-app.com">info@away-app.com</a></p>
        </div>
      </LegalSection>

      <LegalSection title="2. Überblick über die Datenverarbeitung">
        <p>Diese Datenschutzerklärung gilt für die Website und Webanwendung AWAY. AWAY ist eine digitale Plattform für professionelles Urlaubsmanagement, Abwesenheitsplanung und Teamkoordination.</p>
        <p>Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur Bereitstellung einer funktionsfähigen Plattform sowie unserer Inhalte und Leistungen erforderlich ist.</p>
      </LegalSection>

      <LegalSection title="3. Rechtsgrundlagen">
        <p>Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 lit. a (Einwilligung), lit. b (Vertragserfüllung), lit. c (rechtliche Verpflichtung) und lit. f (berechtigtes Interesse) DSGVO.</p>
      </LegalSection>

      <LegalSection title="4. Hosting und Infrastruktur">
        <p>Wir nutzen folgende Dienste für den Betrieb von AWAY:</p>
        <div className="space-y-4">
          <div>
            <p className="font-bold">Vercel Inc.</p>
            <p>Die Anwendung wird über Vercel gehostet (Art. 6 Abs. 1 lit. f DSGVO).</p>
          </div>
          <div>
            <p className="font-bold">Supabase Inc.</p>
            <p>Für Datenbank, Authentifizierung und Dateispeicher nutzen wir Supabase (Art. 6 Abs. 1 lit. b DSGVO).</p>
          </div>
          <div>
            <p className="font-bold">Resend Inc.</p>
            <p>Für den Versand von Einladungs-E-Mails nutzen wir Resend (Art. 6 Abs. 1 lit. b DSGVO).</p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="5. Registrierung und Nutzung">
        <p>Bei der Registrierung verarbeiten wir E-Mail, Name und projektbezogene Rollen zur Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).</p>
        <p>Im Rahmen der Nutzung werden Urlaubsanträge, Abwesenheitszeiten, Teamzugehörigkeiten und Kalender-Synchronisations-Daten verarbeitet.</p>
      </LegalSection>

      <LegalSection title="6. Cookies und lokale Speicherung">
        <p>AWAY verwendet technisch notwendige Cookies zur Sitzungsverwaltung. Tracking- oder Analyse-Cookies werden ohne ausdrückliche Einwilligung nicht eingesetzt.</p>
      </LegalSection>

      <LegalSection title="7. Betroffenenrechte">
        <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch (Art. 15-21 DSGVO).</p>
      </LegalSection>

      <LegalSection title="8. Beschwerderecht">
        <p>Sie haben das Recht auf Beschwerde bei der zuständigen Aufsichtsbehörde:</p>
        <p className="font-bold">Der Hessische Beauftragte für Datenschutz und Informationsfreiheit</p>
        <p>Gustav-Stresemann-Ring 1, 65189 Wiesbaden</p>
      </LegalSection>
    </LegalPageShell>
  );
}
