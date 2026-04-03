"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrganizationsForUser } from "@/lib/organization";
import {
  getVacationRequestsForOrg,
  updateVacationStatus,
  VacationRequest,
} from "@/lib/vacation";
import { getUserRole, UserRole, canApprove } from "@/lib/roles";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  SlidersHorizontal,
  LayoutGrid,
  List,
} from "lucide-react";
import Link from "next/link";
import { useViewMode } from "@/components/ui/ViewModeProvider";
import { useLanguage } from "@/components/ui/LanguageProvider";
import { useRouter } from "next/navigation";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminRequestsPage() {
  const { viewMode, setViewMode } = useViewMode();
  const router = useRouter();
  const { t } = useLanguage();

  const statusConfig = {
    all: { label: t.common.all, cls: "badge-primary", Icon: SlidersHorizontal },
    pending: { label: t.status.pending, cls: "badge-pending", Icon: Clock },
    approved: { label: t.status.approved, cls: "badge-approved", Icon: CheckCircle },
    rejected: { label: t.status.rejected, cls: "badge-rejected", Icon: XCircle },
  };
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null);
  const [, setRole] = useState<UserRole | null>(null);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser({ id: data.user.id, email: data.user.email ?? "" });
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const orgs = await getOrganizationsForUser(user.id);
      if (orgs.length === 0) return;
      const firstOrg = orgs[0] as { id: string; name: string };
      setOrg(firstOrg);
      const r = await getUserRole(user.id, firstOrg.id).catch(
        () => "employee" as UserRole,
      );
      setRole(r);
      if (!canApprove(r)) {
        router.push("/dashboard");
        return;
      }
      const data = await getVacationRequestsForOrg(firstOrg.id);
      setRequests(data);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatus = async (id: string, status: "approved" | "rejected") => {
    setActionId(id);
    try {
      await updateVacationStatus(id, status);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch (err) {
      console.error("Fehler beim Status-Update:", err);
    } finally {
      setActionId(null);
    }
  };

  const filtered = requests.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch =
      !search ||
      r.reason?.toLowerCase().includes(search.toLowerCase()) ||
      r.from.includes(search) ||
      r.to.includes(search);
    return matchStatus && matchSearch;
  });

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="p-6 md:p-8 w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-black tracking-tight flex items-center gap-2"
            style={{ color: "var(--text-base)" }}
          >
            <ClipboardList size={22} style={{ color: "var(--primary)" }} />
            {t.nav.approvals}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {org?.name} – {t.approvals?.desc || "Alle eingereichten Urlaubsanträge verwalten"}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {(Object.keys(statusConfig) as StatusFilter[]).map((s) => {
          const cfg = statusConfig[s];
          const Icon = cfg.Icon;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === s
                  ? s === "pending"
                    ? "bg-[var(--warning)] text-white"
                    : s === "approved"
                      ? "bg-[var(--success)] text-white"
                      : s === "rejected"
                        ? "bg-[var(--danger)] text-white"
                        : "bg-[var(--primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <Icon size={12} />
              {cfg.label}
              {counts[s] > 0 && (
                <span className="ml-0.5 text-[10px] font-bold opacity-75">
                  ({counts[s]})
                </span>
              )}
            </button>
          );
        })}

        {/* View Toggle */}
        <div
          className="ml-auto flex items-center bg-[var(--bg-elevated)] p-1 rounded-xl mr-2 border"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
            title="Liste"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
            title="Raster"
          >
            <LayoutGrid size={14} />
          </button>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 border rounded-xl px-3 py-1.5"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          <Search size={12} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
            className="bg-transparent border-none outline-none text-xs w-28"
            style={{ color: "var(--text-base)" }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={40} className="mx-auto mb-4 opacity-20" />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              {statusFilter === "all"
                ? "Noch keine Anträge vorhanden"
                : `Keine ${statusConfig[statusFilter].label.toLowerCase()} Anträge`}
            </p>
          </div>
        ) : viewMode === "list" ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Antragsteller</th>
                <th>Zeitraum</th>
                <th>Dauer</th>
                <th>Grund</th>
                <th>Status</th>
                <th>Aktionen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="text-xs font-mono opacity-50">
                      {r.user_id.slice(0, 8)}…
                    </span>
                  </td>
                  <td>
                    <div
                      style={{ color: "var(--text-base)" }}
                      className="font-semibold text-sm"
                    >
                      {format(parseISO(r.from), "dd.MM.yyyy", { locale: de })}
                    </div>
                    <div
                      style={{ color: "var(--text-muted)" }}
                      className="text-xs"
                    >
                      – {format(parseISO(r.to), "dd.MM.yyyy", { locale: de })}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary">
                      {differenceInCalendarDays(
                        parseISO(r.to),
                        parseISO(r.from),
                      ) + 1}{" "}
                      Tage
                    </span>
                  </td>
                  <td>
                    <span
                      className="text-sm truncate max-w-[160px] block"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {r.reason || "–"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${r.status === "approved" ? "badge-approved" : r.status === "rejected" ? "badge-rejected" : "badge-pending"}`}
                    >
                      {r.status === "approved"
                        ? t.status.approved
                        : r.status === "rejected"
                          ? t.status.rejected
                          : t.status.pending}
                    </span>
                  </td>
                  <td>
                    {r.status === "pending" && (
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/requests/${r.id}`}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: "var(--success-light)",
                            color: "var(--success)",
                          }}
                          title="Genehmigen (Unterschrift erforderlich)"
                        >
                          <CheckCircle size={10} />
                          {t.vacation.approve}
                        </Link>
                        <button
                          onClick={() => handleStatus(r.id, "rejected")}
                          disabled={actionId === r.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{
                            background: "var(--danger-light)",
                            color: "var(--danger)",
                          }}
                        >
                          <XCircle size={10} />
                          {t.vacation.reject}
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/dashboard/requests/${r.id}`}
                      className="btn-ghost p-1.5"
                      title="Details"
                    >
                      <Eye size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="border p-4 rounded-xl flex flex-col gap-3 transition-all hover:shadow-md"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-surface)",
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className={`badge mb-2 inline-block ${r.status === "approved" ? "badge-approved" : r.status === "rejected" ? "badge-rejected" : "badge-pending"}`}
                    >
                      {r.status === "approved"
                        ? t.status.approved
                        : r.status === "rejected"
                          ? t.status.rejected
                          : t.status.pending}
                    </span>
                    <div
                      className="text-sm font-bold"
                      style={{ color: "var(--text-base)" }}
                    >
                      {format(parseISO(r.from), "dd.MM")} –{" "}
                      {format(parseISO(r.to), "dd.MM.yyyy")}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/requests/${r.id}`}
                    className="btn-ghost p-1.5"
                  >
                    <Eye size={14} />
                  </Link>
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--text-base)" }}
                  >
                    {t.vacation.reason}:{" "}
                  </span>
                  {r.reason || "–"}
                </div>
                <div
                  className="mt-auto pt-3 border-t flex items-center justify-between"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="badge badge-primary text-[10px]">
                    {differenceInCalendarDays(
                      parseISO(r.to),
                      parseISO(r.from),
                    ) + 1}{" "}
                    Tage
                  </span>
                  {r.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/requests/${r.id}`}
                        className="p-1.5 rounded-md"
                        style={{
                          background: "var(--success-light)",
                          color: "var(--success)",
                        }}
                        title="Genehmigen (Unterschrift erforderlich)"
                      >
                        <CheckCircle size={12} />
                      </Link>
                      <button
                        onClick={() => handleStatus(r.id, "rejected")}
                        disabled={actionId === r.id}
                        className="p-1.5 rounded-md disabled:opacity-50"
                        style={{
                          background: "var(--danger-light)",
                          color: "var(--danger)",
                        }}
                        title="Ablehnen"
                      >
                        <XCircle size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
