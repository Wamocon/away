'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { joinOrganization, getCurrentOrganization } from '@/lib/organization';
import { Plane, CheckCircle, AlertCircle } from 'lucide-react';

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgId = searchParams.get('org');

  const [orgName, setOrgName] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!orgId) {
      setStatus('invalid');
      return;
    }
    getCurrentOrganization(orgId)
      .then((org) => {
        setOrgName(org?.name ?? orgId);
        setStatus('ready');
      })
      .catch(() => {
        setStatus('invalid');
      });
  }, [orgId]);

  const handleJoin = async () => {
    if (!orgId) return;
    setStatus('joining');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/auth/login?redirect=/invite?org=${orgId}`);
        return;
      }
      await joinOrganization(user.id, orgId);
      setStatus('success');
    } catch (err: any) {
      setMessage(err.message || 'Unbekannter Fehler');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#070b14' }}>
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center mx-auto mb-4">
            <Plane size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-white">
            <span className="text-blue-500">Away</span> Urlaubsplaner
          </h1>
          <p className="text-xs text-white/30 mt-1">Einladung</p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
          {status === 'loading' && (
            <p className="text-white/50 text-sm">Lade Einladung...</p>
          )}
          {status === 'invalid' && (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-red-400 text-sm font-medium">Ungültige oder abgelaufene Einladung.</p>
            </div>
          )}
          {status === 'ready' && (
            <div className="space-y-4">
              <div>
                <p className="text-white/50 text-xs mb-1">Du wurdest eingeladen, der Organisation beizutreten:</p>
                <p className="text-white font-bold text-lg">{orgName}</p>
              </div>
              <button
                onClick={handleJoin}
                className="w-full py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
              >
                Beitreten
              </button>
            </div>
          )}
          {status === 'joining' && (
            <p className="text-white/50 text-sm">Beitritt wird verarbeitet...</p>
          )}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle size={32} className="text-green-400" />
              <p className="text-green-400 text-sm font-semibold">Erfolgreich beigetreten!</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Zum Dashboard →
              </button>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-red-400 text-sm">{message}</p>
              <button onClick={() => setStatus('ready')} className="text-xs text-white/40 hover:text-white/70">
                Erneut versuchen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#070b14' }}><p className="text-white/40">Lade...</p></div>}>
      <InviteContent />
    </Suspense>
  );
}
