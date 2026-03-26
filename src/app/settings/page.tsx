'use client';
import { useState, useEffect } from 'react';
import { Settings, User, ShieldCheck, Loader, CheckCircle, Plane } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveUserSettings, getUserSettings } from '@/lib/userSettings';
import OrganizationSwitcher from '@/components/OrganizationSwitcher';

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orgId, setOrgId] = useState<string>('');
  const [schema] = useState(process.env.NEXT_PUBLIC_SCHEMA || 'away-dev');
  const [env, setEnv] = useState('Entwicklung');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      const email = data.user?.email;
      if (!uid) return;
      setUserId(uid);
      setUserEmail(email ?? '');

      // Settings für die aktive Org laden
      if (orgId) {
        getUserSettings(uid, orgId).then(s => {
          if (s?.email) setEmailInput(s.email);
          else setEmailInput(''); // Reset wenn keine Settings für diese Org
        }).catch(() => {});
      }
    }).catch(() => {});

    if (schema === 'away-prod') setEnv('Produktion');
    else if (schema === 'away-test') setEnv('Test');
    else setEnv('Entwicklung (lokal)');
  }, [schema, userId, orgId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      if (!orgId) return;
      await saveUserSettings(userId, orgId, emailInput);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white text-gray-900 flex items-center gap-2">
          <Settings size={22} className="text-blue-500" /> Einstellungen
        </h1>
        <p className="text-sm dark:text-white/40 text-gray-500 mt-1">Benutzer- und App-Einstellungen</p>
      </div>

      {/* Organization Switcher */}
      {userId && (
        <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <OrganizationSwitcher 
            userId={userId} 
            onOrgChange={(id, r) => {
              setOrgId(id);
              setIsAdmin(r === 'admin');
            }} 
          />
        </section>
      )}

      {/* User profile */}
      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-2 mb-4">
          <User size={14} className="text-blue-500" />
          <h2 className="text-xs font-bold uppercase tracking-widest dark:text-white/40 text-gray-400">Benutzerprofil</h2>
        </div>
        <div className="mb-4 flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm uppercase">
            {userEmail.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium dark:text-white text-gray-800">{userEmail}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isAdmin
                ? <><ShieldCheck size={10} className="text-green-500" /><span className="text-[10px] text-green-500 font-semibold">Admin</span></>
                : <><User size={10} className="text-blue-400" /><span className="text-[10px] text-blue-400 font-semibold">Mitarbeiter</span></>
              }
            </div>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-semibold dark:text-white/50 text-gray-500 block mb-1">Benachrichtigungs-E-Mail</label>
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="name@firma.de"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--text-base)' }}
            />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {saving ? <Loader size={12} className="animate-spin" /> : saved ? <CheckCircle size={12} /> : null}
            {saved ? 'Gespeichert!' : 'Speichern'}
          </button>
        </form>
      </section>

      {/* App info */}
      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Plane size={14} className="text-blue-500" />
          <h2 className="text-xs font-bold uppercase tracking-widest dark:text-white/40 text-gray-400">App-Informationen</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="dark:text-white/40 text-gray-400">Version</span>
            <span className="dark:text-white text-gray-800 font-mono">0.1.0</span>
          </div>
          <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="dark:text-white/40 text-gray-400">Umgebung</span>
            <span className="dark:text-white text-gray-800">{env}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="dark:text-white/40 text-gray-400">Schema</span>
            <span className="dark:text-white text-gray-800 font-mono text-xs bg-blue-500/10 px-2 py-0.5 rounded">{schema}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
