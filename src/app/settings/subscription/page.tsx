"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader,
  Mail,
} from "lucide-react";
import { useSubscription } from "@/components/ui/SubscriptionProvider";
import { useActiveOrg } from "@/components/ui/ActiveOrgProvider";
import { createClient } from "@/lib/supabase/client";
import { buildUpgradeMailtoLink, hasEmailProvider } from "@/lib/email";
import { getTrialDaysLeft } from "@/lib/subscription";
import { useToast } from "@/components/ui/ToastProvider";

const STATUS_LABELS: Record<string, string> = {
  trial: "Kostenloser Trial",
  active: "Aktiv",
  expired: "Abgelaufen",
  grace: "Nachfrist",
  pending_order: "Bestellung ausstehend",
};

const PLAN_FEATURES = {
  lite: [
    "Urlaubsanträge stellen & genehmigen",
    "In-App Kalender",
    "Bis zu 50 Benutzer",
    "Rollen: Mitarbeiter, Genehmiger, Admin",
    "Benutzereinstellungen",
    "DSGVO-Consent",
  ],
  pro: [
    "Alles aus Lite",
    "Kalender-Sync (Outlook / Google)",
    "E-Mail-Integration & Versand",
    "Dokumentvorlagen (PDF / DOCX)",
    "Reports & Analytics",
    "Organisations-Verwaltung (unbegrenzt)",
    "Unbegrenzte Benutzer",
    "Admin-Konsole: DSGVO-Panel",
    "Kalender-Einladungen (CalendarInvite)",
  ],
};

export default function SubscriptionPage() {
  const { subscription, loading, planTier } = useSubscription();
  const { currentOrgId } = useActiveOrg();
  const { showSuccess, showError } = useToast();
  const searchParams = useSearchParams();
  const isUpgradeRedirect = searchParams.get("upgrade") === "1";

  const [upgrading, setUpgrading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? "");
    });
  }, []);

  useEffect(() => {
    if (!currentOrgId) return;
    const supabase = createClient();
    supabase
      .from("organizations")
      .select("name")
      .eq("id", currentOrgId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setOrgName(data.name);
      });
  }, [currentOrgId]);

  const handleUpgradeRequest = async () => {
    if (!userId || !currentOrgId) return;
    setUpgrading(true);
    try {
      // 1. Status auf pending_order setzen
      const supabase = createClient();
      await supabase
        .from("subscriptions")
        .update({
          status: "pending_order",
          order_requested_at: new Date().toISOString(),
        })
        .eq("organization_id", currentOrgId);

      // 2. E-Mail senden – mit Provider oder Mailto-Fallback
      const hasProvider = await hasEmailProvider(userId, currentOrgId);
      if (hasProvider) {
        // API-Route für serverseitigen E-Mail-Versand
        const res = await fetch("/api/subscription/request-upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId: currentOrgId, orgName, userEmail }),
        });
        if (!res.ok) throw new Error("API-Fehler");
        showSuccess("Upgrade-Anfrage versendet! Wir melden uns bei dir.");
      } else {
        // Mailto-Fallback öffnen
        const link = buildUpgradeMailtoLink({
          orgName,
          planTier,
          userEmail,
        });
        window.location.href = link;
        showSuccess("E-Mail-Client wurde geöffnet. Bitte sende die vorbereitete E-Mail ab.");
      }
    } catch {
      showError("Fehler beim Senden der Upgrade-Anfrage. Bitte versuche es erneut.");
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size={24} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const status = subscription?.status ?? "trial";
  const trialEnd = subscription?.trial_end
    ? new Date(subscription.trial_end)
    : null;
  const graceEnd = subscription?.grace_end
    ? new Date(subscription.grace_end)
    : null;
  const daysLeft = getTrialDaysLeft(subscription);

  const isPendingOrder = status === "pending_order";
  const isExpiredOrGrace = status === "expired" || status === "grace";

  return (
    <div className="p-6 md:p-8 w-full animate-fade-in space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Zap size={22} className="text-[var(--primary)]" />
          Mein Abonnement
        </h1>
        <p className="text-sm mt-1 text-[var(--text-muted)]">
          Verwalte deinen Plan und Testzeitraum.
        </p>
      </div>

      {/* Upgrade-Hinweis wenn aus Feature-Gate weitergeleitet */}
      {isUpgradeRedirect && (
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <Star size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-400">Pro-Feature gesperrt</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Diese Funktion ist nur im Pro-Plan verfügbar. Upgrade auf Pro, um alle Funktionen freizuschalten.
            </p>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {planTier === "pro" ? (
                <Star size={16} className="text-amber-400" />
              ) : (
                <Zap size={16} className="text-[var(--primary)]" />
              )}
              <span className="text-lg font-black capitalize">
                {planTier === "pro" ? "Pro" : "Lite"} Plan
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  status === "active"
                    ? "bg-[var(--success)]/20 text-[var(--success)]"
                    : status === "trial" || status === "pending_order"
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : "bg-[var(--danger)]/20 text-[var(--danger)]"
                }`}
              >
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>

            {orgName && (
              <p className="text-sm text-[var(--text-muted)]">
                Organisation: <span className="font-semibold">{orgName}</span>
              </p>
            )}

            {status === "trial" && trialEnd && (
              <div className="flex items-center gap-1.5 text-sm">
                <Clock size={13} className="text-[var(--text-muted)]" />
                <span className="text-[var(--text-muted)]">
                  Trial endet am{" "}
                  <span className="font-semibold text-[var(--text-base)]">
                    {trialEnd.toLocaleDateString("de-DE")}
                  </span>
                  {daysLeft > 0 && (
                    <span className="ml-1 text-[var(--primary)] font-black">
                      ({daysLeft} Tage verbleibend)
                    </span>
                  )}
                </span>
              </div>
            )}

            {status === "grace" && graceEnd && (
              <div className="flex items-center gap-1.5 text-sm text-[var(--danger)]">
                <AlertTriangle size={13} />
                <span>
                  Nachfrist bis{" "}
                  <span className="font-semibold">
                    {graceEnd.toLocaleDateString("de-DE")}
                  </span>{" "}
                  – danach werden Daten gelöscht.
                </span>
              </div>
            )}

            {status === "expired" && (
              <div className="flex items-center gap-1.5 text-sm text-[var(--danger)]">
                <XCircle size={13} />
                <span>Zugang abgelaufen. Bitte upgraden.</span>
              </div>
            )}

            {isPendingOrder && (
              <div className="flex items-center gap-1.5 text-sm text-[var(--primary)]">
                <CheckCircle size={13} />
                <span>
                  Upgrade-Anfrage wurde übermittelt. Wir melden uns in Kürze.
                </span>
              </div>
            )}
          </div>

          {/* Upgrade Button */}
          {planTier === "lite" && !isPendingOrder && (
            <button
              onClick={handleUpgradeRequest}
              disabled={upgrading}
              className="shrink-0 flex items-center gap-2 rounded-xl bg-amber-500 text-black font-black text-sm px-6 py-3 hover:bg-amber-400 transition-colors disabled:opacity-60"
            >
              {upgrading ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Mail size={14} />
              )}
              {upgrading ? "Wird gesendet…" : "Auf Pro upgraden"}
            </button>
          )}
        </div>
      </div>

      {/* Expired / Grace Banner */}
      {isExpiredOrGrace && (
        <div className="rounded-xl p-4 bg-[var(--danger-light)] border border-[var(--danger)]/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[var(--danger)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-[var(--danger)]">
              {status === "grace" ? "Nachfrist läuft" : "Zugang gesperrt"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {status === "grace"
                ? "Dein Testzeitraum ist abgelaufen. Du hast noch Zugriff bis zur Nachfrist. Bitte upgrade auf einen kostenpflichtigen Plan, um den Datenverlust zu verhindern."
                : "Dein Zugang ist gesperrt. Bitte wende dich an deinen Administrator oder upgrade deinen Plan."}
            </p>
          </div>
        </div>
      )}

      {/* Plan Comparison */}
      <div className="grid md:grid-cols-2 gap-4">
        {(["lite", "pro"] as const).map((tier) => {
          const isCurrentPlan = planTier === tier;
          return (
            <div
              key={tier}
              className={`card p-5 space-y-3 ${
                isCurrentPlan
                  ? "border-[var(--primary)] border-2"
                  : "opacity-80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tier === "pro" ? (
                    <Star size={16} className="text-amber-400" />
                  ) : (
                    <Zap size={16} className="text-[var(--primary)]" />
                  )}
                  <span className="font-black capitalize">
                    {tier === "pro" ? "Pro" : "Lite"}
                  </span>
                </div>
                {isCurrentPlan && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
                    Aktuell
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {PLAN_FEATURES[tier].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-1.5 text-xs text-[var(--text-muted)]"
                  >
                    <CheckCircle
                      size={11}
                      className="shrink-0 mt-0.5 text-[var(--success)]"
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Support Info */}
      <p className="text-xs text-[var(--text-muted)] text-center">
        Fragen zu deinem Abonnement?{" "}
        <a
          href={`mailto:${process.env.NEXT_PUBLIC_UPGRADE_NOTIFY_EMAIL ?? "upgrade@away-app.de"}`}
          className="text-[var(--primary)] hover:underline"
        >
          Kontakt aufnehmen
        </a>
      </p>
    </div>
  );
}
