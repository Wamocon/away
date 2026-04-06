"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  Mail,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LegalConsentFields } from "@/components/legal/LegalConsentFields";
import {
  type LegalConsentState,
  hasAcceptedAllLegalConsents,
  createLegalConsentMetadata,
} from "@/lib/legal/consent";
import { LegalLinks } from "@/components/legal/LegalLinks";
import { DevelopedInGermanyBadge } from "@/components/legal/DevelopedInGermanyBadge";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<
    "microsoft" | "google" | null
  >(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const [legalConsent, setLegalConsent] = useState<LegalConsentState>({
    termsAccepted: false,
    privacyAccepted: false,
    dsgvoAccepted: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp && !hasAcceptedAllLegalConsents(legalConsent)) {
      setError(
        "Bitte akzeptiere die rechtlichen Bedingungen, um fortzufahren.",
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const result = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                ...createLegalConsentMetadata(legalConsent),
              },
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setError(result.error.message);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError(
        "Verbindung zu Supabase fehlgeschlagen. Bitte .env.local prüfen.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "microsoft" | "google") => {
    setOauthLoading(provider);
    setError("");
    try {
      const supabase = createClient();
      const supabaseProvider = provider === "microsoft" ? "azure" : "google";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider as Parameters<
          ReturnType<typeof createClient>["auth"]["signInWithOAuth"]
        >[0]["provider"],
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes:
            provider === "microsoft"
              ? "Calendars.Read offline_access"
              : "https://www.googleapis.com/auth/calendar.readonly",
        },
      });
      if (error) setError(error.message);
    } catch {
      setError(
        `${provider === "microsoft" ? "Microsoft" : "Google"} Login noch nicht konfiguriert. Credentials in Supabase-Einstellungen eintragen.`,
      );
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      {/* Left – branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-10 w-[420px] shrink-0"
        style={{
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Plane size={20} className="text-white" />
          </div>
          <div>
            <div className="text-white font-black text-lg">Away</div>
            <div className="text-white/40 text-[10px] uppercase tracking-widest">
              Urlaubsplaner
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-white leading-tight mb-4">
            Urlaub im Blick –<br />
            für dein ganzes Team
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Anträge stellen, genehmigen und den Überblick behalten. Alles an
            einem Ort.
          </p>
        </div>

        <div className="space-y-3">
          {[
            "📋 Urlaubsanträge mit Vorlage einreichen",
            "✅ Einfache Genehmigungs-Workflows",
            "📅 Kalender-Synchronisation mit Outlook & Google",
            "👥 Rollenbasierte Benutzerverwaltung",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 text-white/60 text-[13px]"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#818cf8] shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right – Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-sm py-12">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] flex items-center justify-center">
              <Plane size={18} className="text-white" />
            </div>
            <div
              className="font-black text-xl"
              style={{ color: "var(--text-base)" }}
            >
              <span style={{ color: "var(--primary)" }}>Away</span>
            </div>
          </div>

          <h1
            className="text-2xl font-black mb-1"
            style={{ color: "var(--text-base)" }}
          >
            {isSignUp ? "Konto erstellen" : "Willkommen zurück"}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            {isSignUp
              ? "Erstelle dein Away-Konto"
              : "Melde dich bei deinem Away-Konto an"}
          </p>

          {/* OAuth Buttons */}
          <div className="space-y-2.5 mb-6">
            <button
              onClick={() => handleOAuth("microsoft")}
              disabled={!!oauthLoading}
              className="oauth-btn"
            >
              {oauthLoading === "microsoft" ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="1" y="1" width="10" height="10" fill="#f25022" />
                  <rect x="13" y="1" width="10" height="10" fill="#7fba00" />
                  <rect x="1" y="13" width="10" height="10" fill="#00a4ef" />
                  <rect x="13" y="13" width="10" height="10" fill="#ffb900" />
                </svg>
              )}
              <span>Mit Microsoft Office anmelden</span>
            </button>

            <button
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
              className="oauth-btn"
            >
              {oauthLoading === "google" ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>Mit Google anmelden</span>
            </button>
          </div>

          {/* Divider */}
          <div className="divider mb-6">oder mit E-Mail</div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm bg-[var(--bg-elevated)] border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  placeholder="name@firma.de"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="mb-4">
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Passwort
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm bg-[var(--bg-elevated)] border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  placeholder="••••••••"
                  minLength={6}
                  required
                  autoComplete={isSignUp ? "new-password" : "off"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-[var(--text-muted)] hover:text-[var(--text-base)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="py-2">
                <LegalConsentFields
                  value={legalConsent}
                  onChange={setLegalConsent}
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl text-xs"
                style={{
                  background: "var(--danger-light)",
                  color: "var(--danger)",
                }}
              >
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (isSignUp && !hasAcceptedAllLegalConsents(legalConsent))
              }
              className="btn-primary w-full justify-center py-3 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? <Loader size={14} className="animate-spin" /> : null}
              {loading
                ? "Anmelden..."
                : isSignUp
                  ? "Konto erstellen"
                  : "Anmelden"}
            </button>
          </form>

          <div className="text-center mt-5">
            <button
              onClick={() => {
                setIsSignUp((s) => !s);
                setError("");
              }}
              className="text-xs hover:underline"
              style={{
                color: "var(--text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {isSignUp
                ? "Bereits ein Konto? Anmelden"
                : "Noch kein Konto? Registrieren"}
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
            <LegalLinks />
            <DevelopedInGermanyBadge />
          </div>
        </div>
      </div>
    </div>
  );
}
