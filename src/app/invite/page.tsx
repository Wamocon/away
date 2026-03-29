'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { joinOrganization, getCurrentOrganization } from '@/lib/organization';
import { Plane, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { saveLegalConsent } from '@/lib/legal';
import Link from 'next/link';

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgId = searchParams.get('org');

  const [orgName, setOrgName] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  
  // Compliance State
  const [agb, setAgb] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [dsgvo, setDsgvo] = useState(false);

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
    if (!orgId || !agb || !privacy || !dsgvo) return;
    setStatus('joining');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?redirect=/invite?org=${orgId}`);
        return;
      }
      
      // 1. Join Organization
      await joinOrganization(user.id, orgId);
      
      // 2. Save Legal Consent
      await saveLegalConsent(user.id, ['agb', 'privacy', 'dsgvo'], '1.0');
      
      setStatus('success');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setStatus('error');
    }
  };

  const allAccepted = agb && privacy && dsgvo;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
            <Plane size={30} className="text-white transform -rotate-12" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Away <span className="text-blue-500">Urlaubsplaner</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/20 mt-2">Einladung annehmen</p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          {status === 'loading' && (
            <div className="py-12 flex flex-col items-center gap-4 text-white/30 italic text-sm">
              <div className="w-5 h-5 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
              Lade Einladungsdetails...
            </div>
          )}
          
          {status === 'invalid' && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertCircle size={28} />
              </div>
              <div>
                <p className="text-white font-bold">Einladung ungültig</p>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">Der Link ist leider abgelaufen oder die Organisation existiert nicht mehr.</p>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-white/40 text-xs mb-2">Beitrittsanfrage für:</p>
                <p className="text-white font-black text-2xl tracking-tight">{orgName}</p>
              </div>

              <div className="h-px bg-white/5 mx-[-2rem]" />

              <div className="space-y-4 pt-2">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={agb} 
                    onChange={e => setAgb(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-950" 
                  />
                  <span className="text-xs text-white/60 group-hover:text-white transition-colors">
                    Ich akzeptiere die <Link href="/legal/agb" className="text-blue-400 hover:underline font-semibold" target="_blank">Allgemeinen Geschäftsbedingungen</Link>.
                  </span>
                </label>

                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={privacy} 
                    onChange={e => setPrivacy(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-950" 
                  />
                  <span className="text-xs text-white/60 group-hover:text-white transition-colors">
                    Ich habe die <Link href="/legal/datenschutz" className="text-blue-400 hover:underline font-semibold" target="_blank">Datenschutzerklärung</Link> zur Kenntnis genommen.
                  </span>
                </label>

                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={dsgvo} 
                    onChange={e => setDsgvo(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-950" 
                  />
                  <span className="text-xs text-white/60 group-hover:text-white transition-colors">
                    Ich willige in die <span className="font-bold underline">DSGVO-konforme Datenverarbeitung</span> meiner Abwesenheitsdaten ein.
                  </span>
                </label>
              </div>

              <button
                onClick={handleJoin}
                disabled={!allAccepted}
                className={`w-full py-4 mt-2 rounded-2xl text-sm font-bold transition-all duration-300 ${
                  allAccepted 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 hover:-translate-y-0.5' 
                  : 'bg-white/10 text-white/20 cursor-not-allowed grayscale'
                }`}
              >
                Organisation beitreten
              </button>
            </div>
          )}

          {status === 'joining' && (
            <div className="py-12 flex flex-col items-center gap-4 text-white/50">
              <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm font-medium">Beitritt wird verarbeitet...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <CheckCircle size={40} />
              </div>
              <div className="space-y-2">
                <p className="text-white font-black text-xl tracking-tight">Willkommen im Team!</p>
                <p className="text-white/40 text-sm">Du bist jetzt Mitglied von <span className="text-white font-bold">{orgName}</span>.</p>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-all"
              >
                Zum Dashboard wechseln →
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8 flex flex-col items-center gap-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertCircle size={32} />
              </div>
              <p className="text-red-400 text-sm font-medium max-w-[200px] leading-relaxed">{message}</p>
              <button onClick={() => setStatus('ready')} className="text-xs text-white/40 hover:text-white/60 font-bold border-b border-white/5 pb-1">
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
