import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { HelpCircle, MessageCircle, Shield, Clock, Users, FileText, Mail } from 'lucide-react';

const faqs = [
  {
    category: 'Antragstellung',
    icon: FileText,
    items: [
      {
        q: 'Wie stelle ich einen Urlaubsantrag?',
        a: 'Gehe zu "Anträge" in der Seitenleiste und klicke auf "Neuer Antrag". Du kannst den einfachen Antrag oder den Wizard-Antrag (mit Dokumentenerstellung) verwenden. Gib Zeitraum und Grund ein – der Antrag geht automatisch an deinen Genehmiger.',
      },
      {
        q: 'Welche Urlaubsarten gibt es?',
        a: 'AWAY unterstützt: Erholungsurlaub (Standard), Sonderurlaub (z. B. Hochzeit, Todesfall), Überstundenausgleich und Homeoffice-Anträge – je nach Konfiguration deiner Organisation.',
      },
      {
        q: 'Kann ich einen Antrag zurückziehen?',
        a: 'Ausstehende Anträge können jederzeit zurückgezogen werden, solange sie noch nicht genehmigt wurden. Öffne den Antrag und klicke auf "Zurückziehen".',
      },
      {
        q: 'Werden Feiertage automatisch berechnet?',
        a: 'Ja. AWAY erkennt Feiertage für alle deutschen Bundesländer und schließt diese automatisch aus der Urlaubsberechnung aus.',
      },
    ],
  },
  {
    category: 'Genehmigung',
    icon: Shield,
    items: [
      {
        q: 'Wie genehmige ich einen Antrag?',
        a: 'Als Genehmiger siehst du ausstehende Anträge unter "Anträge" (mit Badge) in der Seitenleiste. Öffne einen Antrag und klicke auf "Genehmigen" oder "Ablehnen" – der Antragsteller wird automatisch per E-Mail informiert.',
      },
      {
        q: 'Erhalte ich eine Benachrichtigung bei neuen Anträgen?',
        a: 'Ja. Sobald ein Mitarbeiter einen Antrag stellt, erhältst du als Genehmiger eine E-Mail-Benachrichtigung. In der App zeigt die Seitenleiste zudem die Anzahl der ausstehenden Anträge als Badge.',
      },
    ],
  },
  {
    category: 'Konten & Rollen',
    icon: Users,
    items: [
      {
        q: 'Welche Rollen gibt es?',
        a: 'AWAY kennt vier Rollen: Mitarbeiter (stellt Anträge), Genehmiger (genehmigt Anträge), CIO (erweiterte Rechte + Berichte) und Admin (vollständige Verwaltung inkl. Benutzer und Einstellungen).',
      },
      {
        q: 'Wie werde ich zu einer Organisation eingeladen?',
        a: 'Dein Administrator sendet dir einen Einladungslink per E-Mail. Folge dem Link, erstelle dein Konto und du bist automatisch Teil der Organisation.',
      },
      {
        q: 'Kann ich Mitglied in mehreren Organisationen sein?',
        a: 'Ja. Über den Organisations-Switcher in der Seitenleiste kannst du zwischen mehreren Organisationen wechseln.',
      },
    ],
  },
  {
    category: 'E-Mail & Benachrichtigungen',
    icon: Mail,
    items: [
      {
        q: 'Wie verbinde ich mein E-Mail-Konto?',
        a: 'Gehe zu Einstellungen → E-Mail und verbinde deinen Google- oder Microsoft-Account. E-Mails werden dann in deinem Namen über deinen E-Mail-Anbieter versendet.',
      },
      {
        q: 'Welche E-Mails werden automatisch versendet?',
        a: 'AWAY versendet automatisch: Einladungs-E-Mails (Admin), Benachrichtigungen bei neuen Anträgen (Genehmiger), Statusänderungen (Antragsteller genehmigtoder abgelehnt).',
      },
    ],
  },
  {
    category: 'Kalender',
    icon: Clock,
    items: [
      {
        q: 'Kann ich meinen Outlook- oder Google-Kalender synchronisieren?',
        a: 'Ja. Unter "Kalender" → "Kalender-Synchronisation" kannst du dein Google- oder Outlook-Konto verbinden. Genehmigte Urlaube werden dann als Termine in deinem Kalender eingetragen.',
      },
      {
        q: 'Wie sehe ich die Abwesenheiten meines Teams?',
        a: 'Im Kalender werden alle genehmigten Abwesenheiten der gesamten Organisation angezeigt (sofern du die entsprechenden Rechte hast).',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <LegalPageShell title="FAQ – Häufige Fragen" updatedAt="April 2026">
      <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl" style={{ background: 'var(--primary-light)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <HelpCircle size={20} style={{ color: 'var(--primary)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Du findest keine Antwort? Kontaktiere uns unter{' '}
          <a href="mailto:support@wamocon.de" className="font-bold underline" style={{ color: 'var(--primary)' }}>
            support@wamocon.de
          </a>
        </p>
      </div>

      {faqs.map((section) => (
        <div key={section.category} className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <section.icon size={18} />
            </div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-base)' }}>{section.category}</h2>
          </div>
          <div className="space-y-4">
            {section.items.map((item, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)' }}>
                <div className="flex items-start gap-2 mb-2">
                  <MessageCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>{item.q}</p>
                </div>
                <p className="text-sm pl-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </LegalPageShell>
  );
}
