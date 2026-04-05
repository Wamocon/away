"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSuperAdmin } from "@/lib/subscription";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Loader,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Zap,
  Star,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

interface OrgSubscription {
  orgId: string;
  orgName: string;
  subId: string;
  status: string;
  planName: string;
  trialEnd: string | null;
  graceEnd: string | null;
  orderRequestedAt: string | null;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  trial: <Clock size={13} className="text-[var(--primary)]" />,
  active: <CheckCircle size={13} className="text-[var(--success)]" />,
  pending_order: <AlertTriangle size={13} className="text-amber-400" />,
  grace: <AlertTriangle size={13} className="text-[var(--danger)]" />,
  expired: <XCircle size={13} className="text-[var(--danger)]" />,
};

export default function SuperAdminSubscriptionsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orgs, setOrgs] = useState<OrgSubscription[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.push("/auth/login"); return; }
      const admin = await isSuperAdmin(data.user.id);
      if (!admin) { router.push("/dashboard"); return; }
      setIsAdmin(true);
      await loadOrgs();
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          status,
          trial_end,
          grace_end,
          order_requested_at,
          organization_id,
          organizations:organization_id (id, name),
          plan:subscription_plans (name)
        `);

      if (error) throw error;

      const mapped: OrgSubscription[] = (data ?? []).map((row: Record<string, unknown>) => {
        const org = Array.isArray(row.organizations)
          ? row.organizations[0]
          : row.organizations as { id: string; name: string } | null;
        const plan = Array.isArray(row.plan)
          ? row.plan[0]
          : row.plan as { name: string } | null;
        return {
          orgId: org?.id ?? "",
          orgName: org?.name ?? "Unbekannt",
          subId: row.id as string,
          status: row.status as string,
          planName: plan?.name ?? "lite",
          trialEnd: row.trial_end as string | null,
          graceEnd: row.grace_end as string | null,
          orderRequestedAt: row.order_requested_at as string | null,
        };
      });
      setOrgs(mapped);
    } catch {
      showError("Fehler beim Laden der Subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  const activate = async (subId: string, plan: "lite" | "pro") => {
    setSaving(subId);
    try {
      const supabase = createClient();
      // Get plan id
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", plan)
        .maybeSingle();

      const { data: meData } = await supabase.auth.getUser();
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan_id: planData?.id,
          activated_by: meData.user?.id,
          grace_end: null,
          order_requested_at: null,
        })
        .eq("id", subId);

      showSuccess(`Plan auf ${plan} aktiviert.`);
      await loadOrgs();
    } catch {
      showError("Fehler beim Aktivieren.");
    } finally {
      setSaving(null);
    }
  };

  const extendTrial = async (subId: string) => {
    setSaving(subId);
    try {
      const supabase = createClient();
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 30);
      await supabase
        .from("subscriptions")
        .update({
          status: "trial",
          trial_end: newEnd.toISOString(),
          grace_end: null,
        })
        .eq("id", subId);
      showSuccess("Trial um 30 Tage verlängert.");
      await loadOrgs();
    } catch {
      showError("Fehler beim Verlängern.");
    } finally {
      setSaving(null);
    }
  };

  const suspend = async (subId: string) => {
    setSaving(subId);
    try {
      const supabase = createClient();
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", subId);
      showSuccess("Zugang gesperrt.");
      await loadOrgs();
    } catch {
      showError("Fehler beim Sperren.");
    } finally {
      setSaving(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="p-6 md:p-8 w-full animate-fade-in space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <ShieldCheck size={22} className="text-[var(--primary)]" />
          Super-Admin: Abonnements
        </h1>
        <p className="text-sm mt-1 text-[var(--text-muted)]">
          Verwalte alle Organisationen und deren Subscriptions.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader size={24} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-12">
              Keine Subscriptions gefunden.
            </p>
          )}
          {orgs.map((org) => (
            <div key={org.subId} className="card p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {org.planName === "pro" ? (
                    <Star size={14} className="text-amber-400" />
                  ) : (
                    <Zap size={14} className="text-[var(--primary)]" />
                  )}
                  <span className="font-black text-sm">{org.orgName}</span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                    {org.planName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  {STATUS_ICONS[org.status] ?? null}
                  <span>Status: <span className="font-semibold">{org.status}</span></span>
                  {org.trialEnd && (
                    <span>· Trial bis: {new Date(org.trialEnd).toLocaleDateString("de-DE")}</span>
                  )}
                  {org.orderRequestedAt && (
                    <span className="text-amber-400">· Bestellung: {new Date(org.orderRequestedAt).toLocaleDateString("de-DE")}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => activate(org.subId, "lite")}
                  disabled={saving === org.subId}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Lite aktiv
                </button>
                <button
                  onClick={() => activate(org.subId, "pro")}
                  disabled={saving === org.subId}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  Pro aktiv
                </button>
                <button
                  onClick={() => extendTrial(org.subId)}
                  disabled={saving === org.subId}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-base)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors disabled:opacity-50"
                >
                  +30d Trial
                </button>
                <button
                  onClick={() => suspend(org.subId)}
                  disabled={saving === org.subId}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[var(--danger-light)] text-[var(--danger)] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Sperren
                </button>
                {saving === org.subId && (
                  <Loader size={14} className="animate-spin text-[var(--text-muted)]" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
