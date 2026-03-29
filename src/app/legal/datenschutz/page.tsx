import type { Metadata } from "next";
import React from 'react';
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: "Datenschutzerklärung | AWAY",
  description: "Datenschutzerklärung der AWAY App der WAMOCON GmbH.",
};

export default function DatenschutzPage() {
  return (
    <LegalPageShell title="Datenschutzerklärung" updatedAt="März 2026">
      <LegalSection title="1. Verantwortlicher">
        <p>Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) und anderer nationaler Datenschutzgesetze der Mitgliedstaaten sowie sonstiger datenschutzrechtlicher Bestimmungen ist:</p>
        <div className="space-y-1 pt-1">
          <p className="font-medium text-[var(--text-base)]">WAMOCON GmbH</p>
          <p>Mergenthalerallee 79 – 81</p>
          <p>65760 Eschborn</p>
          <p>Telefon: <a className="font-medium text-[var(--primary)] hover:underline" href="tel:+4961965838311">+49 6196 5838311</a></p>
          <p>E-Mail: <a className="font-medium text-[var(--primary)] hover:underline" href="mailto:info@wamocon.com">info@wamocon.com</a></p>
          <p>Projektkontakt: <a className="font-medium text-[var(--primary)] hover:underline" href="mailto:info@away-app.com">info@away-app.com</a></p>
          <p>Geschäftsführer: Dipl.-Ing. Waleri Moretz</p>
          <p>Handelsregister: Eschborn HRB 123666</p>
          <p>USt-ID: DE344930486</p>
        </div>
      </LegalSection>

      <LegalSection title="2. Überblick über die Datenverarbeitung">
        <p>Diese Datenschutzerklärung gilt für die Website und Webanwendung AWAY. AWAY ist eine digitale Plattform für professionelles Urlaubsmanagement, Abwesenheitsplanung und Teamkoordination.</p>
        <p>Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur Bereitstellung einer funktionsfähigen Plattform sowie unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung personenbezogener Daten erfolgt regelmäßig nur nach Einwilligung des Nutzers oder auf einer anderen gesetzlichen Grundlage.</p>
      </LegalSection>

      <LegalSection title="3. Rechtsgrundlagen der Verarbeitung">
        <p>Soweit wir für Verarbeitungsvorgänge personenbezogener Daten eine Einwilligung einholen, dient Art. 6 Abs. 1 lit. a DSGVO als Rechtsgrundlage.</p>
        <p>Bei der Verarbeitung personenbezogener Daten, die zur Erfüllung eines Vertrages oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist, dient Art. 6 Abs. 1 lit. b DSGVO als Rechtsgrundlage.</p>
        <p>Soweit eine Verarbeitung personenbezogener Daten zur Erfüllung einer rechtlichen Verpflichtung erforderlich ist, dient Art. 6 Abs. 1 lit. c DSGVO als Rechtsgrundlage.</p>
        <p>Ist die Verarbeitung zur Wahrung eines berechtigten Interesses unseres Unternehmens oder eines Dritten erforderlich und überwiegen die Interessen, Grundrechte und Grundfreiheiten des Betroffenen nicht, dient Art. 6 Abs. 1 lit. f DSGVO als Rechtsgrundlage.</p>
      </LegalSection>

      <LegalSection title="4. Hosting und Infrastruktur">
        <p>Unsere Plattform wird über moderne Cloud-Infrastruktur bereitgestellt. Wir nutzen folgende Dienste:</p>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-[var(--text-base)]">Vercel Inc.</p>
            <p>Die Website und Webanwendung werden über Vercel gehostet. Dabei verarbeitet Vercel technisch notwendige Verbindungsdaten wie IP-Adresse, Zeitstempel und Browserinformationen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text-base)]">Supabase Inc.</p>
            <p>Für Datenbank, Authentifizierung, Dateispeicher und Teile der Backend-Infrastruktur nutzen wir Supabase (bevorzugt in den Regionen der EU). Verarbeitet werden insbesondere Authentifizierungsdaten, Session-Informationen, Projektdaten sowie gespeicherte Medien. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text-base)]">Resend Inc.</p>
            <p>Für den Versand von Einladungs-E-Mails und Systembenachrichtigungen nutzen wir Resend. Verarbeitet werden dabei insbesondere E-Mail-Adresse, Organisationsbezug und der Nachrichteninhalt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="5. Registrierung und Authentifizierung">
        <p>Für die Nutzung von AWAY ist eine Registrierung erforderlich. Bei der Registrierung und Kontonutzung werden insbesondere folgende Daten verarbeitet:</p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--text-muted)]">
          <li>E-Mail-Adresse</li>
          <li>Vor- und Nachname</li>
          <li>Passwort in gehashter Form</li>
          <li>Rolle innerhalb einer Organisation (z. B. Admin, Manager, User)</li>
          <li>Session-Tokens und sicherheitsrelevante Authentifizierungsinformationen</li>
        </ul>
        <p>Die Authentifizierung erfolgt über Supabase Auth. Die Verarbeitung dient der Vertragserfüllung gemäß Art. 6 Abs. 1 lit. b DSGVO.</p>
      </LegalSection>

      <LegalSection title="6. Datenverarbeitung auf der Plattform">
        <p>Im Rahmen der Nutzung von AWAY werden insbesondere folgende Kategorien personenbezogener und organisationsbezogener Daten verarbeitet:</p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--text-muted)]">
          <li>Organisations- und Teamdaten</li>
          <li>Urlaubs- und Abwesenheitsdaten (Titel, Zeitraum, Grund, Status)</li>
          <li>Kalender-Synchronisationsdaten</li>
          <li>Kommentare, Statusänderungen und Genehmigungsverläufe</li>
          <li>Protokolldaten über Einladungen und Kontenverwaltung</li>
        </ul>
        <p>Diese Daten werden zur Durchführung des Vertrags, zur Teamkoordination und zur Dokumentation von Abwesenheiten verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
      </LegalSection>

      <LegalSection title="7. Cookies und lokale Speicherung">
        <p>AWAY verwendet technisch notwendige Cookies und ähnliche Technologien, soweit dies für Anmeldung, Sitzungsverwaltung, Sicherheit und den Betrieb der Plattform erforderlich ist.</p>
        <p>Zusätzlich nutzt die Plattform lokale Browser-Speichertechnologien wie localStorage und Gerätespeicher, um Spracheinstellungen und den Synchronisationszustand lokal zu speichern.</p>
        <p>Tracking-, Werbe- oder Analyse-Cookies werden derzeit nicht eingesetzt.</p>
      </LegalSection>

      <LegalSection title="8. Kontaktaufnahme">
        <p>Wenn Sie uns per E-Mail kontaktieren, werden die von Ihnen mitgeteilten Daten wie Name, E-Mail-Adresse und Nachrichteninhalt verarbeitet, um Ihre Anfrage zu bearbeiten und für Anschlussfragen bereitzuhalten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.</p>
      </LegalSection>

      <LegalSection title="9. SSL- bzw. TLS-Verschlüsselung">
        <p>Diese Webanwendung nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie an der sicheren Browserverbindung über https.</p>
      </LegalSection>

      <LegalSection title="10. Weitergabe von Daten an Dritte">
        <p>Eine Übermittlung Ihrer personenbezogenen Daten an Dritte findet grundsätzlich nur statt, wenn Sie Ihre ausdrückliche Einwilligung erteilt haben (Art. 6 Abs. 1 lit. a DSGVO), die Weitergabe zur Vertragserfüllung erforderlich ist (Art. 6 Abs. 1 lit. b DSGVO) oder eine rechtliche Verpflichtung besteht (Art. 6 Abs. 1 lit. c DSGVO).</p>
        <p>Im Rahmen der Auftragsverarbeitung setzen wir insbesondere Vercel, Supabase und Resend ein.</p>
      </LegalSection>

      <LegalSection title="11. Speicherdauer und Datenlöschung">
        <p>Personenbezogene Daten werden nur so lange gespeichert, wie dies für den jeweiligen Verarbeitungszweck erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen. Kontodaten werden mit Löschung des Benutzerkontos entfernt, sofern keine gesetzlichen Pflichten entgegenstehen.</p>
      </LegalSection>

      <LegalSection title="12. Rechte der betroffenen Personen">
        <p>Ihnen stehen als betroffene Person die Rechte auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie das Recht auf Widerspruch (Art. 21 DSGVO) und Widerruf einer Einwilligung (Art. 7 Abs. 3 DSGVO) zu.</p>
      </LegalSection>

      <LegalSection title="13. Beschwerderecht bei einer Aufsichtsbehörde">
        <p>Sie haben das Recht auf Beschwerde bei einer Aufsichtsbehörde, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen die DSGVO verstößt.</p>
        <div className="space-y-1 pt-1">
          <p className="font-medium text-[var(--text-base)]">Der Hessische Beauftragte für Datenschutz und Informationsfreiheit</p>
          <p>Gustav-Stresemann-Ring 1, 65189 Wiesbaden</p>
        </div>
      </LegalSection>

      <LegalSection title="14. Änderungen dieser Datenschutzerklärung">
        <p>Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie stets den aktuellen rechtlichen Anforderungen anzupassen. Für Ihren erneuten Besuch gilt dann die jeweils aktuelle Fassung.</p>
      </LegalSection>
    </LegalPageShell>
  );
}
