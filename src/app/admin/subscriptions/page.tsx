"use client";
import { useEffect, useState, useMemo } from "react";
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
  Search,
  RefreshCw,
  Users,
  TrendingUp,
  Ban,
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
  createdAt: string;
}

type FilterStatus = "all" | "trial" | "active" | "pending_order" | "grace" | "expired";
type FilterPlan = "all" | "lite" | "pro";

const STATUS_LABEL: Record<string, string> = {
  trial:         "Trial",
  active:        "Aktiv",
  pending_order: "Bestellt",
  grace:         "Nachfrist",
  expired:       "Abgelaufen",
};

const STATUS_STYLE: Record<string, string> = {
  trial:         "bg-blue-500/10 text-blue-400 border-blue-500/20",
  active:        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending_order: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  grace:         "bg-orange-500/10 text-orange-400 border-orange-500/20",
  expired:       "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function SuperAdminSubscriptionsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orgs, setOrgs] = useState<OrgSubscription[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPlan, setFilterPlan] = useState<FilterPlan>("all");

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
          id, status, trial_end, grace_end, order_requested_at, created_at,
          organization_id,
          organizations:organization_id (id, name),
          plan:subscription_plans (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: OrgSubscription[] = (data ?? []).map((row: Record<string, unknown>) => {
        const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations as { id: string; name: string } | null;
        const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan as { name: string } | null;
        return {
          orgId:             org?.id ?? "",
          orgName:           org?.name ?? "Unbekannt",
          subId:             row.id as string,
          status:            row.status as string,
          planName:          plan?.name ?? "lite",
          trialEnd:          row.trial_end as string | null,
          graceEnd:          row.grace_end as string | null,
          orderRequestedAt:  row.order_requested_at as string | null,
          createdAt:         row.created_at as string,
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
      const { data: planData } = await supabase
        .from("subscription_plans").select("id").eq("name", plan).maybeSingle();
      const { data: me } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "active", plan_id: planData?.id, activated_by: me.user?.id, grace_end: null, order_requested_at: null })
        .eq("id", subId);
      if (error) throw error;
      showSuccess(`${plan === "pro" ? "Pro" : "Lite"} aktiviert.`);
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
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "trial", trial_end: newEnd.toISOString(), grace_end: null })
        .eq("id", subId);
      if (error) throw error;
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
      const { error } = await supabase
        .from("subscriptions").update({ status: "expired" }).eq("id", subId);
      if (error) throw error;
      showSuccess("Zugang gesperrt.");
      await loadOrgs();
    } catch {
      showError("Fehler beim Sperren.");
    } finally {
      setSaving(null);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:   orgs.length,
    active:  orgs.filter(o => o.status === "active").length,
    trial:   orgs.filter(o => o.status === "trial").length,
    expired: orgs.filter(o => o.status === "expired" || o.status === "grace").length,
    pro:     orgs.filter(o => o.planName === "pro").length,
    lite:    orgs.filter(o => o.planName === "lite").length,
    pending: orgs.filter(o => o.status === "pending_order").length,
  }), [orgs]);

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return orgs.filter(o => {
      const matchSearch = !search || o.orgName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || o.status === filterStatus;
      const matchPlan   = filterPlan === "all" || o.planName === filterPlan;
      return matchSearch && matchStatus && matchPlan;
    });
  }, [orgs, search, filterStatus, filterPlan]);

  if (!isAdmin) return null;

  return (
    <div className="p-6 md:p-8 w-full animate-fade-in space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <ShieldCheck size={22} className="text-[var(--primary)]" />
            Subscription-Verwaltung
          </h1>
          <p className="text-sm mt-1 text-[var(--text-muted)]">
            Super-Admin · Alle Organisationen und deren Abonnements
          </p>
        </div>
        <button
          onClick={loadOrgs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[var(--border)] hover:border-[var(--primary)] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Aktualisieren
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Gesamt",    value: stats.total,   icon: <Users size={15} />,       color: "text-[var(--primary)]" },
          { label: "Aktiv",     value: stats.active,  icon: <CheckCircle size={15} />, color: "text-emerald-400" },
          { label: "Trial",     value: stats.trial,   icon: <Clock size={15} />,        color: "text-blue-400" },
          { label: "Gesperrt",  value: stats.expired, icon: <Ban size={15} />,          color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={s.color}>{s.icon}</div>
            <div>
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Plan-Übersicht */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <Zap size={15} className="text-[var(--primary)]" />
          <div>
            <div className="text-xl font-black text-[var(--primary)]">{stats.lite}</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Lite</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Star size={15} className="text-amber-400" />
          <div>
            <div className="text-xl font-black text-amber-400">{stats.pro}</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Pro</div>
            {stats.pending > 0 && (
              <div className="text-[9px] text-amber-400 font-bold">{stats.pending} Upgrade-Anfrage{stats.pending > 1 ? "n" : ""}</div>
            )}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Organisation suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-transparent focus:border-[var(--primary)] outline-none transition-all"
          />
        </div>
        <select
          title="Status filtern"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          className="px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-card)] outline-none focus:border-[var(--primary)] transition-all"
        >
          <option value="all">Alle Status</option>
          <option value="trial">Trial</option>
          <option value="active">Aktiv</option>
          <option value="pending_order">Bestellt</option>
          <option value="grace">Nachfrist</option>
          <option value="expired">Abgelaufen</option>
        </select>
        <select
          title="Plan filtern"
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value as FilterPlan)}
          className="px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-card)] outline-none focus:border-[var(--primary)] transition-all"
        >
          <option value="all">Alle Pläne</option>
          <option value="lite">Lite</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader size={24} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-12">
          Keine Einträge gefunden.
        </p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Organisation", "Plan", "Status", "Trial-Ende", "Upgrade-Anfrage", "Aktionen"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((org, i) => (
                  <tr
                    key={org.subId}
                    className={`border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg-elevated)] ${
                      org.status === "pending_order" ? "bg-amber-500/5" :
                      org.status === "expired" || org.status === "grace" ? "bg-red-500/5" : ""
                    } ${i % 2 === 0 ? "" : "bg-[var(--bg-surface)]/30"}`}
                  >
                    {/* Org name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold">
                        {org.planName === "pro"
                          ? <Star size={13} className="text-amber-400 shrink-0" />
                          : <Zap size={13} className="text-[var(--primary)] shrink-0" />
                        }
                        {org.orgName}
                      </div>
                    </td>

                    {/* Plan toggle */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => activate(org.subId, "lite")}
                          disabled={saving === org.subId}
                          title="Auf Lite setzen"
                          className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all disabled:opacity-40 ${
                            org.planName === "lite" && org.status === "active"
                              ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                              : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                          }`}
                        >
                          Lite
                        </button>
                        <button
                          onClick={() => activate(org.subId, "pro")}
                          disabled={saving === org.subId}
                          title="Auf Pro setzen"
                          className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all disabled:opacity-40 ${
                            org.planName === "pro" && org.status === "active"
                              ? "bg-amber-500 text-black border-amber-500"
                              : "border-[var(--border)] text-[var(--text-muted)] hover:border-amber-500 hover:text-amber-400"
                          }`}
                        >
                          Pro
                        </button>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_STYLE[org.status] ?? ""}`}>
                        {org.status === "trial"         && <Clock size={10} />}
                        {org.status === "active"        && <CheckCircle size={10} />}
                        {org.status === "pending_order" && <TrendingUp size={10} />}
                        {org.status === "grace"         && <AlertTriangle size={10} />}
                        {org.status === "expired"       && <XCircle size={10} />}
                        {STATUS_LABEL[org.status] ?? org.status}
                      </span>
                    </td>

                    {/* Trial end */}
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {org.trialEnd
                        ? new Date(org.trialEnd).toLocaleDateString("de-DE")
                        : "—"}
                    </td>

                    {/* Order date */}
                    <td className="px-4 py-3 text-xs">
                      {org.orderRequestedAt ? (
                        <span className="text-amber-400 font-semibold">
                          {new Date(org.orderRequestedAt).toLocaleDateString("de-DE")}
                        </span>
                      ) : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => extendTrial(org.subId)}
                          disabled={saving === org.subId}
                          title="+30 Tage Trial"
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all disabled:opacity-40"
                        >
                          +30d
                        </button>
                        <button
                          onClick={() => suspend(org.subId)}
                          disabled={saving === org.subId || org.status === "expired"}
                          title="Zugang sperren"
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border border-[var(--border)] text-[var(--text-muted)] hover:border-red-500 hover:text-red-400 transition-all disabled:opacity-40"
                        >
                          Sperren
                        </button>
                        {saving === org.subId && (
                          <Loader size={12} className="animate-spin text-[var(--text-muted)]" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
            {filtered.length} von {orgs.length} Einträgen
          </div>
        </div>
      )}
    </div>
  );
}
