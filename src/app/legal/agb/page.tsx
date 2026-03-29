import React from 'react';
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AGB | Away Urlaubsplanung',
  description: 'Allgemeine Geschäftsbedingungen der Away Urlaubsplanungs-App.',
};

export default function Agb() {
  return (
    <LegalPageShell title="Allgemeine Geschäftsbedingungen" updatedAt="März 2026">
      <LegalSection title="§ 1 Geltungsbereich">
        <p>(1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB“) der WAMOCON GmbH, Mergenthalerallee 79 – 81, 65760 Eschborn (nachfolgend „Anbieter“), gelten für alle Verträge über die Nutzung der Software-as-a-Service-Plattform Away (nachfolgend „Plattform“).</p>
        <p>(2) Die Plattform richtet sich an Unternehmen, Projektleiter und Teams (nachfolgend „Auftraggeber“) sowie deren Mitarbeiter (nachfolgend „Nutzer“). Es handelt sich um ein B2B-Angebot.</p>
        <p>(3) Away dient der digitalen Verwaltung von Urlaubsanträgen, Abwesenheiten und der Teamkoordination.</p>
      </LegalSection>

      <LegalSection title="§ 2 Vertragsschluss & Registrierung">
        <p>(1) Ein rechtsverbindlicher Vertrag kommt durch den Abschluss des Registrierungsprozesses oder die Annahme einer Einladung in eine Organisation und die damit verbundene Akzeptanz dieser AGB zustande.</p>
        <p>(2) Der Anbieter behält sich vor, den Zugang technisch erst nach erfolgreicher Validierung der E-Mail-Adresse freizuschalten.</p>
      </LegalSection>

      <LegalSection title="§ 3 Leistungsbeschreibung">
        <p>(1) Away bietet insbesondere folgende Funktionen:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Einreichung und Verwaltung von Urlaubsanträgen</li>
          <li>Genehmigungsworkflow für Vorgesetzte und Administratoren</li>
          <li>Kalenderübersicht für Teams und Organisationen</li>
          <li>Integration mit externen Kalendersystemen (Google/Microsoft)</li>
          <li>Export von Abwesenheitsbescheinigungen und Listen (XLSX, PDF)</li>
        </ul>
        <p>(2) Der Anbieter gewährleistet eine branchenübliche Verfügbarkeit der Plattform, sofern nicht Wartungsarbeiten oder unvorhergesehene Störungen vorliegen.</p>
      </LegalSection>

      <LegalSection title="§ 4 Pflichten der Nutzer">
        <p>(1) Nutzer sind verpflichtet, ihre Zugangsdaten geheim zu halten. Eine Weitergabe an Dritte außerhalb der Organisation ist untersagt.</p>
        <p>(2) Bei Missbrauch des Systems oder vorsätzlicher Falscheingabe von Daten behält sich der Anbieter eine Sperrung des Accounts vor.</p>
      </LegalSection>

      <LegalSection title="§ 5 Datenschutz & Vertraulichkeit">
         <p>Der Schutz personenbezogener Daten hat höchste Priorität. Einzelheiten regelt die Datenschutzerklärung. Alle Projektdaten werden streng vertraulich behandelt und verschlüsselt in der EU gehostet.</p>
      </LegalSection>

      <LegalSection title="§ 6 Schlussbestimmungen">
        <p>Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand für alle Streitigkeiten ist Frankfurt am Main, sofern der Auftraggeber Kaufmann ist.</p>
      </LegalSection>
    </LegalPageShell>
  );
}
