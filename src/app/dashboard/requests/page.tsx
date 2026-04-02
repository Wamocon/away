"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrganizationsForUser } from "@/lib/organization";
import {
  getVacationRequestsForOrg,
  updateVacationStatus,
  VacationRequest,
  getMyVacationRequests,
} from "@/lib/vacation";
import { getUserRole, UserRole, canApprove } from "@/lib/roles";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  ClipboardList,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  Loader,
  SlidersHorizontal,
  LayoutGrid,
  List,
} from "lucide-react";
import Link from "next/link";
import WizardVacationRequest from "@/components/WizardVacationRequest";
import { useSearchParams } from "next/navigation";
import { useViewMode } from "@/components/ui/ViewModeProvider";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const statusConfig = {
  all: { label: "Alle", cls: "badge-primary", Icon: SlidersHorizontal },
  pending: { label: "Ausstehend", cls: "badge-pending", Icon: Clock },
  approved: { label: "Genehmigt", cls: "badge-approved", Icon: CheckCircle },
  rejected: { label: "Abgelehnt", cls: "badge-rejected", Icon: XCircle },
};

function RequestsPageContent() {
  const { viewMode, setViewMode } = useViewMode();
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("filter") || "all") as StatusFilter;

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const [showWizard, setShowWizard] = useState(
    initialFilter === "all" && searchParams.get("open") === "wizard",
  );
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("open") === "wizard") {
      setShowWizard(true);
    }
  }, [searchParams]);

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

      let currentOrg: { id: string; name: string } | null = null;

      if (orgs.length > 0) {
        currentOrg = orgs[0] as { id: string; name: string };
      } else {
        // Fallback: Erste Organisation im System suchen (für Debugging ohne explizite Rollen)
        const supabase = createClient();
        const { data: fallbackOrgs } = await supabase
          .from("organizations")
          .select("id, name")
          .limit(1);
        if (fallbackOrgs && fallbackOrgs.length > 0) {
          currentOrg = fallbackOrgs[0];
        }
      }

      setOrg(currentOrg);

      if (currentOrg) {
        const r = await getUserRole(user.id, currentOrg.id).catch(
          () => "employee" as UserRole,
        );
        setRole(r);

        const data = canApprove(r)
          ? await getVacationRequestsForOrg(currentOrg.id)
          : await getMyVacationRequests(user.id);
        setRequests(data);
      }
    } catch (err) {
      console.error("Error loading requests:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
            {canApprove(role) ? "Alle Urlaubsanträge" : "Meine Anträge"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {canApprove(role)
              ? `${org?.name} – Alle eingereichten Anträge`
              : "Deine Urlaubsanträge verwalten"}
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="btn-primary"
          disabled={!user || !org}
          title={!org ? "Du musst erst einer Organisation beitreten" : ""}
        >
          <Plus size={14} />
          Neuer Antrag
        </button>
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
                <span className={`ml-0.5 text-[10px] font-bold opacity-75`}>
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
            title="Listenansicht"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
            title="Rasteransicht"
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
            className="bg-transparent border-none outline-none text-xs w-28"
            style={{ color: "var(--text-base)" }}
          />
        </div>
      </div>

      {/* Requests Table */}
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
            {org ? (
              <button
                onClick={() => setShowWizard(true)}
                className="btn-primary mt-4 inline-flex"
              >
                <Plus size={13} /> Ersten Antrag stellen
              </button>
            ) : (
              <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 max-w-md mx-auto">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">
                  Keine Organisation
                </p>
                <p className="text-sm text-[var(--text-base)] mb-4">
                  Du bist noch keiner Organisation zugeordnet. Bitte tritt einer
                  Organisation bei oder erstelle eine neue, um Anträge zu
                  stellen.
                </p>
                <Link href="/settings" className="btn-secondary text-xs">
                  Zu den Einstellungen
                </Link>
              </div>
            )}
          </div>
        ) : viewMode === "list" ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Zeitraum</th>
                <th>Dauer</th>
                <th>Grund</th>
                <th>Status</th>
                {canApprove(role) && <th>Aktionen</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
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
                      className="text-sm truncate max-w-[180px] block"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {r.reason || "–"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        r.status === "approved"
                          ? "badge-approved"
                          : r.status === "rejected"
                            ? "badge-rejected"
                            : "badge-pending"
                      }`}
                    >
                      {r.status === "approved"
                        ? "Genehmigt"
                        : r.status === "rejected"
                          ? "Abgelehnt"
                          : "Ausstehend"}
                    </span>
                  </td>
                  {canApprove(role) && (
                    <td>
                      {r.status === "pending" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleStatus(r.id, "approved")}
                            disabled={actionId === r.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                            style={{
                              background: "var(--success-light)",
                              color: "var(--success)",
                            }}
                          >
                            {actionId === r.id ? (
                              <Loader size={10} className="animate-spin" />
                            ) : (
                              <CheckCircle size={10} />
                            )}
                            Genehmigen
                          </button>
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
                            Ablehnen
                          </button>
                        </div>
                      )}
                    </td>
                  )}
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
                className="border p-4 rounded-xl flex flex-col gap-3 relative transition-all hover:shadow-md"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-surface)",
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className={`badge mb-2 inline-block ${
                        r.status === "approved"
                          ? "badge-approved"
                          : r.status === "rejected"
                            ? "badge-rejected"
                            : "badge-pending"
                      }`}
                    >
                      {r.status === "approved"
                        ? "Genehmigt"
                        : r.status === "rejected"
                          ? "Abgelehnt"
                          : "Ausstehend"}
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
                    title="Details"
                  >
                    <Eye size={14} />
                  </Link>
                </div>

                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--text-base)" }}
                  >
                    Grund:{" "}
                  </span>
                  {r.reason || "–"}
                </div>

                <div
                  className="mt-auto pt-3 border-t flex items-center justify-between"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="badge badge-primary text-[10px] px-2 py-0.5">
                    {differenceInCalendarDays(
                      parseISO(r.to),
                      parseISO(r.from),
                    ) + 1}{" "}
                    Tage
                  </span>

                  {canApprove(role) && r.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStatus(r.id, "approved")}
                        disabled={actionId === r.id}
                        className="p-1.5 rounded-md transition-all disabled:opacity-50"
                        style={{
                          background: "var(--success-light)",
                          color: "var(--success)",
                        }}
                        title="Genehmigen"
                      >
                        {actionId === r.id ? (
                          <Loader size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle size={12} />
                        )}
                      </button>
                      <button
                        onClick={() => handleStatus(r.id, "rejected")}
                        disabled={actionId === r.id}
                        className="p-1.5 rounded-md transition-all disabled:opacity-50"
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

      {/* Wizard Modal */}
      {showWizard && user && (
        <WizardVacationRequest
          userId={user.id}
          orgId={org?.id || ""}
          userEmail={user.email}
          orgName={org?.name || "Standard Organisation"}
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader size={24} className="animate-spin text-[var(--primary)]" />
        </div>
      }
    >
      <RequestsPageContent />
    </Suspense>
  );
}
