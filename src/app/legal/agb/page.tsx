'use client';

import React from 'react';
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell';

export default function AgbPage() {
  return (
    <LegalPageShell title="Allgemeine Geschäftsbedingungen" updatedAt="März 2026">
      <LegalSection title="§ 1 Geltungsbereich">
        <p>(1) Diese AGB der WAMOCON GmbH, Mergenthalerallee 79 – 81, 65760 Eschborn (nachfolgend „Anbieter“), gelten für alle Verträge über die Nutzung der Software-as-a-Service-Plattform AWAY (nachfolgend „Plattform“).</p>
        <p>(2) Die Plattform richtet sich an Unternehmen, Organisationen und Teams (nachfolgend „Auftraggeber“) sowie deren Benutzer (nachfolgend „Nutzer“). Es handelt sich um ein B2B-Angebot.</p>
        <p>(3) Abweichende oder ergänzende AGB des Auftraggebers werden nicht Vertragsbestandteil, sofern der Anbieter nicht ausdrücklich schriftlich zustimmt.</p>
        <p>(4) Die Plattform wird laufend weiterentwickelt. Soweit Funktionen im Pilot- oder Teststatus bereitgestellt werden, behält sich der Anbieter vor, den Funktionsumfang zu ändern.</p>
      </LegalSection>

      <LegalSection title="§ 2 Vertragsschluss">
        <p>(1) Die Darstellung der Plattform auf der Website stellt kein verbindliches Angebot dar.</p>
        <p>(2) Der Auftraggeber gibt ein verbindliches Angebot ab, indem er den Registrierungsprozess auf der Plattform abschließt oder einen Einladungsprozess annimmt und diese AGB akzeptiert.</p>
        <p>(3) Der Vertrag kommt mit Freischaltung des Zugangs oder technischer Bereitstellung zustande.</p>
      </LegalSection>

      <LegalSection title="§ 3 Leistungsbeschreibung">
        <p>(1) Der Anbieter stellt dem Auftraggeber die Plattform AWAY als SaaS für professionelles Urlaubsmanagement und Abwesenheitsplanung bereit.</p>
        <p>(2) Die Plattform umfasst insbesondere Urlaubsanträge, Genehmigungsprozesse, Team-Kalender, Feiertagsberechnungen und Rollenmanagement.</p>
      </LegalSection>

      <LegalSection title="§ 4 Nutzungsrechte">
        <p>(1) Der Anbieter räumt dem Auftraggeber ein einfaches, nicht übertragbares Recht ein, die Plattform während der Vertragslaufzeit bestimmungsgemäß zu nutzen.</p>
        <p>(2) Das Nutzungsrecht erfolgt über den Webbrowser oder PWA-Funktionalitäten. Der Quellcode wird nicht überlassen.</p>
      </LegalSection>

      <LegalSection title="§ 5 Pflichten">
        <p>(1) Der Auftraggeber verpflichtet sich, Zugangsdaten geheim zu halten und vor unbefugtem Zugriff zu schützen.</p>
        <p>(2) Die Nutzer verpflichten sich, die Plattform ausschließlich für geschäftliche Zwecke und im Einklang mitgeltenden Gesetzen zu nutzen.</p>
      </LegalSection>

      <LegalSection title="§ 6 Haftung">
        <p>(1) Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für vorsätzliche oder grob fahrlässige Pflichtverletzungen.</p>
        <p>(2) Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden beschränkt.</p>
      </LegalSection>

      <LegalSection title="§ 7 Datenschutz">
        <p>(1) Der Anbieter verarbeitet personenbezogene Daten im Einklang mit der DSGVO.</p>
        <p>(2) Einzelheiten ergeben sich aus der Datenschutzerklärung des Anbieters.</p>
      </LegalSection>

      <LegalSection title="§ 8 Schlussbestimmungen">
        <p>(1) Es gilt das Recht der Bundesrepublik Deutschland.</p>
        <p>(2) Gerichtsstand für Kaufleute ist Frankfurt am Main.</p>
        <p>(3) Sollten Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>Bei Fragen zu diesen AGB wenden Sie sich bitte an:</p>
        <div className="space-y-1 pt-1 opacity-80">
          <p className="font-bold">WAMOCON GmbH</p>
          <p>Mergenthalerallee 79 – 81, 65760 Eschborn</p>
          <p>Telefon: <a className="font-medium text-[var(--primary)] hover:underline" href="tel:+4961965838311">+49 6196 5838311</a></p>
          <p>E-Mail: <a className="font-medium text-[var(--primary)] hover:underline" href="mailto:info@wamocon.com">info@wamocon.com</a></p>
        </div>
      </LegalSection>
    </LegalPageShell>
  );
}
