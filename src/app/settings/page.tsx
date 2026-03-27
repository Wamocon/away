'use client';
import { useState, useEffect, useCallback } from 'react';
import { Settings, User, ShieldCheck, Loader, CheckCircle, Calendar, Info, LayoutGrid, List } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveUserSettings, getUserSettings } from '@/lib/userSettings';
import { getOAuthSettings, saveOAuthSettings } from '@/lib/calendarSync';
import OrganizationSwitcher from '@/components/OrganizationSwitcher';
import { useViewMode } from '@/components/ui/ViewModeProvider';

export default function SettingsPage() {
  const { viewMode, setViewMode } = useViewMode();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  
  // OAuth states
  const [outlookEmail, setOutlookEmail] = useState('');
  const [outlookToken, setOutlookToken] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleToken, setGoogleToken] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orgId, setOrgId] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!userId || !orgId) return;
    try {
      // General settings
      const settings = await getUserSettings(userId, orgId);
      if (settings?.email) setEmailInput(settings.email);
      else setEmailInput('');

      // OAuth settings
      const outlook = await getOAuthSettings(userId, orgId, 'outlook');
      if (outlook) {
        setOutlookEmail(outlook.email);
        setOutlookToken(outlook.token);
      } else {
        setOutlookEmail('');
        setOutlookToken('');
      }

      const google = await getOAuthSettings(userId, orgId, 'google');
      if (google) {
        setGoogleEmail(google.email);
        setGoogleToken(google.token);
      } else {
        setGoogleEmail('');
        setGoogleToken('');
      }
    } catch { /* ignore */ }
  }, [userId, orgId]);

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
    if (orgId) loadData();
  }, [orgId, loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !orgId) return;
    setSaving(true);
    try {
      // Save notification email
      await saveUserSettings(userId, orgId, emailInput);
      
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
    <div className="p-6 md:p-8 w-full max-w-4xl mx-auto animate-fade-in space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
          <Settings size={22} style={{ color: 'var(--primary)' }} /> Einstellungen
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Benutzerprofil, Benachrichtigungen und Kalender-Integrationen
        </p>
      </div>

      {userId && (
        <section className="card p-5">
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-base)' }}>Organisation wählen</h2>
          <OrganizationSwitcher 
            userId={userId} 
            onOrgChange={(id, r) => {
              setOrgId(id);
              setIsAdmin(r === 'admin');
            }} 
          />
        </section>
      )}

      {orgId && (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* User profile */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
              <User size={16} style={{ color: 'var(--primary)' }} /> Profil & Benachrichtigungen
            </h2>
            
            <div className="mb-4 flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] flex items-center justify-center text-white font-bold text-sm uppercase">
                {userEmail.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>{userEmail}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isAdmin
                    ? <><ShieldCheck size={12} className="text-[var(--success)]" /><span className="text-[10px] text-[var(--success)] font-bold">Admin</span></>
                    : <><User size={12} className="text-[var(--primary)]" /><span className="text-[10px] text-[var(--primary)] font-bold">Mitarbeiter</span></>
                  }
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Benachrichtigungs-E-Mail (optional)</label>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="Alternative E-Mail für Benachrichtigungen"
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Darstellung</label>
              <div className="flex p-1 rounded-lg w-fit" style={{ background: 'var(--bg-elevated)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
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
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-base)]'
                  }`}
                >
                  <LayoutGrid size={14} /> Raster
                </button>
              </div>
            </div>
          </section>

          {/* Calendar Sync */}
          <section className="card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
                <Calendar size={16} style={{ color: 'var(--primary)' }} /> Kalender-Integration (OAuth)
              </h2>
            </div>
            
            <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: 'var(--info-light)' }}>
              <Info size={14} style={{ color: 'var(--info)' }} className="shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: 'var(--info)' }}>
                Hinterlege hier die Zugangsdaten für Microsoft Azure App oder Google Cloud Console, 
                um den Kalender-Sync in der App nutzen zu können.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Microsoft / Outlook */}
              <div className="space-y-3 p-4 border rounded-xl" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="4" fill="#0078d4"/>
                    <text x="5" y="17" fontSize="14" fill="white" fontWeight="bold">O</text>
                  </svg>
                  Microsoft / Outlook
                </h3>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Verbundenes Microsoft-Konto</label>
                  <input
                    type="email"
                    value={outlookEmail}
                    onChange={e => setOutlookEmail(e.target.value)}
                    placeholder="name@firma.de"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Access Token / Client Secret</label>
                  <input
                    type="password"
                    value={outlookToken}
                    onChange={e => setOutlookToken(e.target.value)}
                    placeholder="Token oder Secret aus Azure"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Google Workspace */}
              <div className="space-y-3 p-4 border rounded-xl" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google Google
                </h3>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Verbundenes Google-Konto</label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={e => setGoogleEmail(e.target.value)}
                    placeholder="name@firma.de"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>OAuth Token / Client Secret</label>
                  <input
                    type="password"
                    value={googleToken}
                    onChange={e => setGoogleToken(e.target.value)}
                    placeholder="Token oder Secret aus GCP Console"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary min-w-[140px] justify-center shadow-lg">
              {saving ? <Loader size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : null}
              {saved ? 'Gespeichert!' : 'Alle Änderungen speichern'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
