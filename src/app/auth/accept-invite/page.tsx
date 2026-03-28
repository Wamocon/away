'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plane, Eye, EyeOff, Loader, AlertCircle, Lock, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { completeInvitationAction } from '@/lib/actions/authActions';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org');
  const role = searchParams.get('role');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const checkingSessionRef = useRef(checkingSession);

  useEffect(() => {
    checkingSessionRef.current = checkingSession;
  }, [checkingSession]);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    console.log('AcceptInvite: Component mounted, checking session...');

    // Timeout-Fallback: Wenn nach 5 Sekunden keine Session da ist, Fehler anzeigen
    const timeout = setTimeout(() => {
      if (mounted && checkingSessionRef.current) {
        console.warn('AcceptInvite: Session detection timed out.');
        setCheckingSession(false);
        setError('Keine aktive Einladung gefunden. Bitte stelle sicher, dass du den Link aus der E-Mail geklickt hast.');
      }
    }, 5000);

    // Auf Auth-Status-Änderungen hören (wichtig für Hashes/Tokens in der URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth Event in AcceptInvite: ${event}`, session ? 'Session FOUND' : 'NO session');
      
      if (mounted && session) {
        setCheckingSession(false);
        setError(''); 
      }
    });

    // Manueller Check & Fallback für Hashes (falls Supabase-JS sie nicht automatisch pickt)
    const checkSessionManually = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (mounted && existingSession) {
        console.log('AcceptInvite: Existing session found via getSession');
        setCheckingSession(false);
        setError('');
        return;
      }

      // Fallback: Token manuell aus der URL extrahieren, falls vorhanden (Implicit Flow)
      if (typeof window !== 'undefined' && window.location.hash) {
        console.log('AcceptInvite: Hash found in URL, attempting manual extraction...');
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('AcceptInvite: Extracting tokens from hash manually...');
          const { data: { session: newSession }, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            console.error('AcceptInvite: Error manually setting session:', setSessionError);
          } else if (newSession && mounted) {
            console.log('AcceptInvite: Session manually restored from hash!');
            setCheckingSession(false);
            setError('');
          }
        }
      }
    };

    checkSessionManually();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    if (!orgId || !role) {
      setError('Fehlende Einladungsdaten (Organisation/Rolle).');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      
      // 1. Passwort setzen
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // 2. Rolle in DB setzen via Server Action
      const result = await completeInvitationAction(orgId, role);
      if (!result.success) throw new Error('Konnte Rolle nicht setzen.');

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <Loader className="animate-spin text-[var(--primary)]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left – branding panel (same as login for consistency) */}
      <div
        className="hidden lg:flex flex-col justify-between p-10 w-[420px] shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Plane size={20} className="text-white" />
          </div>
          <div>
            <div className="text-white font-black text-lg">Away</div>
            <div className="text-white/40 text-[10px] uppercase tracking-widest">Urlaubsplaner</div>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-white leading-tight mb-4">
            Fast geschafft!
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Du wurdest zu Away eingeladen. Setze jetzt dein Passwort, um dein Konto zu aktivieren.
          </p>
        </div>

        <div className="space-y-3">
           <div className="flex items-center gap-2 text-white/60 text-[13px]">
             <div className="w-1.5 h-1.5 rounded-full bg-[#818cf8] shrink-0" />
             Sichere Anmeldung mit eigenem Passwort
           </div>
           <div className="flex items-center gap-2 text-white/60 text-[13px]">
             <div className="w-1.5 h-1.5 rounded-full bg-[#818cf8] shrink-0" />
             Direkter Zugriff auf deinen Urlaubsplaner
           </div>
        </div>
      </div>

      {/* Right – Acceptance form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] flex items-center justify-center">
              <Plane size={18} className="text-white" />
            </div>
            <div className="font-black text-xl" style={{ color: 'var(--text-base)' }}>
              <span style={{ color: 'var(--primary)' }}>Away</span>
            </div>
          </div>

          <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-base)' }}>
            Registrierung abschließen
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Wähle ein Passwort für deinen Zugang.
          </p>

          {success ? (
            <div className="p-6 text-center animate-fade-in">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4" style={{ color: 'var(--success)' }}>
                <CheckCircle size={32} />
              </div>
              <h2 className="font-bold text-lg mb-2">Erfolgreich registriert!</h2>
              <p className="text-sm text-muted-foreground">Du wirst gleich zum Dashboard weitergeleitet...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Neues Passwort
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-0"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Passwort bestätigen
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!error && !password}
                className="btn-primary w-full justify-center py-3"
              >
                {loading ? <Loader size={14} className="animate-spin" /> : null}
                {loading ? 'Wird gespeichert...' : 'Passwort setzen & starten'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <Loader className="animate-spin text-[var(--primary)]" size={32} />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
