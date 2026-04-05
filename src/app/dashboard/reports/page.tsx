"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrganizationsForUser } from "@/lib/organization";
import { getVacationRequestsForOrg, VacationRequest } from "@/lib/vacation";
import {
  differenceInCalendarDays,
  parseISO,
  format,
  getMonth,
  getYear,
  isWithinInterval,
  startOfYear,
  endOfYear,
  subMonths,
} from "date-fns";
import { de } from "date-fns/locale";
import {
  ClipboardList,
  FileBarChart,
  TrendingUp,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Loader,
  ChevronDown,
  BarChart2,
  FileText,
} from "lucide-react";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

type DateRangePreset =
  | "this_year"
  | "last_30"
  | "last_90"
  | "last_year"
  | "all";

const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  this_year: "Dieses Jahr",
  last_30: "Letzte 30 Tage",
  last_90: "Letzte 90 Tage",
  last_year: "Letztes Jahr",
  all: "Gesamtzeitraum",
};

function getDateRange(preset: DateRangePreset): { from: Date; to: Date } {
  const now = new Date();
  if (preset === "this_year")
    return { from: startOfYear(now), to: endOfYear(now) };
  if (preset === "last_30") return { from: subMonths(now, 1), to: now };
  if (preset === "last_90") return { from: subMonths(now, 3), to: now };
  if (preset === "last_year") {
    const y = new Date(now.getFullYear() - 1, 0, 1);
    return { from: startOfYear(y), to: endOfYear(y) };
  }
  return { from: new Date(2000, 0, 1), to: now };
}

export default function ReportsPage() {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangePreset>("this_year");
  const [showRangePicker, setShowRangePicker] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const orgs = await getOrganizationsForUser(user.id);
    if (orgs.length === 0) {
      setLoading(false);
      return;
    }
    const org = orgs[0] as { id: string };
    const [reqs, { data: members }] = await Promise.all([
      getVacationRequestsForOrg(org.id),
      supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", org.id),
    ]);
    setRequests(reqs);
    setMemberCount(members?.length ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { from: rangeFrom, to: rangeTo } = getDateRange(dateRange);

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        const d = parseISO(r.from);
        return isWithinInterval(d, { start: rangeFrom, end: rangeTo });
      }),
    [requests, rangeFrom, rangeTo],
  );

  const totalDays = filtered
    .filter((r) => r.status === "approved")
    .reduce(
      (sum, r) =>
        sum + differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1,
      0,
    );
  const pending = filtered.filter((r) => r.status === "pending").length;
  const approved = filtered.filter((r) => r.status === "approved").length;
  const rejected = filtered.filter((r) => r.status === "rejected").length;

  const avgDays =
    approved > 0
      ? (
          filtered
            .filter((r) => r.status === "approved")
            .reduce(
              (sum, r) =>
                sum +
                differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) +
                1,
              0,
            ) / approved
        ).toFixed(1)
      : "0";

  // Monthly distribution within range
  const monthlyData = useMemo(() => {
    const data: Record<string, number> = {};
    filtered.forEach((r) => {
      const d = parseISO(r.from);
      const key = `${getYear(d)}-${getMonth(d)}`;
      data[key] = (data[key] || 0) + 1;
    });

    // Build 12-month window
    const result: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = `${getYear(d)}-${getMonth(d)}`;
      result.push({
        label:
          MONTH_NAMES[getMonth(d)] +
          (getYear(d) !== new Date().getFullYear()
            ? ` '${String(getYear(d)).slice(2)}`
            : ""),
        count: data[key] || 0,
      });
    }
    return result;
  }, [filtered]);

  const maxMonth = Math.max(...monthlyData.map((m) => m.count), 1);

  // Top employees by vacation days
  const employeeStats = useMemo(() => {
    const map: Record<string, { days: number; count: number }> = {};
    filtered
      .filter((r) => r.status === "approved")
      .forEach((r) => {
        const d =
          differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1;
        if (!map[r.user_id]) map[r.user_id] = { days: 0, count: 0 };
        map[r.user_id].days += d;
        map[r.user_id].count++;
      });
    return Object.entries(map)
      .sort((a, b) => b[1].days - a[1].days)
      .slice(0, 5)
      .map(([uid, v]) => ({ uid: uid.slice(0, 8) + "…", ...v }));
  }, [filtered]);

  const handleExportCSV = () => {
    const header = [
      "ID",
      "Von",
      "Bis",
      "Tage",
      "Grund",
      "Status",
      "Eingereicht",
    ];
    const rows = filtered.map((r) => [
      r.id.slice(0, 8),
      r.from,
      r.to,
      differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
      r.status,
      format(parseISO(r.created_at), "dd.MM.yyyy HH:mm"),
    ]);
    const csv = [header, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `away-bericht-${format(rangeFrom, "yyyy-MM")}-${format(rangeTo, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader
          size={24}
          className="animate-spin"
          style={{ color: "var(--primary)" }}
        />
      </div>
    );

  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-black tracking-tight flex items-center gap-2"
            style={{ color: "var(--text-base)" }}
          >
            <FileBarChart size={24} style={{ color: "var(--primary)" }} />{" "}
            Berichte & Auswertungen
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Echtzeitdaten · {DATE_RANGE_LABELS[dateRange]}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range Picker */}
          <div className="relative">
            <button
              onClick={() => setShowRangePicker((o) => !o)}
              className="btn-secondary flex items-center gap-1.5 text-xs"
            >
              <Calendar size={13} />
              {DATE_RANGE_LABELS[dateRange]}
              <ChevronDown size={12} />
            </button>
            {showRangePicker && (
              <div
                className="absolute right-0 top-full mt-1 w-40 rounded-xl border shadow-xl z-20 overflow-hidden"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border)",
                }}
              >
                {(Object.keys(DATE_RANGE_LABELS) as DateRangePreset[]).map(
                  (key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setDateRange(key);
                        setShowRangePicker(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-[var(--bg-elevated)] ${dateRange === key ? "font-bold text-[var(--primary)]" : ""}`}
                      style={{
                        color:
                          dateRange === key
                            ? "var(--primary)"
                            : "var(--text-base)",
                      }}
                    >
                      {DATE_RANGE_LABELS[key]}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <FileText size={13} /> Drucken
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Genehmigte Tage",
            value: totalDays,
            Icon: Calendar,
            color: "var(--primary)",
            border: "border-[var(--primary)]",
          },
          {
            label: "Mitarbeiter",
            value: memberCount,
            Icon: Users,
            color: "#3b82f6",
            border: "border-blue-500",
          },
          {
            label: "Ausstehend",
            value: pending,
            Icon: Clock,
            color: "var(--warning)",
            border: "border-amber-500",
          },
          {
            label: "Genehmigt",
            value: approved,
            Icon: CheckCircle,
            color: "var(--success)",
            border: "border-emerald-500",
          },
          {
            label: "Abgelehnt",
            value: rejected,
            Icon: XCircle,
            color: "var(--danger)",
            border: "border-red-500",
          },
          {
            label: "Ø Dauer (Tage)",
            value: avgDays,
            Icon: BarChart2,
            color: "#8b5cf6",
            border: "border-purple-500",
          },
        ].map(({ label, value, Icon, color, border }) => (
          <div key={label} className={`card p-4 border-l-4 ${border}`}>
            <div
              className="flex items-center gap-2 mb-2 text-[9px] font-black uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              <Icon size={12} style={{ color }} />
              {label}
            </div>
            <div
              className="text-2xl font-black"
              style={{ color: "var(--text-base)" }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <div className="card p-6">
        <h2
          className="text-xs font-black uppercase tracking-widest mb-5 flex items-center gap-2"
          style={{ color: "var(--text-subtle)" }}
        >
          <TrendingUp size={14} style={{ color: "var(--primary)" }} /> Anträge
          pro Monat (letzte 12 Monate)
        </h2>
        <div className="flex items-end gap-1 h-36">
          {monthlyData.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span
                className="text-[9px] font-bold"
                style={{ color: "var(--text-subtle)" }}
              >
                {m.count > 0 ? m.count : ""}
              </span>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${(m.count / maxMonth) * 100}%`,
                  minHeight: m.count > 0 ? "4px" : "0",
                  background:
                    i === 11 ? "var(--primary)" : "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              />
              <span
                className="text-[8px] truncate w-full text-center"
                style={{ color: "var(--text-subtle)" }}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status Breakdown */}
        <div className="card p-6">
          <h2
            className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "var(--text-subtle)" }}
          >
            <ClipboardList size={14} style={{ color: "var(--primary)" }} />{" "}
            Status-Verteilung
          </h2>
          {filtered.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "var(--text-muted)" }}
            >
              Keine Anträge im gewählten Zeitraum
            </p>
          ) : (
            <div className="space-y-3">
              {[
                {
                  label: "Genehmigt",
                  count: approved,
                  color: "var(--success)",
                },
                {
                  label: "Ausstehend",
                  count: pending,
                  color: "var(--warning)",
                },
                { label: "Abgelehnt", count: rejected, color: "var(--danger)" },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-base)" }}>{label}</span>
                    <span className="font-bold" style={{ color }}>
                      {count} (
                      {filtered.length > 0
                        ? Math.round((count / filtered.length) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${filtered.length > 0 ? (count / filtered.length) * 100 : 0}%`,
                        background: color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Employees */}
        <div className="card p-6">
          <h2
            className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "var(--text-subtle)" }}
          >
            <Users size={14} style={{ color: "var(--primary)" }} /> Top 5 nach
            genehmigten Tagen
          </h2>
          {employeeStats.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "var(--text-muted)" }}
            >
              Keine genehmigten Anträge im Zeitraum
            </p>
          ) : (
            <div className="space-y-2">
              {employeeStats.map((e, i) => (
                <div
                  key={e.uid}
                  className="flex items-center gap-3 py-2 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span
                    className="text-xs font-black w-4 text-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    #{i + 1}
                  </span>
                  <div className="flex-1">
                    <span
                      className="text-xs font-mono"
                      style={{ color: "var(--text-base)" }}
                    >
                      {e.uid}
                    </span>
                    <span
                      className="text-[10px] ml-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {e.count} Anträge
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold"
                    style={{ color: "var(--primary)" }}
                  >
                    {e.days} Tage
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Letzte Anträge */}
        <div className="card p-6 lg:col-span-2">
          <h2
            className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "var(--text-subtle)" }}
          >
            <Calendar size={14} style={{ color: "var(--primary)" }} /> Letzte
            Anträge im Zeitraum
          </h2>
          {filtered.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "var(--text-muted)" }}
            >
              Keine Anträge im gewählten Zeitraum
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {[
                      "Von",
                      "Bis",
                      "Tage",
                      "Grund",
                      "Status",
                      "Eingereicht",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left pb-2 pr-4 font-black uppercase tracking-wider text-[9px]"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filtered]
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .slice(0, 10)
                    .map((r) => {
                      const days =
                        differenceInCalendarDays(
                          parseISO(r.to),
                          parseISO(r.from),
                        ) + 1;
                      const statusColor =
                        r.status === "approved"
                          ? "var(--success)"
                          : r.status === "rejected"
                            ? "var(--danger)"
                            : "var(--warning)";
                      return (
                        <tr
                          key={r.id}
                          className="border-b last:border-0"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <td
                            className="py-2 pr-4"
                            style={{ color: "var(--text-base)" }}
                          >
                            {format(parseISO(r.from), "dd.MM.yyyy", {
                              locale: de,
                            })}
                          </td>
                          <td
                            className="py-2 pr-4"
                            style={{ color: "var(--text-base)" }}
                          >
                            {format(parseISO(r.to), "dd.MM.yyyy", {
                              locale: de,
                            })}
                          </td>
                          <td
                            className="py-2 pr-4 font-bold"
                            style={{ color: "var(--text-base)" }}
                          >
                            {days}
                          </td>
                          <td
                            className="py-2 pr-4 truncate max-w-[120px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {r.reason || "–"}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                background: `${statusColor}20`,
                                color: statusColor,
                              }}
                            >
                              {r.status === "approved"
                                ? "Genehmigt"
                                : r.status === "rejected"
                                  ? "Abgelehnt"
                                  : "Ausstehend"}
                            </span>
                          </td>
                          <td
                            className="py-2"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {format(parseISO(r.created_at), "dd.MM.yy HH:mm", {
                              locale: de,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
