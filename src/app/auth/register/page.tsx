"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  Mail,
  Lock,
  Building2,
  Zap,
  Star,
} from "lucide-react";
import { LegalConsentFields } from "@/components/legal/LegalConsentFields";
import {
  type LegalConsentState,
  hasAcceptedAllLegalConsents,
} from "@/lib/legal/consent";
import { LegalLinks } from "@/components/legal/LegalLinks";
import { DevelopedInGermanyBadge } from "@/components/legal/DevelopedInGermanyBadge";
import { registerAction } from "./actions";
import type { PlanTier } from "@/lib/subscription";
import Link from "next/link";

const PLAN_CARDS: {
  tier: PlanTier;
  label: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
  features: string[];
}[] = [
  {
    tier: "lite",
    label: "Lite",
    icon: Zap,
    color: "var(--primary)",
    features: [
      "Urlaubsanträge & Genehmigung",
      "In-App Kalender",
      "Bis zu 50 Benutzer",
      "Basisfunktionen",
    ],
  },
  {
    tier: "pro",
    label: "Pro",
    icon: Star,
    color: "#f59e0b",
    badge: "Vollversion",
    features: [
      "Alles aus Lite",
      "Kalender-Sync (Outlook / Google)",
      "E-Mail-Integration",
      "Reports & Dokumentvorlagen",
      "Multi-Organisations-Verwaltung",
      "Unbegrenzte Benutzer",
    ],
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("lite");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [legalConsent, setLegalConsent] = useState<LegalConsentState>({
    termsAccepted: false,
    privacyAccepted: false,
    dsgvoAccepted: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    if (!hasAcceptedAllLegalConsents(legalConsent)) {
      setError("Bitte alle rechtlichen Bedingungen akzeptieren.");
      return;
    }

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);
    formData.set("orgName", orgName);
    formData.set("plan", selectedPlan);
    formData.set("termsAccepted", String(legalConsent.termsAccepted));
    formData.set("privacyAccepted", String(legalConsent.privacyAccepted));
    formData.set("dsgvoAccepted", String(legalConsent.dsgvoAccepted));

    startTransition(async () => {
      const result = await registerAction(formData);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] flex items-center justify-center shadow-lg">
            <Plane size={20} className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-[var(--text-base)]">
            away
          </span>
        </div>

        <div className="card p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-black text-[var(--text-base)]">
              30 Tage kostenlos testen
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Kein Kreditkarte erforderlich – automatisch läuft der Trial ab.
            </p>
          </div>

          {/* Plan selection */}
          <div className="grid grid-cols-2 gap-3">
            {PLAN_CARDS.map((plan) => {
              const Icon = plan.icon;
              const isActive = selectedPlan === plan.tier;
              return (
                <button
                  key={plan.tier}
                  type="button"
                  onClick={() => setSelectedPlan(plan.tier)}
                  className={`relative rounded-xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 ${
                    isActive
                      ? "border-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <Icon
                    size={18}
                    style={{ color: isActive ? plan.color : undefined }}
                    className={isActive ? "" : "text-[var(--text-muted)]"}
                  />
                  <p
                    className={`mt-2 font-black text-sm ${
                      isActive ? "text-[var(--text-base)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {plan.label}
                  </p>
                  <ul className="mt-2 space-y-0.5">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="text-[10px] text-[var(--text-muted)] leading-snug"
                      >
                        · {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Org name */}
            <div>
              <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                Organisations-Name
              </label>
              <div className="relative">
                <Building2
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Meine Firma GmbH"
                  required
                  minLength={2}
                  className="w-full rounded-xl border px-4 py-3 pl-9 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="max@firma.de"
                  required
                  className="w-full rounded-xl border px-4 py-3 pl-9 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                Passwort
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  minLength={8}
                  className="w-full rounded-xl border px-4 py-3 pl-9 pr-10 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-base)] transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                Passwort bestätigen
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  required
                  className="w-full rounded-xl border px-4 py-3 pl-9 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
            </div>

            {/* Legal */}
            <LegalConsentFields
              value={legalConsent}
              onChange={setLegalConsent}
            />

            {/* Error */}
            {error && (
              <div className="rounded-xl p-3 bg-[var(--danger-light)] border border-[var(--danger)] text-[var(--danger)] text-sm flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-[var(--primary)] text-white font-black py-3 text-sm hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader size={15} className="animate-spin" />
                  Konto wird erstellt…
                </>
              ) : (
                `${selectedPlan === "pro" ? "Pro" : "Lite"} – 30 Tage kostenlos starten`
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)]">
            Bereits registriert?{" "}
            <Link
              href="/auth/login"
              className="text-[var(--primary)] hover:underline font-semibold"
            >
              Anmelden
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <DevelopedInGermanyBadge />
          <div className="mt-3">
            <LegalLinks />
          </div>
        </div>
      </div>
    </div>
  );
}
