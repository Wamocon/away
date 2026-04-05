"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  Database,
  Server,
  Clock,
  Globe,
  CheckCircle,
  XCircle,
  Users,
  ClipboardList,
  RefreshCw,
  Loader,
  Monitor,
  Shield,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface SystemStats {
  memberCount: number;
  requestCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  templateCount: number;
  dbStatus: "online" | "error" | "checking";
  sessionUser: string;
  sessionRole: string;
  buildEnv: string;
  supabaseUrl: string;
  now: Date;
}

export function SystemTab({ orgId }: { orgId: string | null }) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      let dbStatus: "online" | "error" = "online";
      let memberCount = 0;
      let requestCount = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      let templateCount = 0;

      if (orgId) {
        const [members, requests, templates] = await Promise.allSettled([
          supabase
            .from("organization_members")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId),
          supabase
            .from("vacation_requests")
            .select("id, status")
            .eq("organization_id", orgId),
          supabase
            .from("document_templates")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId),
        ]);

        if (members.status === "fulfilled" && !members.value.error) {
          memberCount = members.value.count ?? 0;
        } else if (members.status === "rejected") {
          dbStatus = "error";
        }

        if (requests.status === "fulfilled" && requests.value.data) {
          const reqs = requests.value.data;
          requestCount = reqs.length;
          pendingCount = reqs.filter((r) => r.status === "pending").length;
          approvedCount = reqs.filter((r) => r.status === "approved").length;
          rejectedCount = reqs.filter((r) => r.status === "rejected").length;
        }

        if (templates.status === "fulfilled") {
          templateCount = templates.value.count ?? 0;
        }
      }

      setStats({
        memberCount,
        requestCount,
        pendingCount,
        approvedCount,
        rejectedCount,
        templateCount,
        dbStatus,
        sessionUser: user?.email ?? "–",
        sessionRole: user?.role ?? "authenticated",
        buildEnv: process.env.NODE_ENV ?? "production",
        supabaseUrl:
          (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
            .replace(/https?:\/\//, "")
            .split(".")[0] + ".supabase.co",
        now: new Date(),
      });
      setLastRefresh(new Date());
    } catch {
      setStats((s) => (s ? { ...s, dbStatus: "error" } : null));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const kpis = stats
    ? [
        {
          label: "Mitglieder",
          value: stats.memberCount,
          Icon: Users,
          color: "var(--primary)",
        },
        {
          label: "Anträge gesamt",
          value: stats.requestCount,
          Icon: ClipboardList,
          color: "#3b82f6",
        },
        {
          label: "Ausstehend",
          value: stats.pendingCount,
          Icon: Clock,
          color: "var(--warning)",
        },
        {
          label: "Genehmigt",
          value: stats.approvedCount,
          Icon: CheckCircle,
          color: "var(--success)",
        },
        {
          label: "Abgelehnt",
          value: stats.rejectedCount,
          Icon: XCircle,
          color: "var(--danger)",
        },
        {
          label: "Vorlagen",
          value: stats.templateCount,
          Icon: Database,
          color: "#8b5cf6",
        },
      ]
    : [];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Monitor size={18} style={{ color: "var(--primary)" }} />{" "}
            System-Diagnose
          </h2>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            Letzte Aktualisierung:{" "}
            {format(lastRefresh, "HH:mm:ss", { locale: de })}
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="btn-secondary flex items-center gap-1.5 text-xs"
        >
          {loading ? (
            <Loader size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Aktualisieren
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {loading
          ? Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))
          : kpis.map(({ label, value, Icon, color }) => (
              <div key={label} className="card p-4 text-center">
                <Icon size={16} className="mx-auto mb-2" style={{ color }} />
                <div
                  className="text-2xl font-black"
                  style={{ color: "var(--text-base)" }}
                >
                  {value}
                </div>
                <div
                  className="text-[9px] uppercase tracking-wider mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </div>
              </div>
            ))}
      </div>

      {/* Services Status */}
      <div className="card p-6 space-y-4">
        <h3
          className="text-xs font-black uppercase tracking-widest flex items-center gap-2"
          style={{ color: "var(--text-subtle)" }}
        >
          <Activity size={13} style={{ color: "var(--primary)" }} />{" "}
          Dienste-Status
        </h3>
        <div className="space-y-2">
          {[
            {
              name: "Supabase Datenbank",
              icon: Database,
              status: stats?.dbStatus === "online" ? "online" : "error",
              detail: stats?.supabaseUrl ?? "–",
            },
            {
              name: "Next.js Server",
              icon: Server,
              status: "online" as const,
              detail: stats?.buildEnv ?? "–",
            },
            {
              name: "Edge Functions",
              icon: Globe,
              status: stats?.buildEnv === "development" ? "warning" : "online",
              detail:
                stats?.buildEnv === "development"
                  ? "Nicht verfügbar im lokalen Dev-Modus"
                  : "supabase.co/functions",
            },
            {
              name: "Auth Session",
              icon: Shield,
              status: stats?.sessionUser !== "–" ? "online" : "error",
              detail: stats?.sessionUser ?? "–",
            },
          ].map(({ name, icon: Icon, status, detail }) => (
            <div
              key={name}
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-elevated)",
              }}
            >
              <Icon size={15} style={{ color: "var(--text-muted)" }} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-base)" }}
                >
                  {name}
                </p>
                <p
                  className="text-[10px] truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {detail}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {status === "online" ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-500">
                      Online
                    </span>
                  </>
                ) : status === "warning" ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-bold text-amber-500">
                      Dev
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: "var(--danger)" }}
                    >
                      Fehler
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session Info */}
      <div className="card p-6 space-y-4">
        <h3
          className="text-xs font-black uppercase tracking-widest flex items-center gap-2"
          style={{ color: "var(--text-subtle)" }}
        >
          <Shield size={13} style={{ color: "var(--primary)" }} /> Aktive
          Sitzung
        </h3>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Angemeldet als", value: stats.sessionUser },
              { label: "Auth-Rolle", value: stats.sessionRole },
              {
                label: "Zeitzone",
                value: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              {
                label: "Lokale Zeit",
                value: format(stats.now, "HH:mm:ss dd.MM.yyyy", { locale: de }),
              },
              { label: "Umgebung", value: stats.buildEnv },
              {
                label: "Supabase Projekt",
                value: stats.supabaseUrl.split(".")[0],
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="p-3 rounded-xl"
                style={{ background: "var(--bg-elevated)" }}
              >
                <p
                  className="text-[9px] uppercase tracking-wider mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </p>
                <p
                  className="text-xs font-bold truncate"
                  style={{ color: "var(--text-base)" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="skeleton h-20 rounded-xl" />
        )}
      </div>

      {/* Request Distribution */}
      {stats && stats.requestCount > 0 && (
        <div className="card p-6 space-y-4">
          <h3
            className="text-xs font-black uppercase tracking-widest flex items-center gap-2"
            style={{ color: "var(--text-subtle)" }}
          >
            <ClipboardList size={13} style={{ color: "var(--primary)" }} />{" "}
            Antrags-Verteilung
          </h3>
          <div className="space-y-2">
            {[
              {
                label: "Genehmigt",
                count: stats.approvedCount,
                color: "var(--success)",
              },
              {
                label: "Ausstehend",
                count: stats.pendingCount,
                color: "var(--warning)",
              },
              {
                label: "Abgelehnt",
                count: stats.rejectedCount,
                color: "var(--danger)",
              },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--text-base)" }}>{label}</span>
                  <span className="font-bold" style={{ color }}>
                    {count} ({Math.round((count / stats.requestCount) * 100)}%)
                  </span>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(count / stats.requestCount) * 100}%`,
                      background: color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!orgId && (
        <div className="card p-8 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Bitte zuerst eine Organisation auswählen, um System-Daten zu laden.
          </p>
        </div>
      )}
    </div>
  );
}
