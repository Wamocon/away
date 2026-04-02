'use client';
import { useState } from 'react';
import {
  X, RefreshCw, CheckCircle,
  AlertCircle, ChevronRight
} from 'lucide-react';

import { saveOAuthSettings, getOAuthSettings, fetchExternalEvents, importCalendarEvents } from '@/lib/calendarSync';

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
  const [importAll, setImportAll] = useState(true);
  const [events, setEvents] = useState<{ id: string; title: string; start: string; end: string; selected: boolean }[]>([]);

  const handleChooseProvider = (p: Provider) => {
    setProvider(p);
    setStep('connect');
    // Load existing settings if available
    getOAuthSettings(userId, orgId, p).then(settings => {
      if (settings) {
        setEmail(settings.email || '');
        setToken(settings.token || '');
      }
    });
  };

  const handleConnect = async () => {
    if (!userId || userId.length < 32 || !orgId || orgId.length < 32) {
      setError('Sitzungs- oder Organisationsdaten fehlen. Bitte laden Sie die Seite neu.');
      return;
    }
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md card-glass p-8 animate-fade-in overflow-hidden" style={{ zIndex: 51 }}>
        {/* Glow effect in background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--primary)] opacity-10 blur-[80px] pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 relative">
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-base)' }}>
              Kalender verbinden
            </h2>
            <p className="text-[10px] uppercase tracking-widest mt-1 font-bold" style={{ color: 'var(--text-muted)' }}>
              Outlook & Google Sync
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)]">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-8 px-2 relative">
          {(['choose', 'connect', 'select', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`wizard-step-dot !w-7 !h-7 !text-[10px] ${
                step === s ? 'active' : (['choose', 'connect', 'select', 'done'].indexOf(step) > i) ? 'done' : 'inactive'
              }`}>
                {['choose', 'connect', 'select', 'done'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 3 && <div className={`flex-1 h-[2px] rounded-full transition-all duration-500 ${['choose', 'connect', 'select', 'done'].indexOf(step) > i ? 'bg-[var(--success)] shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-[var(--border-subtle)]'}`} />}
            </div>
          ))}
        </div>

        {/* Step: Choose Provider */}
        {step === 'choose' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4 ml-1">Anbieter wählen</p>
            <button
              onClick={() => handleChooseProvider('outlook')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border-2 border-[var(--border-subtle)] hover:border-[#0078d4] hover:bg-[#0078d4]/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#0078d4]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M2.5 12L12 2L21.5 12L12 22L2.5 12Z" fill="#0078d4" fillOpacity="0.1" />
                  <path d="M12 2L2 12L12 22L12 2V2Z" fill="#0078d4" />
                  <path d="M12 2L22 12L12 22V2Z" fill="#0078d4" fillOpacity="0.8" />
                </svg>
              </div>
              <div className="text-left">
                <span className="block text-sm font-black">Outlook / Office 365</span>
                <span className="text-[10px] opacity-50">Microsoft Business & Personal</span>
              </div>
              <ChevronRight size={16} className="ml-auto opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
            
            <button
              onClick={() => handleChooseProvider('google')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border-2 border-[var(--border-subtle)] hover:border-[#4285F4] hover:bg-[#4285F4]/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#4285F4]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div className="text-left">
                <span className="block text-sm font-black">Google Calendar</span>
                <span className="text-[10px] opacity-50">Google Workspace & Gmail</span>
              </div>
              <ChevronRight size={16} className="ml-auto opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            <div className="p-4 rounded-2xl mt-6 flex items-start gap-3 bg-[var(--primary-light)] border border-[var(--primary-glow)]">
              <AlertCircle size={18} className="text-[var(--primary)] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-base)' }}>
                Die Verbindung erfolgt über einen <strong>sicheren Zugriffsschlüssel</strong>. 
                Diesen kannst du in deinen Account-Einstellungen unter "Sicherheit" generieren.
              </p>
            </div>
          </div>
        )}

        {/* Step: Connect */}
        {step === 'connect' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                {provider === 'outlook' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#0078d4"><path d="M2 12l10-10 10 10-10 10z"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/></svg>
                )}
              </div>
              <div>
                <p className="text-xs font-black" style={{ color: 'var(--text-base)' }}>
                  {provider === 'outlook' ? 'Microsoft Outlook' : 'Google Kalender'}
                </p>
                <p className="text-[10px] opacity-50">Verbindung herstellen</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">E-Mail Adresse</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="form-input-lux"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">OAuth Access Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Paste access token..."
                  className="form-input-lux"
                />
                <div className="mt-2 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <p className="text-[9px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    Wie bekommst du deinen Access Token?
                  </p>
                  {provider === 'outlook' ? (
                    <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
                      Öffne{' '}
                      <a href="https://developer.microsoft.com/en-us/graph/graph-explorer" target="_blank" rel="noopener noreferrer" className="underline text-[var(--primary)]">Graph Explorer</a>
                      {' '}→ Anmelden → „Access Token" kopieren. Token ist 60 Min. gültig.
                    </p>
                  ) : (
                    <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
                      Öffne{' '}
                      <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="underline text-[var(--primary)]">Google OAuth Playground</a>
                      {' '}→ calendar.readonly wählen → Token generieren und kopieren.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {error && <div className="text-[11px] font-bold p-3 rounded-xl animate-in shake-1" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
            
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('choose')} className="flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-[var(--border)] hover:bg-white/5 transition-all">Zurück</button>
              <button onClick={handleConnect} disabled={syncing} className="flex-[2] py-3 px-4 rounded-xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {syncing ? <RefreshCw size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                {syncing ? 'Verbinde...' : 'Verbinden'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Select Events */}
        {step === 'select' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-600">Verbindung steht!</p>
                <p className="text-[10px] opacity-60 text-emerald-600/80">{events.length} Termine geladen</p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setImportAll(!importAll)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${importAll ? 'bg-[var(--primary-light)] border-[var(--primary)]' : 'bg-white/5 border-[var(--border-subtle)]'}`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${importAll ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--text-subtle)]'}`}>
                  {importAll && <CheckCircle size={12} className="text-white" />}
                </div>
                <span className="text-sm font-black">Alle Termine importieren</span>
              </button>

              {!importAll && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {events.map(ev => (
                    <button 
                      key={ev.id} 
                      onClick={() => toggleEvent(ev.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${ev.selected ? 'bg-white/10 border-[var(--primary-glow)]' : 'bg-white/5 border-transparent opacity-60'}`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${ev.selected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--text-subtle)]'}`}>
                        {ev.selected && <CheckCircle size={10} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black truncate">{ev.title}</p>
                        <p className="text-[9px] opacity-50 font-medium">
                          {new Date(ev.start).toLocaleDateString('de-DE')} • {new Date(ev.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="text-[11px] font-bold p-3 rounded-xl" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>{error}</div>}
            
            <div className="flex gap-3">
              <button onClick={() => setStep('connect')} className="flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-[var(--border)] hover:bg-white/5 transition-all">Zurück</button>
              <button onClick={handleImport} disabled={syncing} className="flex-[2] py-3 px-4 rounded-xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {syncing ? 'Importiere...' : 'Synchronisieren'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-10 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-[28px] bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 rotate-6">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-black mb-2">Synchronisiert!</h3>
            <p className="text-sm font-medium opacity-60 mb-10 px-4">
              Deine Termine wurden erfolgreich importiert und stehen nun im Kalender zur Verfügung.
            </p>
            <button onClick={onClose} className="w-full py-4 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all">
              Kalender ansehen
            </button>
          </div>
        )}
      </div>
    </div>

  );
}
