'use client';
import { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveUserSettings, getUserSettings } from '@/lib/userSettings';
import OrganizationSwitcher from '@/components/OrganizationSwitcher';

type Provider = 'google' | 'microsoft' | null;

export default function EmailPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [connectedProvider, setConnectedProvider] = useState<Provider>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [orgId, setOrgId] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      
      if (orgId) {
        getUserSettings(data.user.id, orgId).then(settings => {
          if (settings?.email) {
            setEmailInput(settings.email);
          } else {
            setEmailInput('');
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [orgId]);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !orgId) return;
    setSaving(true);
    try {
      await saveUserSettings(userId, orgId, emailInput);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = (provider: Provider) => {
    // In production: trigger OAuth flow → store token in user_settings
    setConnectedProvider(provider);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white text-gray-900 flex items-center gap-2">
          <Mail size={22} className="text-blue-500" /> E-Mail Integration
        </h1>
        <p className="text-sm dark:text-white/40 text-gray-500 mt-1">
          Verbinde dein E-Mail-Postfach um Urlaubsanträge direkt zu versenden.
        </p>
      </div>

      {/* Organization Switcher */}
      {userId && (
        <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <OrganizationSwitcher 
            userId={userId} 
            onOrgChange={(id) => setOrgId(id)} 
          />
        </section>
      )}

      {/* Email address settings */}
      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <h2 className="text-xs font-bold uppercase tracking-widest dark:text-white/40 text-gray-400 mb-3">Benachrichtigungs-E-Mail</h2>
        <form onSubmit={handleSaveEmail} className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder="deine@email.de"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--text-base)' }}
            required
          />
          <button type="submit" disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
            {saving ? <Loader size={12} className="animate-spin" /> : saved ? <CheckCircle size={12} /> : null}
            {saved ? 'Gespeichert' : 'Speichern'}
          </button>
        </form>
      </section>

      {/* OAuth Provider connection */}
      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <h2 className="text-xs font-bold uppercase tracking-widest dark:text-white/40 text-gray-400 mb-4">Postfach verbinden</h2>
        <div className="space-y-3">
          {/* Google */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-lg">G</div>
              <div>
                <p className="text-sm font-medium dark:text-white text-gray-800">Google Gmail</p>
                <p className="text-xs dark:text-white/30 text-gray-400">OAuth2 über Gmail API</p>
              </div>
            </div>
            {connectedProvider === 'google'
              ? <div className="flex items-center gap-1.5 text-green-500 text-xs font-semibold"><CheckCircle size={14} /> Verbunden</div>
              : <button onClick={() => handleConnect('google')}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-medium transition">
                  Verbinden
                </button>
            }
          </div>

          {/* Microsoft */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-lg">M</div>
              <div>
                <p className="text-sm font-medium dark:text-white text-gray-800">Microsoft Outlook / 365</p>
                <p className="text-xs dark:text-white/30 text-gray-400">OAuth2 über Microsoft Graph API</p>
              </div>
            </div>
            {connectedProvider === 'microsoft'
              ? <div className="flex items-center gap-1.5 text-green-500 text-xs font-semibold"><CheckCircle size={14} /> Verbunden</div>
              : <button onClick={() => handleConnect('microsoft')}
                  className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg font-medium transition">
                  Verbinden
                </button>
            }
          </div>
        </div>

        {connectedProvider && (
          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-400 text-xs font-medium">
            <CheckCircle size={14} />
            {connectedProvider === 'google' ? 'Google Gmail' : 'Microsoft Outlook'} ist verbunden. Urlaubsanträge können jetzt per E-Mail versendet werden.
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <div className="flex items-start gap-2">
            <AlertCircle size={13} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs dark:text-white/40 text-gray-400">
              Für den produktiven Betrieb müssen in <strong>Azure AD</strong> bzw. <strong>Google Cloud Console</strong> OAuth-Apps registriert werden. 
              Die Redirect-URI lautet: <code className="text-blue-400">/api/oauth/callback</code>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
