import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { BookOpen, FileText, Mail, MessageSquare, AlertTriangle, Phone, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const helpTopics = [
  {
    icon: BookOpen,
    title: 'Schnellstart',
    description: 'Erste Schritte mit AWAY – von der Registrierung bis zum ersten Urlaubsantrag.',
    steps: [
      'Einladung per E-Mail annehmen und Konto erstellen',
      'Organisation auswählen (oder neue erstellen)',
      'Unter "Anträge" → "Neuer Antrag" deinen ersten Urlaubsantrag stellen',
      'Status in der Antragsübersicht verfolgen',
    ],
  },
  {
    icon: FileText,
    title: 'Antragstellung – Schritt für Schritt',
    description: 'Einfacher Antrag oder detaillierter Wizard-Antrag mit Dokument-Export.',
    steps: [
      'Seitenleiste → "Anträge" öffnen',
      '"Neuer Antrag" wählen',
      'Urlaubstyp, Zeitraum und Grund angeben',
      'Optional: Wizard-Modus für PDF/Word-Export und digitale Signatur',
      'Antrag absenden – Genehmiger wird per E-Mail benachrichtigt',
    ],
  },
  {
    icon: Mail,
    title: 'E-Mail-Integration einrichten',
    description: 'Google- oder Microsoft-Konto verbinden, um E-Mails im eigenen Namen zu versenden.',
    steps: [
      'Einstellungen → E-Mail öffnen',
      '"Google verbinden" oder "Microsoft verbinden" klicken',
      'Im Browser-Popup den Zugriff erlauben',
      'Verbindung wird gespeichert – E-Mails werden ab sofort über dein Konto versendet',
    ],
  },
];

const troubleshooting = [
  {
    problem: 'Antrag wird nicht gesendet',
    solution: 'Prüfe ob ein E-Mail-Konto unter Einstellungen → E-Mail verbunden ist. Ohne E-Mail-Verbindung kann keine Benachrichtigung versendet werden.',
  },
  {
    problem: 'Feiertage werden falsch berechnet',
    solution: 'Das Bundesland für die Feiertagsberechnung wird unter Admin → Einstellungen → Organisation konfiguriert. Bitte deinen Administrator, das richtige Bundesland einzustellen.',
  },
  {
    problem: 'Kalender-Synchronisation schlägt fehl',
    solution: 'Entferne die bestehende Verbindung unter Einstellungen → E-Mail und verbinde das Konto erneut. Stelle sicher, dass du den Kalender-Zugriff beim OAuth-Popup erlaubst.',
  },
  {
    problem: 'Kein Zugriff auf Admin-Bereich',
    solution: 'Nur Nutzer mit der Rolle "Admin" können den Admin-Bereich aufrufen. Bitte deinen Organisationsadministrator, deine Rolle anzupassen.',
  },
  {
    problem: 'Login funktioniert nicht',
    solution: 'Versuche, das Passwort zurückzusetzen über "Passwort vergessen" auf der Login-Seite. Prüfe auch, ob die E-Mail-Adresse korrekt ist.',
  },
];

export default function HelpPage() {
  return (
    <LegalPageShell title="Hilfe & Support" updatedAt="April 2026">
      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
        <a
          href="mailto:support@wamocon.de"
          className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:border-[var(--primary)]"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Mail size={18} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>E-Mail Support</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>support@wamocon.de</p>
          </div>
          <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-subtle)' }} />
        </a>
        <Link
          href="/legal/faq"
          className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:border-[var(--primary)]"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <MessageSquare size={18} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>FAQ</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Häufige Fragen & Antworten</p>
          </div>
          <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-subtle)' }} />
        </Link>
      </div>

      {/* Step-by-step guides */}
      <div className="card p-6 mt-4">
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-base)' }}>
          Anleitungen
        </h2>
        <div className="space-y-6">
          {helpTopics.map((topic, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <topic.icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>{topic.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{topic.description}</p>
                </div>
              </div>
              <ol className="space-y-1.5 ml-2">
                {topic.steps.map((step, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span
                      className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                      style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                    >
                      {j + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="card p-6 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--text-base)' }}>Problemlösung</h2>
        </div>
        <div className="space-y-3">
          {troubleshooting.map((item, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-base)' }}>{item.problem}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.solution}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-2xl p-6 mt-4" style={{ background: 'var(--primary-light)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-start gap-3">
          <Phone size={18} style={{ color: 'var(--primary)' }} />
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-base)' }}>Kontakt</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              WAMOCON GmbH · E-Mail: support@wamocon.de<br />
              Geschäftszeiten: Mo–Fr, 09:00–17:00 Uhr (CET)
            </p>
          </div>
        </div>
      </div>
    </LegalPageShell>
  );
}
