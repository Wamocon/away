"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCircle, Clock, XCircle, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { getOrganizationsForUser } from "@/lib/organization";
import { getUserRole, canApprove } from "@/lib/roles";
import { useLanguage } from "@/components/ui/LanguageProvider";

export interface AppNotification {
  id: string;
  type: "new_request" | "approved" | "rejected";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  requestId?: string;
}

const STORAGE_KEY = "away-notifications-read";

function getReadIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function markRead(id: string) {
  const ids = getReadIds();
  ids.add(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

function markAllRead(ids: string[]) {
  const existing = getReadIds();
  ids.forEach((id) => existing.add(id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing]));
  } catch {}
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t, locale } = useLanguage();
  const dateFnsLocale = locale === "en" ? enUS : de;

  const buildNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      // Use getSession() instead of getUser() to avoid auth-token lock contention
      // when multiple components simultaneously try to refresh the session.
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;

      const orgs = await getOrganizationsForUser(userId);
      if (orgs.length === 0) return;
      const org = orgs[0] as { id: string; name: string };

      let role: string;
      try {
        role = await getUserRole(userId, org.id);
      } catch {
        role = "employee";
      }

      const readIds = getReadIds();
      const items: AppNotification[] = [];

      if (canApprove(role as never)) {
        const { data: pending } = await supabase
          .from("vacation_requests")
          .select("id, user_id, from, to, reason, created_at")
          .eq("organization_id", org.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(10);

        if (pending) {
          for (const req of pending) {
            items.push({
              id: `pending-${req.id}`,
              type: "new_request",
              title: t.notifications.newRequest,
              message: `${format(parseISO(req.from), "P", { locale: dateFnsLocale })} – ${format(parseISO(req.to), "P", { locale: dateFnsLocale })}`,
              createdAt: req.created_at,
              read: readIds.has(`pending-${req.id}`),
              requestId: req.id,
            });
          }
        }
      }

      const { data: myChanges } = await supabase
        .from("vacation_requests")
        .select("id, from, to, status, updated_at")
        .eq("user_id", userId)
        .in("status", ["approved", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(10);

      if (myChanges) {
        for (const req of myChanges) {
          const notifId = `status-${req.id}-${req.status}`;
          items.push({
            id: notifId,
            type: req.status as "approved" | "rejected",
            title:
              req.status === "approved"
                ? t.notifications.approved
                : t.notifications.rejected,
            message: `${format(parseISO(req.from), "P", { locale: dateFnsLocale })} – ${format(parseISO(req.to), "P", { locale: dateFnsLocale })}`,
            createdAt: req.updated_at,
            read: readIds.has(notifId),
            requestId: req.id,
          });
        }
      }

      items.sort((a, b) => {
        const aTime = Date.parse(a.createdAt);
        const bTime = Date.parse(b.createdAt);

        if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
          return bTime - aTime;
        }

        return b.createdAt.localeCompare(a.createdAt);
      });
      setNotifications(items.slice(0, 15));
    } catch (err) {
      console.error("[NotificationCenter]", err);
    } finally {
      setLoading(false);
    }
  }, [t, dateFnsLocale]);

  useEffect(() => {
    buildNotifications();
  }, [buildNotifications]);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
      buildNotifications();
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const unread = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (n: AppNotification) => {
    markRead(n.id);
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
    );
    setOpen(false);
    if (n.requestId) {
      router.push(`/dashboard/requests/${n.requestId}`);
    }
  };

  const handleReadAll = () => {
    markAllRead(notifications.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const iconForType = (type: AppNotification["type"]) => {
    if (type === "approved")
      return <CheckCircle size={14} style={{ color: "var(--success)" }} />;
    if (type === "rejected")
      return <XCircle size={14} style={{ color: "var(--danger)" }} />;
    return <Clock size={14} style={{ color: "var(--warning)" }} />;
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all btn-ghost"
        title={t.notifications.title}
        aria-label={t.notifications.title}
      >
        <Bell size={15} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-black"
            style={{ background: "var(--danger)", fontSize: "9px" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="fixed w-80 rounded-2xl border z-[200] overflow-hidden shadow-2xl"
          style={{
            top: dropdownPos.top,
            right: dropdownPos.right,
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="text-sm font-bold"
              style={{ color: "var(--text-base)" }}
            >
              {t.notifications.title}
              {unread > 0 && (
                <span
                  className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "var(--danger-light)",
                    color: "var(--danger)",
                  }}
                >
                  {unread} {t.common.new}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleReadAll}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-all"
                  style={{ color: "var(--primary)" }}
                  title={t.notifications.markAllRead}
                >
                  <Check size={12} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg btn-ghost"
                aria-label={t.common.close}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-80 custom-scrollbar">
            {loading && (
              <div
                className="p-6 text-center text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {t.common.loading}
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="p-6 text-center">
                <Bell
                  size={24}
                  className="mx-auto mb-2 opacity-20"
                  style={{ color: "var(--text-subtle)" }}
                />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {t.notifications.noNotifications}
                </p>
              </div>
            )}
            {!loading &&
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-all hover:bg-[var(--bg-elevated)]"
                  style={{
                    borderColor: "var(--border-subtle)",
                    background: n.read ? undefined : "var(--primary-light)",
                  }}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="mt-0.5 shrink-0">{iconForType(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{
                        color: n.read
                          ? "var(--text-muted)"
                          : "var(--text-base)",
                      }}
                    >
                      {n.title}
                    </p>
                    <p
                      className="text-[11px] truncate mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <div
                      className="w-2 h-2 rounded-full mt-1 shrink-0"
                      style={{ background: "var(--primary)" }}
                    />
                  )}
                </div>
              ))}
          </div>

          {notifications.length > 0 && (
            <div
              className="px-4 py-2 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <Link
                href="/dashboard/requests"
                className="block text-center text-xs font-semibold py-1 rounded-lg transition-all hover:bg-[var(--bg-elevated)]"
                style={{ color: "var(--primary)" }}
                onClick={() => setOpen(false)}
              >
                {t.notifications.viewAll}
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
