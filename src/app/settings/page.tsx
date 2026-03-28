'use client';
import { useState, useEffect, useCallback } from 'react';
import { User, Loader, CheckCircle, Calendar, Info, LayoutGrid, List } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveUserSettings, getUserSettings } from '@/lib/userSettings';
import { getOAuthSettings, saveOAuthSettings } from '@/lib/calendarSync';
import { getOrganizationsForUser } from '@/lib/organization';
import { useViewMode } from '@/components/ui/ViewModeProvider';

interface UserSettingsData {
  email?: string;
  language?: string;
  dateFormat?: string;
  workDays?: number[];
}

export default function SettingsPage() {
  const { viewMode, setViewMode } = useViewMode();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  // New settings states
  const [language, setLanguage] = useState('de');
  const [dateFormat, setDateFormat] = useState('DD.MM.YYYY');
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]); // 1=Mo, 5=Fr
  
  // OAuth states
  const [outlookEmail, setOutlookEmail] = useState('');
  const [outlookToken, setOutlookToken] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleToken, setGoogleToken] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orgId, setOrgId] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      // Find the first organization for the user to store personal settings
      const orgs = await getOrganizationsForUser(userId);
      if (orgs && orgs.length > 0 && orgs[0]) {
        const currentOrgId = orgs[0].id;
        setOrgId(currentOrgId);

        // General settings
        const data = await getUserSettings(userId, currentOrgId);
        const settings = (data?.settings as UserSettingsData) || {};
        
        if (settings.email) setEmailInput(settings.email);
        if (settings.language) setLanguage(settings.language);
        if (settings.dateFormat) setDateFormat(settings.dateFormat);
        if (settings.workDays) setWorkDays(settings.workDays);

        // OAuth settings
        const outlook = await getOAuthSettings(userId, currentOrgId, 'outlook');
        if (outlook) {
          setOutlookEmail(outlook.email);
          setOutlookToken(outlook.token);
        }

        const google = await getOAuthSettings(userId, currentOrgId, 'google');
        if (google) {
          setGoogleEmail(google.email);
          setGoogleToken(google.token);
        }
      }
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      const email = data.user?.email;
      if (!uid) return;
      setUserId(uid);
      setUserEmail(email ?? '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (userId) loadData();
  }, [userId, loadData]);

  const toggleWorkDay = (day: number) => {
    setWorkDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const dayLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !orgId) return;
    setSaving(true);
    try {
      // Save all settings including the new ones
      await saveUserSettings(userId, orgId, emailInput, {
        language,
        dateFormat,
        workDays
      });
      
      // Save OAuth credentials if entered
      if (outlookEmail || outlookToken) {
        await saveOAuthSettings(userId, orgId, 'outlook', outlookEmail, outlookToken);
      }
      if (googleEmail || googleToken) {
        await saveOAuthSettings(userId, orgId, 'google', googleEmail, googleToken);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-4xl mx-auto animate-fade-in space-y-6 text-[var(--text-base)]">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <User size={22} className="text-[var(--primary)]" /> Profil-Einstellungen
        </h1>
        <p className="text-sm mt-1 text-[var(--text-muted)]">
          Dein persönliches Profil, Benachrichtigungen und Regionaleinstellungen
        </p>
      </div>

      {userId && (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* User profile */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Info size={16} className="text-[var(--primary)]" /> Mein Profil
            </h2>
            
            <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] flex items-center justify-center text-white font-black text-lg uppercase shadow-inner">
                {userEmail.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{userEmail}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-black">
                  Persönliches AWAY-Konto
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">Benachrichtigungs-E-Mail</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">Oberfläche (Listenmodus)</label>
                <div className="flex p-1 rounded-xl w-fit bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'list' 
                        ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-base)]'
                    }`}
                  >
                    <List size={14} /> Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-base)]'
                    }`}
                  >
                    <LayoutGrid size={14} /> Raster
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Region & Language */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">🌐</div>
              Sprache & Region
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">Bevorzugte Sprache</label>
                <select 
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                >
                  <option value="de">Deutsch (Standard)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">Datumsformat</label>
                <select 
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                >
                  <option value="DD.MM.YYYY">DD.MM.YYYY (Vorschau: 28.03.2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (Vorschau: 2026-03-28)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (Vorschau: 03/28/2026)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Individual Work Week */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Calendar size={16} className="text-[var(--primary)]" /> Persönliche Arbeitswoche
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Wähle deine regulären Arbeitstage aus. Diese werden bei der Urlaubsberechnung berücksichtigt.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 0].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkDay(day)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                    workDays.includes(day)
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-md'
                      : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-base)]'
                  }`}
                >
                  {dayLabels[day]}
                </button>
              ))}
            </div>
          </section>

          {/* Calendar Sync */}
          <section className="card p-5 space-y-4 shadow-sm opacity-90 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Calendar size={16} className="text-[var(--primary)]" /> Externe Kalender (Beta)
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Microsoft / Outlook */}
              <div className="space-y-4 p-5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-[#0078d4] text-white font-black text-xs">O</div>
                  Microsoft Outlook
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold mb-1 text-[var(--text-muted)] uppercase">Konto-E-Mail</label>
                    <input
                      type="email"
                      value={outlookEmail}
                      onChange={e => setOutlookEmail(e.target.value)}
                      placeholder="name@firma.de"
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[#0078d4] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1 text-[var(--text-muted)] uppercase">OAuth Key</label>
                    <input
                      type="password"
                      value={outlookToken}
                      onChange={e => setOutlookToken(e.target.value)}
                      placeholder="Secret Key"
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[#0078d4] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Google */}
              <div className="space-y-4 p-5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                   <div className="w-6 h-6 rounded flex items-center justify-center bg-white shadow-sm border border-[var(--border)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                   </div>
                   Google Calendar
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold mb-1 text-[var(--text-muted)] uppercase">Google-E-Mail</label>
                    <input
                      type="email"
                      value={googleEmail}
                      onChange={e => setGoogleEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[#4285F4] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1 text-[var(--text-muted)] uppercase">Client Secret</label>
                    <input
                      type="password"
                      value={googleToken}
                      onChange={e => setGoogleToken(e.target.value)}
                      placeholder="GCP Token"
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[#4285F4] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary min-w-[160px] justify-center shadow-lg transform active:scale-95 transition-all text-sm font-black tracking-tight py-3">
              {saving ? <Loader size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : null}
              {saved ? 'Profil gespeichert!' : 'Einstellungen sichern'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
