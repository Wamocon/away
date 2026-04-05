"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrganizationsForUser } from "@/lib/organization";
import { getVacationRequestsForOrg, VacationRequest } from "@/lib/vacation";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isWeekend,
  startOfWeek,
  addDays,
  differenceInCalendarDays,
} from "date-fns";
import { de } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Building2,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CalendarSync from "@/components/CalendarSync";

type ViewMode = "month" | "week";

interface CalendarEvent {
  id: string;
  title: string;
  from: string;
  to: string;
  type: "approved" | "pending" | "rejected" | "sync";
  reason?: string;
  userId?: string;
}

export default function CalendarPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [syncEvents, setSyncEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [loading, setLoading] = useState(true);
  const [showSync, setShowSync] = useState(false);
  const [selectedSyncEvent, setSelectedSyncEvent] =
    useState<CalendarEvent | null>(null);
  // Bug 8: Datumsauswahl per Klick im Kalender
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      try {
        const uid = data.user?.id;
        if (!uid) return;
        setUserId(uid);
        const orgs = await getOrganizationsForUser(uid);
        const firstOrg = orgs.find((o) => o !== null) as
          | { id: string; name: string }
          | undefined;
        if (firstOrg) {
          setOrgId(firstOrg.id);
        }
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getVacationRequestsForOrg(orgId);
      setRequests(data);

      // Load synced calendar events
      const supabase = createClient();
      const { data: evData } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("organization_id", orgId);
      if (evData) {
        setSyncEvents(
          evData.map(
            (e: {
              id: string;
              title: string;
              start_date: string;
              end_date: string;
              description?: string;
              user_id?: string;
            }) => ({
              id: e.id,
              title: e.title,
              from: e.start_date,
              to: e.end_date,
              type: "sync" as const,
              reason: e.description,
              userId: e.user_id,
            }),
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine all events
  const allEvents: CalendarEvent[] = [
    ...requests.map((r) => ({
      id: r.id,
      title: r.reason || "Urlaub",
      from: r.from,
      to: r.to,
      type: r.status as "approved" | "pending" | "rejected",
      reason: r.reason,
      userId: r.user_id,
    })),
    ...syncEvents,
  ];

  const getDayEvents = (date: Date): CalendarEvent[] =>
    allEvents.filter((e) => {
      const from = parseISO(e.from);
      const to = parseISO(e.to);
      return date >= from && date <= to;
    });

  const today = new Date();
  const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const eventTypeConfig = {
    approved: {
      label: "Genehmigt",
      cls: "cal-event-approved",
      Icon: CheckCircle,
    },
    pending: { label: "Ausstehend", cls: "cal-event-pending", Icon: Clock },
    rejected: { label: "Abgelehnt", cls: "cal-event-rejected", Icon: XCircle },
    sync: { label: "Synchronisiert", cls: "cal-event-sync", Icon: RefreshCw },
  };

  // Month grid
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });
  const firstDayOffset = (getDay(monthDays[0]) + 6) % 7;

  // Week grid
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigate = (dir: 1 | -1) => {
    setCurrentDate((d) =>
      viewMode === "month"
        ? dir === 1
          ? addMonths(d, 1)
          : subMonths(d, 1)
        : addDays(d, dir * 7),
    );
  };

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: de });
  const weekLabel = `${format(weekStart, "dd.MM.")} – ${format(addDays(weekStart, 6), "dd.MM.yyyy")}`;

  // Bug 8: Klick auf Kalendertag für Datumsauswahl
  const handleDayClick = (day: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Erste Auswahl oder Reset nach fertiger Auswahl
      setRangeStart(day);
      setRangeEnd(null);
    } else {
      // Zweite Auswahl
      if (day < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(day);
      } else {
        setRangeEnd(day);
      }
    }
  };

  const isDaySelected = (day: Date) => {
    if (!rangeStart) return false;
    if (isSameDay(day, rangeStart)) return true;
    if (rangeEnd && isSameDay(day, rangeEnd)) return true;
    return false;
  };

  const isDayInRange = (day: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    return day > rangeStart && day < rangeEnd;
  };

  const handleCreateRequest = () => {
    if (!rangeStart) return;
    const fromStr = format(rangeStart, "yyyy-MM-dd");
    const toStr = rangeEnd ? format(rangeEnd, "yyyy-MM-dd") : fromStr;
    router.push(`/dashboard/requests?from=${fromStr}&to=${toStr}&open=wizard`);
  };

  return (
    <div className="p-6 md:p-8 w-full animate-fade-in">
      {/* ─── Datumsauswahl Banner (Bug 8) ────────────────── */}
      {rangeStart && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom-4 duration-300"
          style={{ background: "var(--bg-surface)", borderColor: "var(--primary)" }}
        >
          <div className="text-sm font-semibold" style={{ color: "var(--text-base)" }}>
            <span style={{ color: "var(--primary)" }}>
              {format(rangeStart, "dd.MM.yyyy")}
            </span>
            {rangeEnd && (
              <> → <span style={{ color: "var(--primary)" }}>{format(rangeEnd, "dd.MM.yyyy")}</span></>
            )}
            {!rangeEnd && " (Endtag wählen…)"}
          </div>
          {rangeEnd && (
            <button onClick={handleCreateRequest} className="btn-primary text-xs">
              <Plus size={13} /> Urlaub beantragen
            </button>
          )}
          <button
            onClick={() => { setRangeStart(null); setRangeEnd(null); }}
            className="btn-ghost p-1"
            title="Auswahl zurücksetzen"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-black tracking-tight flex items-center gap-2"
            style={{ color: "var(--text-base)" }}
          >
            <CalendarDays size={22} style={{ color: "var(--primary)" }} />
            Kalender
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Urlaubsübersicht und Termine
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div
            className="flex rounded-xl overflow-hidden border"
            style={{ borderColor: "var(--border)" }}
          >
            {(["month", "week"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === v
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-base)]"
                }`}
                style={{
                  background:
                    viewMode === v ? "var(--primary)" : "var(--bg-surface)",
                }}
              >
                {v === "month" ? "Monat" : "Woche"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSync(true)}
            disabled={!orgId || !userId}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(!orgId || !userId) && loading ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Sync
          </button>

          <Link href="/dashboard/requests" className="btn-primary">
            <Plus size={13} />
            Neuer Antrag
          </Link>
        </div>
      </div>

      {/* ─── Navigation ─────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="btn-ghost text-xs px-3"
        >
          Heute
        </button>
        <button onClick={() => navigate(1)} className="btn-ghost p-2">
          <ChevronRight size={16} />
        </button>
        <span
          className="text-base font-bold capitalize"
          style={{ color: "var(--text-base)" }}
        >
          {viewMode === "month" ? monthLabel : weekLabel}
        </span>
        {loading && (
          <RefreshCw
            size={14}
            className="animate-spin ml-2"
            style={{ color: "var(--text-muted)" }}
          />
        )}
      </div>

      {/* ─── Legend ─────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {Object.entries(eventTypeConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className={`h-2.5 w-4 rounded-sm cal-event-${key}`}
              style={{
                background:
                  key === "approved"
                    ? "rgba(16,185,129,0.2)"
                    : key === "pending"
                      ? "rgba(245,158,11,0.2)"
                      : key === "rejected"
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(139,92,246,0.2)",
              }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              {cfg.label}
            </span>
          </div>
        ))}
      </div>

      {/* ─── Calendar Grid / Empty State ───────────────── */}
      {!orgId && !loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 card-glass border-dashed border-2 min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 rounded-full bg-[var(--primary-light)] flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/10">
            <Building2 size={40} style={{ color: "var(--primary)" }} />
          </div>
          <h2 className="text-2xl font-black mb-3 text-center">
            Keine Organisation aktiv
          </h2>
          <p className="max-w-md text-center text-sm font-medium opacity-60 mb-8 leading-relaxed">
            Um den Kalender zu nutzen und Termine zu synchronisieren, musst du
            Mitglied einer Organisation sein.
          </p>
          <Link
            href="/dashboard/organizations"
            className="btn-primary px-8 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all"
          >
            <Plus size={18} />
            Organisation erstellen oder beitreten
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Weekday Headers */}
          <div
            className="grid grid-cols-7 border-b"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-elevated)",
            }}
          >
            {weekdays.map((d) => (
              <div
                key={d}
                className="text-center py-3 text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-subtle)" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Month View */}
          {viewMode === "month" && (
            <div className="grid grid-cols-7">
              {/* Empty offset cells */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="cal-day"
                  style={{ background: "var(--bg-elevated)", opacity: 0.4 }}
                />
              ))}

              {monthDays.map((day, idx) => {
                const isToday_ = isSameDay(day, today);
                const isWknd = isWeekend(day);
                const dayEvents = getDayEvents(day);
                const totalCells = firstDayOffset + monthDays.length;
                const isLastRow = idx >= totalCells - (totalCells % 7 || 7);
                const maxVisible = 3;
                // Bug 8: Auswahl-Status
                const isSelected = isDaySelected(day);
                const isInRange = isDayInRange(day);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={`cal-day selectable ${isToday_ ? "today" : ""} ${isWknd ? "weekend" : ""} ${isSelected ? "selected" : ""} ${isInRange ? "in-range" : ""}`}
                    style={{
                      borderBottom: isLastRow
                        ? "none"
                        : `1px solid var(--border)`,
                      borderRight: `1px solid var(--border)`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span
                        className={`text-[11px] font-bold leading-none flex items-center justify-center ${
                          isToday_
                            ? "w-6 h-6 rounded-full bg-[var(--primary)] text-white"
                            : isWknd
                              ? "text-[var(--text-subtle)]"
                              : "text-[var(--text-muted)]"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {dayEvents.slice(0, maxVisible).map((ev) => {
                        const isSync = ev.type === "sync";
                        const Content = (
                          <span
                            className={`cal-event ${eventTypeConfig[ev.type].cls} no-underline truncate block w-full text-left`}
                            title={ev.title}
                          >
                            {ev.title}
                          </span>
                        );

                        if (isSync) {
                          return (
                            <div
                              key={ev.id}
                              className="cursor-pointer hover:brightness-95 transition-all"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedSyncEvent(ev);
                              }}
                            >
                              {Content}
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={ev.id}
                            href={`/dashboard/requests/${ev.id}`}
                            className="no-underline block"
                          >
                            {Content}
                          </Link>
                        );
                      })}
                      {dayEvents.length > maxVisible && (
                        <div
                          className="text-[9px] font-semibold"
                          style={{ color: "var(--text-muted)" }}
                        >
                          +{dayEvents.length - maxVisible} mehr
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Week View */}
          {viewMode === "week" && (
            <div className="grid grid-cols-7" style={{ minHeight: "500px" }}>
              {weekDays.map((day) => {
                const isToday_ = isSameDay(day, today);
                const isWknd = isWeekend(day);
                const dayEvents = getDayEvents(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`cal-day flex flex-col ${isToday_ ? "today" : ""} ${isWknd ? "weekend" : ""}`}
                    style={{
                      minHeight: "400px",
                      borderRight: `1px solid var(--border)`,
                    }}
                  >
                    <div className="flex items-center gap-1 mb-2">
                      <span
                        className={`text-xs font-bold flex items-center justify-center ${
                          isToday_
                            ? "w-6 h-6 rounded-full bg-[var(--primary)] text-white"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 flex-1">
                      {dayEvents.map((ev) => {
                        const isSync = ev.type === "sync";
                        const Content = (
                          <span
                            className={`cal-event ${eventTypeConfig[ev.type].cls} no-underline py-1.5 px-2 rounded-lg text-[11px] flex items-center gap-1 w-full text-left`}
                          >
                            {ev.title}
                          </span>
                        );

                        if (isSync) {
                          return (
                            <div
                              key={ev.id}
                              className="cursor-pointer hover:brightness-95 transition-all"
                              title={ev.title}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedSyncEvent(ev);
                              }}
                            >
                              {Content}
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={ev.id}
                            href={`/dashboard/requests/${ev.id}`}
                            className="no-underline block"
                            title={ev.title}
                          >
                            {Content}
                          </Link>
                        );
                      })}
                      {dayEvents.length === 0 && isToday_ && (
                        <Link
                          href="/dashboard/requests"
                          className="text-[10px] text-[var(--primary)] border border-dashed border-[var(--primary-light)] rounded-lg p-1.5 text-center no-underline hover:bg-[var(--primary-light)] transition-colors"
                        >
                          + Antrag
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Upcoming Requests ──────────────────────────── */}
      {requests.length > 0 && (
        <div className="mt-6 card p-5 animate-fade-in-d2">
          <h2
            className="text-sm font-bold mb-4"
            style={{ color: "var(--text-base)" }}
          >
            Aktuelle Anträge
          </h2>
          <div className="space-y-2">
            {requests.slice(0, 8).map((r) => {
              const cfg =
                eventTypeConfig[r.status as keyof typeof eventTypeConfig];
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/requests/${r.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border no-underline group hover:border-[rgba(99,102,241,0.2)] transition-all"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      r.status === "approved"
                        ? "bg-[var(--success)]"
                        : r.status === "rejected"
                          ? "bg-[var(--danger)]"
                          : "bg-[var(--warning)]"
                    }`}
                  />
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-base)" }}
                  >
                    <span className="font-semibold">
                      {format(parseISO(r.from), "dd.MM.yyyy")}
                    </span>
                    {" – "}
                    <span className="font-semibold">
                      {format(parseISO(r.to), "dd.MM.yyyy")}
                    </span>
                    <span
                      className="text-xs ml-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      (
                      {differenceInCalendarDays(
                        parseISO(r.to),
                        parseISO(r.from),
                      ) + 1}{" "}
                      Tage)
                    </span>
                  </div>
                  {r.reason && (
                    <div
                      className="text-xs truncate flex-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {r.reason}
                    </div>
                  )}
                  <span
                    className={`badge ${cfg?.label === "Genehmigt" ? "badge-approved" : cfg?.label === "Ausstehend" ? "badge-pending" : "badge-rejected"} shrink-0 ml-auto`}
                  >
                    {cfg?.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Sync Modal ─────────────────────────────────── */}
      {showSync && (
        <CalendarSync
          orgId={orgId || ""}
          userId={userId || ""}
          onClose={() => setShowSync(false)}
          onSynced={loadData}
        />
      )}

      {/* ─── Event Detail Modal (Synced) ────────────────── */}
      {selectedSyncEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md card p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div
              className="p-1 px-4 py-3 flex items-center justify-between border-b"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-[var(--primary)]" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                  Synchronisierter Termin
                </span>
              </div>
              <button
                onClick={() => setSelectedSyncEvent(null)}
                className="btn-ghost p-1.5 rounded-lg"
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-black mb-4 leading-tight">
                {selectedSyncEvent.title}
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
                    <Clock size={15} style={{ color: "var(--primary)" }} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-1">
                      Zeitraum
                    </label>
                    <p className="text-sm font-semibold">
                      {format(
                        parseISO(selectedSyncEvent.from),
                        "dd. MMMM yyyy",
                        { locale: de },
                      )}
                      {selectedSyncEvent.from !== selectedSyncEvent.to &&
                        ` – ${format(parseISO(selectedSyncEvent.to), "dd. MMMM yyyy", { locale: de })}`}
                    </p>
                  </div>
                </div>

                {selectedSyncEvent.reason && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
                      <LayoutDashboard
                        size={15}
                        style={{ color: "var(--primary)" }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-1">
                        Beschreibung
                      </label>
                      <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">
                        {selectedSyncEvent.reason}
                      </p>
                    </div>
                  </div>
                )}

                <div
                  className="p-3 rounded-xl bg-[var(--bg-elevated)] border text-[10px] text-center"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  Dieser Termin wurde aus deinem externen Kalender
                  synchronisiert. Änderungen müssen direkt im Quell-Kalender
                  vorgenommen werden.
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setSelectedSyncEvent(null)}
                  className="btn-primary px-6 py-2 rounded-xl"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
