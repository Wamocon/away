import React from 'react';
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung | Away Urlaubsplanung',
  description: 'Datenschutzerklärung der Away Urlaubsplanungs-App.',
};

export default function Datenschutz() {
  return (
    <LegalPageShell title="Datenschutzerklärung" updatedAt="März 2026">
      <LegalSection title="1. Verantwortliche Stelle">
        <p>Verantwortlich im Sinne der DSGVO ist die WAMOCON GmbH, Mergenthalerallee 79 – 81, 65760 Eschborn.</p>
        <p>E-Mail: info@wamocon.com</p>
      </LegalSection>

      <LegalSection title="2. Zweck der Datenverarbeitung">
        <p>Away verarbeitet personenbezogene Daten (Name, E-Mail, Abwesenheitszeiträume, Begründungen, Rollen innerhalb von Organisationen) ausschließlich zum Zweck der internen Urlaubs- und Teamplanung.</p>
      </LegalSection>

      <LegalSection title="3. Rechtsgrundlagen">
        <p>Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung bei freiwilligen Angaben in Freitextfeldern).</p>
      </LegalSection>

      <LegalSection title="4. Datenspeicherung & Sicherheit">
        <p>Alle Daten werden auf Servern in der Europäischen Union (Supabase / AWS / Hetzner) gespeichert. Wir setzen modernste Verschlüsselungs- und Sicherheitsmechanismen ein, um Ihre Daten vor unbefugtem Zugriff zu schützen.</p>
      </LegalSection>

      <LegalSection title="5. Ihre Rechte">
        <p>Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit Ihrer gespeicherten Daten. Wenden Sie sich hierzu an unseren Datenschutzbeauftragten unter info@wamocon.com.</p>
      </LegalSection>

      <LegalSection title="6. Drittanbieter & Integrationen">
        <p>Bei Nutzung der Kalender-Integration (Google Calendar, Outlook) werden Daten an die jeweiligen Dienste übermittelt, sofern Sie dies explizit autorisieren. Es gelten dann zusätzlich die Datenschutzbestimmungen der jeweiligen Anbieter.</p>
      </LegalSection>
    </LegalPageShell>
  );
}
