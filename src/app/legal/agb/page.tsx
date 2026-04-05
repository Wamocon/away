import type { Metadata } from "next";
import React from "react";
import {
  LegalPageShell,
  LegalSection,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "AGB | AWAY",
  description: "Allgemeine Geschäftsbedingungen der AWAY App der WAMOCON GmbH.",
};

export default function AgbPage() {
  return (
    <LegalPageShell
      title="Allgemeine Geschäftsbedingungen"
      updatedAt="März 2026"
    >
      <LegalSection title="§ 1 Geltungsbereich">
        <p>
          (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB“) der
          WAMOCON GmbH, Mergenthalerallee 79 – 81, 65760 Eschborn (nachfolgend
          „Anbieter“), gelten für alle Verträge über die Nutzung der
          Software-as-a-Service-Plattform AWAY (nachfolgend „Plattform“), die
          über die Website away-app.com bereitgestellt wird.
        </p>
        <p>
          (2) Die Plattform richtet sich an Unternehmen, Organisationen, Teams
          und sonstige gewerbliche Projektbeteiligte (nachfolgend
          „Auftraggeber“) sowie deren Benutzer (nachfolgend „Nutzer“). Es
          handelt sich um ein B2B-Angebot. Verbraucher im Sinne des § 13 BGB
          sind nicht Zielgruppe dieses Angebots.
        </p>
        <p>
          (3) Abweichende, entgegenstehende oder ergänzende AGB des
          Auftraggebers werden nicht Vertragsbestandteil, es sei denn, der
          Anbieter stimmt deren Geltung ausdrücklich schriftlich zu.
        </p>
        <p>
          (4) Die Plattform wird laufend weiterentwickelt. Soweit einzelne
          Funktionen im Rahmen einer Pilot-, Test- oder Einführungsphase
          bereitgestellt werden, behält sich der Anbieter vor, den
          Funktionsumfang in diesen Bereichen zu ändern, zu erweitern oder
          einzuschränken. Nutzer werden über wesentliche Änderungen angemessen
          informiert.
        </p>
      </LegalSection>

      <LegalSection title="§ 2 Vertragsschluss">
        <p>
          (1) Die Darstellung der Plattform und ihrer Funktionen auf der Website
          stellt kein verbindliches Angebot im Sinne des § 145 BGB dar, sondern
          eine Aufforderung zur Abgabe eines Angebots (invitatio ad offerendum).
        </p>
        <p>
          (2) Der Auftraggeber gibt ein verbindliches Angebot zum Abschluss
          eines Nutzungsvertrages ab, indem er den Registrierungsprozess auf der
          Plattform abschließt oder einen bereitgestellten Einladungs-
          beziehungsweise Freischaltungsprozess annimmt und diese AGB
          akzeptiert.
        </p>
        <p>
          (3) Der Vertrag kommt zustande, wenn der Anbieter das Angebot des
          Auftraggebers durch Freischaltung des Zugangs annimmt oder der Zugang
          technisch bereitgestellt wird.
        </p>
        <p>
          (4) Der Anbieter behält sich vor, Registrierungen oder Freischaltungen
          in begründeten Fällen abzulehnen, insbesondere bei erkennbar
          missbräuchlicher Nutzung oder unzutreffenden Angaben.
        </p>
      </LegalSection>

      <LegalSection title="§ 3 Leistungsbeschreibung">
        <p>
          (1) Der Anbieter stellt dem Auftraggeber die Plattform AWAY als
          Software-as-a-Service (SaaS) über das Internet zur Verfügung. Die
          Plattform ist eine digitale Lösung für professionelles
          Urlaubsmanagement, Abwesenheitsplanung und Teamkoordination.
        </p>
        <p>
          (2) Die Plattform umfasst insbesondere folgende Funktionsbereiche:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Erfassung und Verwaltung von Urlaubsanträgen und Abwesenheiten
          </li>
          <li>Genehmigungsprozesse und Statusverfolgung</li>
          <li>Team-Kalender und Abwesenheitsübersichten</li>
          <li>
            Organisations-, Team- und Benutzerverwaltung mit rollenbasierten
            Berechtigungen
          </li>
          <li>Kalender-Synchronisation mit externen Diensten</li>
          <li>
            Push-Benachrichtigungen und organisationsbezogene Einladungsprozesse
          </li>
        </ul>
        <p>
          (3) Der Anbieter ist berechtigt, die Plattform technisch
          weiterzuentwickeln und den Funktionsumfang zu erweitern. Wesentliche
          Einschränkungen bestehender Kernfunktionen werden dem Auftraggeber mit
          angemessener Frist mitgeteilt, soweit dies möglich ist.
        </p>
      </LegalSection>

      <LegalSection title="§ 4 Nutzungsrechte">
        <p>
          (1) Der Anbieter räumt dem Auftraggeber für die Dauer des
          Vertragsverhältnisses ein einfaches, nicht übertragbares und nicht
          unterlizenzierbares Recht ein, die Plattform im Rahmen dieser AGB
          vertragsgemäß zu nutzen.
        </p>
        <p>
          (2) Das Nutzungsrecht umfasst den Zugriff auf die Plattform über einen
          Webbrowser oder installierte PWA-Funktionalitäten. Ein Recht auf
          Überlassung des Quellcodes besteht nicht.
        </p>
        <p>
          (3) Der Auftraggeber darf die ihm zur Verfügung gestellten
          Zugangsdaten ausschließlich den von ihm benannten Nutzern zur
          Verfügung stellen. Eine unkontrollierte Weitergabe an Dritte ist
          unzulässig.
        </p>
        <p>
          (4) Alle Rechte an der Plattform, einschließlich der zugrundeliegenden
          Software, Datenbanken, Algorithmen und Benutzeroberflächengestaltung,
          verbleiben beim Anbieter. Vom Auftraggeber und seinen Nutzern
          eingestellte Inhalte verbleiben im Eigentum des Auftraggebers
          beziehungsweise des jeweils Berechtigten.
        </p>
      </LegalSection>

      <LegalSection title="§ 5 Pflichten des Auftraggebers und der Nutzer">
        <p>
          (1) Der Auftraggeber ist verpflichtet, Zugangsdaten geheim zu halten
          und vor dem Zugriff unbefugter Dritter zu schützen. Der Anbieter ist
          unverzüglich zu informieren, wenn Anhaltspunkte für einen Missbrauch
          vorliegen.
        </p>
        <p>(2) Die Nutzer verpflichten sich insbesondere:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            die Plattform ausschließlich für zulässige geschäftliche Zwecke zu
            nutzen,
          </li>
          <li>
            keine rechtswidrigen, beleidigenden, verleumderischen oder sonst
            unzulässigen Inhalte hochzuladen,
          </li>
          <li>
            keine automatisierten Zugriffe wie Bots, Scraper oder Crawler
            durchzuführen,
          </li>
          <li>
            keine Sicherheitsmechanismen der Plattform zu umgehen oder zu
            stören,
          </li>
          <li>
            nur solche Medien und Inhalte hochzuladen, an denen die
            erforderlichen Rechte bestehen.
          </li>
        </ul>
        <p>
          (3) Der Auftraggeber stellt den Anbieter von Ansprüchen Dritter frei,
          die auf einer rechtswidrigen Nutzung der Plattform durch den
          Auftraggeber oder dessen Nutzer beruhen.
        </p>
        <p>
          (4) Bei Verstoß gegen diese Pflichten ist der Anbieter berechtigt, den
          Zugang ganz oder teilweise zu sperren. Das Recht zur außerordentlichen
          Kündigung bleibt unberührt.
        </p>
      </LegalSection>

      <LegalSection title="§ 6 Vergütung und Zahlungsbedingungen">
        <p>
          (1) Die Vergütung richtet sich nach der jeweils individuell
          vereinbarten Leistungs- und Preisstruktur.
        </p>
        <p>
          (2) Soweit eine kostenlose Test-, Demo- oder Pilotphase vereinbart
          wurde, ist diese nur für den vereinbarten Zeitraum unentgeltlich. Nach
          Ablauf gelten die vereinbarten oder mitgeteilten Konditionen.
        </p>
        <p>
          (3) Alle Preise verstehen sich zuzüglich der jeweils geltenden
          gesetzlichen Umsatzsteuer.
        </p>
        <p>
          (4) Rechnungen sind innerhalb von vierzehn (14) Tagen nach Zugang ohne
          Abzug zur Zahlung fällig, sofern nicht abweichend vereinbart.
        </p>
      </LegalSection>

      <LegalSection title="§ 7 Gewährleistung und Mängelbeseitigung">
        <p>
          (1) Der Anbieter gewährleistet, dass die Plattform im Wesentlichen den
          in § 3 beschriebenen Funktionen entspricht.
        </p>
        <p>
          (2) Mängel hat der Auftraggeber unverzüglich nach Entdeckung unter
          möglichst genauer Beschreibung schriftlich oder per E-Mail an{" "}
          <a
            className="font-medium text-[var(--primary)] hover:underline"
            href="mailto:info@wamocon.com"
          >
            info@wamocon.com
          </a>{" "}
          zu melden.
        </p>
        <p>
          (3) Der Anbieter wird gemeldete Mängel in angemessener Frist beheben.
          Die Art der Nachbesserung, insbesondere Bugfix, Workaround oder
          Update, liegt im Ermessen des Anbieters.
        </p>
        <p>
          (4) Soweit einzelne Funktionen ausdrücklich als Test- oder
          Pilotfunktionen gekennzeichnet sind, kann es dort zu eingeschränkter
          Stabilität oder veränderten Abläufen kommen.
        </p>
      </LegalSection>

      <LegalSection title="§ 8 Haftung">
        <p>
          (1) Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung
          des Lebens, des Körpers oder der Gesundheit, die auf einer
          vorsätzlichen oder fahrlässigen Pflichtverletzung des Anbieters oder
          seiner gesetzlichen Vertreter oder Erfüllungsgehilfen beruhen.
        </p>
        <p>
          (2) Der Anbieter haftet unbeschränkt für sonstige Schäden, die auf
          vorsätzlichen oder grob fahrlässigen Pflichtverletzungen beruhen.
        </p>
        <p>
          (3) Bei leicht fahrlässiger Verletzung einer wesentlichen
          Vertragspflicht ist die Haftung auf den vertragstypischen,
          vorhersehbaren Schaden beschränkt. Wesentliche Vertragspflichten sind
          solche Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des
          Vertrages überhaupt erst ermöglicht und auf deren Einhaltung der
          Vertragspartner regelmäßig vertrauen darf.
        </p>
        <p>
          (4) Im Übrigen ist die Haftung für leicht fahrlässige
          Pflichtverletzungen ausgeschlossen.
        </p>
        <p>
          (5) Der Anbieter haftet nicht für die inhaltliche Richtigkeit von
          Benutzereingaben oder daraus abgeleiteten Auswertungen. Diese ersetzen
          keine fachliche Prüfung durch den Nutzer.
        </p>
        <p>(6) Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.</p>
      </LegalSection>

      <LegalSection title="§ 9 Datenschutz">
        <p>
          (1) Der Anbieter verarbeitet personenbezogene Daten des Auftraggebers
          und der Nutzer im Einklang mit den Bestimmungen der DSGVO, des BDSG
          und weiterer anwendbarer Datenschutzvorschriften.
        </p>
        <p>
          (2) Einzelheiten zur Datenverarbeitung ergeben sich aus der
          Datenschutzerklärung des Anbieters.
        </p>
        <p>
          (3) Soweit der Anbieter im Auftrag des Auftraggebers personenbezogene
          Daten verarbeitet, kann ein gesonderter Auftragsverarbeitungsvertrag
          gemäß Art. 28 DSGVO abgeschlossen werden.
        </p>
        <p>
          (4) Der Auftraggeber ist dafür verantwortlich, dass die Nutzung der
          Plattform durch seine Nutzer im Einklang mit den geltenden
          Datenschutzbestimmungen erfolgt und erforderliche Informationen oder
          Einwilligungen vorliegen.
        </p>
      </LegalSection>

      <LegalSection title="§ 10 Vertraulichkeit">
        <p>
          (1) Die Parteien verpflichten sich, alle im Rahmen des
          Vertragsverhältnisses erlangten vertraulichen Informationen der
          jeweils anderen Partei vertraulich zu behandeln und nicht ohne
          vorherige Zustimmung an Dritte weiterzugeben.
        </p>
        <p>
          (2) Vom Auftraggeber hochgeladene Organisationsdaten, Dokumentationen
          und sonstige vertrauliche Inhalte werden ausschließlich für die
          vertragliche Leistungserbringung verwendet.
        </p>
        <p>
          (3) Die Vertraulichkeitspflicht gilt über die Beendigung des
          Vertragsverhältnisses hinaus für einen Zeitraum von zwei (2) Jahren,
          soweit keine weitergehenden gesetzlichen Pflichten bestehen.
        </p>
      </LegalSection>

      <LegalSection title="§ 11 Vertragslaufzeit und Kündigung">
        <p>
          (1) Der Vertrag über die Nutzung der Plattform wird auf unbestimmte
          Zeit geschlossen, sofern nicht individuell eine feste Laufzeit
          vereinbart wird.
        </p>
        <p>
          (2) Soweit eine Test- oder Pilotphase vereinbart ist, kann diese von
          beiden Parteien mit der jeweils vereinbarten Frist ordentlich beendet
          werden.
        </p>
        <p>
          (3) Nach Ablauf einer etwaigen Test- oder Pilotphase richtet sich die
          ordentliche Kündigung nach der individuellen Vereinbarung oder, sofern
          keine besondere Vereinbarung besteht, mit einer Frist von drei (3)
          Monaten zum Ende eines Kalenderquartals.
        </p>
        <p>
          (4) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund
          bleibt unberührt. Ein wichtiger Grund liegt insbesondere vor, wenn
          wesentliche Vertragspflichten trotz schriftlicher Abmahnung nicht
          erfüllt werden, ein Nutzer die Plattform rechtswidrig nutzt oder über
          das Vermögen einer Partei ein Insolvenzverfahren eröffnet wird.
        </p>
        <p>
          (5) Nach Beendigung des Vertrages wird der Zugang zur Plattform
          gesperrt. Der Auftraggeber erhält für einen angemessenen Zeitraum die
          Möglichkeit, seine Daten zu exportieren, sofern keine
          entgegenstehenden gesetzlichen oder sicherheitsrelevanten Gründe
          vorliegen.
        </p>
      </LegalSection>

      <LegalSection title="§ 12 Änderungen dieser AGB">
        <p>
          (1) Der Anbieter ist berechtigt, diese AGB mit Wirkung für die Zukunft
          zu ändern, sofern dies unter Berücksichtigung der Interessen des
          Anbieters für den Auftraggeber zumutbar ist.
        </p>
        <p>
          (2) Der Anbieter wird den Auftraggeber über Änderungen in Textform
          informieren. Der Auftraggeber kann den Änderungen innerhalb einer
          angemessenen Frist widersprechen. Widerspricht der Auftraggeber nicht
          fristgerecht, gelten die geänderten AGB als genehmigt, sofern hierauf
          bei Mitteilung ausdrücklich hingewiesen wurde.
        </p>
        <p>
          (3) Widerspricht der Auftraggeber der Änderung, besteht der Vertrag zu
          den bisherigen Bedingungen fort. Der Anbieter behält sich in diesem
          Fall das Recht zur ordentlichen Kündigung vor.
        </p>
      </LegalSection>

      <LegalSection title="§ 13 Schlussbestimmungen">
        <p>
          (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss
          des UN-Kaufrechts (CISG).
        </p>
        <p>
          (2) Sofern der Auftraggeber Kaufmann im Sinne des Handelsgesetzbuches,
          eine juristische Person des öffentlichen Rechts oder ein
          öffentlich-rechtliches Sondervermögen ist, ist ausschließlicher
          Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit
          diesem Vertrag Frankfurt am Main.
        </p>
        <p>
          (3) Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder
          werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
          Anstelle der unwirksamen Bestimmung gilt eine wirksame Bestimmung als
          vereinbart, die dem wirtschaftlichen Zweck am nächsten kommt.
        </p>
        <p>
          (4) Mündliche Nebenabreden bestehen nicht. Änderungen und Ergänzungen
          dieses Vertrages bedürfen der Textform, soweit gesetzlich zulässig.
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          Bei Fragen zu diesen Allgemeinen Geschäftsbedingungen wenden Sie sich
          bitte an:
        </p>
        <div className="space-y-1 pt-1 text-sm sm:text-base">
          <p className="font-medium text-[var(--text-base)]">WAMOCON GmbH</p>
          <p>Mergenthalerallee 79 – 81, 65760 Eschborn</p>
          <p>
            Telefon:{" "}
            <a
              className="font-medium text-[var(--primary)] hover:underline"
              href="tel:+4961965838311"
            >
              +49 6196 5838311
            </a>
          </p>
          <p>
            E-Mail:{" "}
            <a
              className="font-medium text-[var(--primary)] hover:underline"
              href="mailto:info@wamocon.com"
            >
              info@wamocon.com
            </a>
          </p>
        </div>
      </LegalSection>
    </LegalPageShell>
  );
}
