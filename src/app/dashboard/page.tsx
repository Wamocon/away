'use client';
import OrganizationSwitcher from '@/components/OrganizationSwitcher';
import VacationRequestForm from '@/components/VacationRequestForm';
import TemplateUpload from '@/components/TemplateUpload';
import UserSettings from '@/components/UserSettings';
import { saveUserSettings, getUserSettings } from '@/lib/userSettings';
import EmailConnect from '@/components/EmailConnect';
import InviteUser from '@/components/InviteUser';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Mail, Building2, ClipboardList } from 'lucide-react';
import VacationList from '@/components/VacationList';

export default function Dashboard() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [orgId, setOrgId] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showEmailConnect, setShowEmailConnect] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user) {
          router.push('/auth/login');
        } else {
          setUser({ id: data.user.id, email: data.user.email ?? '' });
        }
      });
    } catch {
      router.push('/auth/login');
    }
  }, [router]);

  const handleSaveSettings = async (settings: { email: string }) => {
    if (!user || !orgId) return;
    await saveUserSettings(user.id, orgId, settings.email);
  };

  const handleEmailConnect = (provider: string) => {
    setEmailProvider(provider);
    setShowEmailConnect(false);
    setAccessToken('demo-access-token');
  };

  const handleOrgChange = useCallback((id: string, r: string) => {
    setOrgId(id);
    setRole(r);
  }, []);

  const fetchUserSettings = useCallback(async () => {
    if (user && orgId) {
      try {
        const data = await getUserSettings(user.id, orgId);
        if (data && data.email) {
          setUser(prev => prev ? { ...prev, email: data.email } : null);
        } else {
          const supabase = createClient();
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
            setUser(prev => prev ? { ...prev, email: authData.user?.email ?? '' } : null);
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    }
  }, [user, orgId]);

  useEffect(() => {
    fetchUserSettings();
  }, [fetchUserSettings]);

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="text-sm dark:text-white/40 text-gray-400">Lade...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white text-gray-900" data-testid="dashboard-title">
          Dashboard
        </h1>
        <p className="text-sm dark:text-white/40 text-gray-500 mt-1">
          Eingeloggt als <span className="font-mono">{user.email}</span>
        </p>
      </div>

      {/* Organisation & Rolle */}
      <div
        className="rounded-xl border p-5 mb-4"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={14} className="text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-widest dark:text-white/40 text-gray-500">
            Organisation
          </span>
        </div>
        <OrganizationSwitcher
          userId={user.id}
          onOrgChange={handleOrgChange}
        />
        {role === 'admin' && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-green-500/10 text-green-500">
            Admin
          </div>
        )}
        {role === 'user' && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-500">
            Mitarbeiter
          </div>
        )}
      </div>

      {/* Aktionen */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            showSettings
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
              : 'dark:border-white/10 border-black/10 dark:text-white/50 text-gray-500 dark:hover:text-white/70 hover:text-gray-700 dark:hover:bg-white/[0.05] hover:bg-black/[0.03]'
          }`}
        >
          <Settings size={12} />
          Einstellungen
        </button>
        <button
          onClick={() => setShowEmailConnect(s => !s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            showEmailConnect
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
              : 'dark:border-white/10 border-black/10 dark:text-white/50 text-gray-500 dark:hover:text-white/70 hover:text-gray-700 dark:hover:bg-white/[0.05] hover:bg-black/[0.03]'
          }`}
        >
          <Mail size={12} />
          E-Mail verbinden
        </button>
      </div>

      {showSettings && (
        <div className="rounded-xl border p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={14} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest dark:text-white/40 text-gray-500">Einstellungen</span>
          </div>
          <UserSettings email={user.email} onSave={handleSaveSettings} />
        </div>
      )}

      {showEmailConnect && (
        <div className="rounded-xl border p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Mail size={14} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest dark:text-white/40 text-gray-500">E-Mail verbinden</span>
          </div>
          <EmailConnect onConnect={handleEmailConnect} />
        </div>
      )}

      {emailProvider && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
          Verbunden mit: {emailProvider}
        </div>
      )}

      {/* Urlaubsantrag */}
      {orgId && (
        <div className="rounded-xl border p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <VacationRequestForm
            userId={user.id}
            organizationId={orgId}
            emailProvider={emailProvider || undefined}
            accessToken={accessToken || undefined}
          />
          {role === 'admin' && (
            <div className="mt-6 pt-5 border-t space-y-6" style={{ borderColor: 'var(--border)' }}>
              <TemplateUpload organizationId={orgId} />
              <InviteUser organizationId={orgId} />
            </div>
          )}
        </div>
      )}
      {/* Urlaubsanträge Liste */}
      {orgId && (
        <div className="rounded-xl border p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={14} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest dark:text-white/40 text-gray-500">
              {role === 'admin' ? 'Alle Urlaubsanträge' : 'Meine Anträge'}
            </span>
          </div>
          <VacationList organizationId={orgId} isAdmin={role === 'admin'} />
        </div>
      )}
    </div>
  );
}
