'use client';
import { useState } from 'react';
import {
  X, RefreshCw, CheckCircle, ExternalLink, Calendar,
  AlertCircle, ChevronRight, Mail
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveOAuthSettings, getOAuthSettings, fetchExternalEvents, importCalendarEvents, ExternalCalendarEvent } from '@/lib/calendarSync';

interface CalendarSyncProps {
  orgId: string;
  userId: string;
  onClose: () => void;
  onSynced: () => void;
}

type Provider = 'outlook' | 'google';
type Step = 'choose' | 'connect' | 'select' | 'done';

export default function CalendarSync({ orgId, userId, onClose, onSynced }: CalendarSyncProps) {
  const [step, setStep] = useState<Step>('choose');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [importAll, setImportAll] = useState(true);
  const [events, setEvents] = useState<{ id: string; title: string; start: string; end: string; selected: boolean }[]>([]);

  const handleChooseProvider = (p: Provider) => {
    setProvider(p);
    setStep('connect');
  };

  const handleConnect = async () => {
    if (!email.trim()) { setError('Bitte E-Mail-Adresse eingeben'); return; }
    if (!token.trim()) { setError('Bitte Token / App-Passwort eingeben'); return; }
    setError('');
    setSyncing(true);

    try {
      // Save credentials securely in user_settings JSONB
      await saveOAuthSettings(userId, orgId, provider!, email, token);

      // Fetch events using refined library
      const fetchedEvents = await fetchExternalEvents(provider!, token);
      
      setEvents(fetchedEvents.map(ev => ({
        id: ev.id,
        title: ev.title,
        start: ev.start,
        end: ev.end,
        selected: true
      })));
      
      setConnected(true);
      setStep('select');
    } catch (err) {
      setError((err as Error).message || 'Verbindung fehlgeschlagen');
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = async () => {
    setSyncing(true);
    setError('');
    try {
      const toImport = importAll ? events : events.filter(e => e.selected);
      
      if (toImport.length === 0) {
        setError('Bitte mindestens einen Termin auswählen.');
        setSyncing(false);
        return;
      }

      await importCalendarEvents(toImport.map(ev => ({
        userId,
        orgId,
        provider: provider!,
        externalId: ev.id,
        title: ev.title,
        startDate: ev.start,
        endDate: ev.end,
        allDay: true // Standard for simplicity
      })));

      setStep('done');
      onSynced();
    } catch (err) {
      setError((err as Error).message || 'Import fehlgeschlagen');
    } finally {
      setSyncing(false);
    }
  };

  const toggleEvent = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md card p-6 animate-fade-in" style={{ zIndex: 51 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-base)' }}>
              Kalender synchronisieren
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Outlook oder Google Kalender verbinden
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-1 mb-6">
          {(['choose', 'connect', 'select', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`wizard-step-dot text-[11px] ${
                step === s ? 'active' : (['choose', 'connect', 'select', 'done'].indexOf(step) > i) ? 'done' : 'inactive'
              }`}>
                {['choose', 'connect', 'select', 'done'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 3 && <div className={`flex-1 h-px ${['choose', 'connect', 'select', 'done'].indexOf(step) > i ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />}
            </div>
          ))}
        </div>

        {/* Step: Choose Provider */}
        {step === 'choose' && (
          <div className="space-y-3">
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Wähle deinen Kalender-Anbieter:
            </p>
            <button
              onClick={() => handleChooseProvider('outlook')}
              className="oauth-btn w-full"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="4" fill="#0078d4"/>
                <text x="5" y="17" fontSize="14" fill="white" fontWeight="bold">O</text>
              </svg>
              <span>Mit Outlook verbinden</span>
              <ChevronRight size={14} className="ml-auto" />
            </button>
            <button
              onClick={() => handleChooseProvider('google')}
              className="oauth-btn w-full"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Mit Google verbinden</span>
              <ChevronRight size={14} className="ml-auto" />
            </button>

            <div className="p-3 rounded-xl mt-4 flex items-start gap-2" style={{ background: 'var(--primary-light)', borderLeft: '3px solid var(--primary)' }}>
              <AlertCircle size={14} style={{ color: 'var(--primary)' }} className="shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: 'var(--primary)' }}>
                Die Verbindung nutzt deine gespeicherten Zugangsdaten. Richten Sie OAuth in den App-Einstellungen ein.
              </p>
            </div>
          </div>
        )}

        {/* Step: Connect (enter credentials) */}
        {step === 'connect' && (
          <div className="space-y-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>
              {provider === 'outlook' ? '📧 Outlook' : '📅 Google'} verbinden
            </p>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                {provider === 'outlook' ? 'Microsoft-Konto E-Mail' : 'Google-Konto E-Mail'}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@firma.de"
                className="w-full px-3 py-2.5 rounded-lg border text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                {provider === 'outlook' ? 'Access Token (aus Azure App)' : 'OAuth Token (aus Google Console)'}
              </label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Token eingeben..."
                className="w-full px-3 py-2.5 rounded-lg border text-sm"
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-subtle)' }}>
                Token in Einstellungen → OAuth hinterlegen und hier eintragen
              </p>
            </div>
            {error && <div className="text-xs p-2.5 rounded-lg" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>{error}</div>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep('choose')} className="btn-secondary flex-1">Zurück</button>
              <button onClick={handleConnect} disabled={syncing} className="btn-primary flex-1">
                {syncing ? <RefreshCw size={13} className="animate-spin" /> : null}
                {syncing ? 'Verbinde...' : 'Verbinden'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Select Events */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} style={{ color: 'var(--success)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
                Verbunden! {events.length} Termine gefunden
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <input
                type="checkbox"
                id="importAll"
                checked={importAll}
                onChange={e => setImportAll(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="importAll" className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>
                Alle Termine importieren
              </label>
            </div>

            {!importAll && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                    <input
                      type="checkbox"
                      checked={ev.selected}
                      onChange={() => toggleEvent(ev.id)}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-base)' }}>{ev.title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {ev.start} {ev.start !== ev.end ? `– ${ev.end}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <div className="text-xs p-2.5 rounded-lg" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>{error}</div>}
            <div className="flex gap-2">
              <button onClick={() => setStep('connect')} className="btn-secondary flex-1">Zurück</button>
              <button onClick={handleImport} disabled={syncing} className="btn-primary flex-1">
                {syncing ? <RefreshCw size={13} className="animate-spin" /> : null}
                {syncing ? 'Importiere...' : 'Importieren'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--success-light)' }}>
              <CheckCircle size={32} style={{ color: 'var(--success)' }} />
            </div>
            <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-base)' }}>Synchronisiert!</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Deine Termine wurden erfolgreich importiert.
            </p>
            <button onClick={onClose} className="btn-primary">
              Kalender anzeigen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
