"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useLanguage } from "@/components/ui/LanguageProvider";
import { useActiveOrg } from "@/components/ui/ActiveOrgProvider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { getUserRole, UserRole, ROLE_LABELS } from "@/lib/roles";
import SchemaRoleSwitcher from "@/components/SchemaRoleSwitcher";
import { useSubscription } from "@/components/ui/SubscriptionProvider";
import { PlanGate } from "@/components/ui/PlanGate";
import {
  LayoutDashboard,
  CalendarDays,
  Settings,
  X,
  Sun,
  Moon,
  ClipboardList,
  ShieldCheck,
  LogOut,
  Menu,
  Plane,
  Building2,
  FileBarChart,
  UserCircle,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  badge?: number;
  roles?: UserRole[];
}

function SidebarContent({
  onNavigate,
  onMobileToggle,
  isMobile,
}: {
  onNavigate?: () => void;
  onMobileToggle?: () => void;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const { orgs, currentOrg, currentOrgId, switchOrg } = useActiveOrg();
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("?");
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { planTier, trialDaysLeft } = useSubscription();
  const [isElevatedMode, setIsElevatedMode] = useState(true);
  const [showOrgMenu, setShowOrgMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("role-mode");
    if (savedMode === "employee") setIsElevatedMode(false);
  }, []);

  const toggleMode = () => {
    const next = !isElevatedMode;
    setIsElevatedMode(next);
    localStorage.setItem("role-mode", next ? "elevated" : "employee");
    window.dispatchEvent(
      new CustomEvent("role-mode-change", { detail: { elevated: next } }),
    );
  };

  const loadUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      const email = data.user.email ?? "";
      setUserEmail(email);
      setUserInitial(email.charAt(0).toUpperCase());
    } catch {
      /* not logged in */
    }
  }, []);

  // Rolle und Pending-Anträge neu laden wenn sich die aktive Org ändert
  const loadRoleAndPending = useCallback(async () => {
    if (!userId || !currentOrgId) return;
    try {
      const r = await getUserRole(userId, currentOrgId);
      setRole(r as UserRole);

      const supabase = createClient();
      const { data: pending } = await supabase
        .from("vacation_requests")
        .select("id")
        .eq("organization_id", currentOrgId)
        .eq("status", "pending");
      setPendingCount(pending?.length ?? 0);
    } catch {
      setRole("employee");
    }
  }, [userId, currentOrgId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (userId && currentOrgId) {
      loadRoleAndPending();
    }
  }, [loadRoleAndPending, userId, currentOrgId, pathname]);

  // Realtime-Subskription für vacation_requests
  useEffect(() => {
    if (!currentOrgId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-pending-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vacation_requests" },
        () => loadRoleAndPending(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRoleAndPending, currentOrgId]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    router.push("/auth/login");
  };

  const handleSwitchOrg = (orgId: string) => {
    switchOrg(orgId);
    setShowOrgMenu(false);
  };

  const mitarbeiterItems: NavItem[] = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: t.nav.dashboard,
      exact: true,
    },
    {
      href: "/dashboard/requests",
      icon: ClipboardList,
      label: t.dashboard.myRequests,
      exact: true,
    },
    {
      href: "/dashboard/calendar",
      icon: CalendarDays,
      label: t.nav.calendar,
      exact: true,
    },
  ];

  const genehmigerItems: NavItem[] = [
    {
      href: "/dashboard/admin-requests",
      icon: ClipboardList,
      label: t.nav.approvals,
      exact: true,
      badge: mounted && pendingCount > 0 ? pendingCount : undefined,
    },
    {
      href: "/dashboard/reports",
      icon: FileBarChart,
      label: t.nav.reports,
      exact: true,
    },
  ];

  const adminItems: NavItem[] = [
    {
      href: "/admin/settings",
      icon: ShieldCheck,
      label: t.nav.admin,
      exact: true,
    },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href, item.exact);
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium no-underline transition-all duration-150 group ${
          active
            ? "bg-[var(--primary-light)] border border-[rgba(99,102,241,0.2)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-elevated)]"
        }`}
        style={
          active
            ? { color: theme === "dark" ? "rgba(255,255,255,0.9)" : "#374151" }
            : {}
        }
      >
        <item.icon
          size={15}
          className={`shrink-0 transition-colors ${active ? "text-[var(--primary)]" : "text-current"}`}
        />
        <span className="flex-1">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="text-[10px] font-bold bg-[var(--warning)] text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {item.badge}
          </span>
        )}
        {active && (
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* ─── Header / Logo ─────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-lg">
            <Plane size={15} className="text-white" />
          </div>
          <div>
            <div
              className="text-sm font-black tracking-tight"
              style={{ color: "var(--text-base)" }}
            >
              <span style={{ color: "var(--primary)" }}>AWAY</span>
            </div>
            <div
              className="text-[9px] uppercase tracking-widest"
              style={{ color: "var(--text-subtle)" }}
            >
              URLAUBSPLANER
            </div>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={onNavigate}
            className="btn-ghost p-1"
            aria-label="Menü schließen"
          >
            <X size={18} />
          </button>
        )}
        {!isMobile && onMobileToggle && (
          <button onClick={onMobileToggle} className="md:hidden btn-ghost p-1">
            <Menu size={18} />
          </button>
        )}
      </div>

      {/* ─── Organisation Switcher ──────────────────────── */}
      {orgs.length > 0 && (
        <div className="shrink-0 mx-3 mt-3 relative">
          <button
            onClick={() => setShowOrgMenu((v) => !v)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left ${
              showOrgMenu
                ? "border-[var(--primary)] bg-[var(--primary-light)]"
                : "border-[var(--border)] bg-[var(--bg-elevated)]"
            }`}
          >
            <Building2
              size={12}
              style={{ color: "var(--primary)" }}
              className="shrink-0"
            />
            <span
              className="text-[11px] font-bold truncate flex-1"
              style={{ color: "var(--text-base)" }}
            >
              {currentOrg?.name ?? "Organisation wählen"}
            </span>
            {role && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 badge ${
                  role === "admin"
                    ? "role-admin"
                    : role === "cio"
                      ? "role-cio"
                      : role === "approver"
                        ? "role-approver"
                        : "role-employee"
                }`}
              >
                {ROLE_LABELS[role]}
              </span>
            )}
            {orgs.length > 1 && (
              <ChevronDown
                size={12}
                className={`shrink-0 transition-transform text-[var(--text-muted)] ${showOrgMenu ? "rotate-180" : ""}`}
              />
            )}
          </button>

          {/* Dropdown org list */}
          {showOrgMenu && orgs.length > 1 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-xl z-50 overflow-hidden"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
              }}
            >
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[11px] font-medium transition-colors hover:bg-[var(--bg-elevated)] ${
                    org.id === currentOrgId
                      ? "text-[var(--primary)] bg-[var(--primary-light)]"
                      : "text-[var(--text-base)]"
                  }`}
                >
                  <Building2 size={11} className="shrink-0 opacity-60" />
                  <span className="truncate">{org.name}</span>
                  {org.id === currentOrgId && (
                    <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-[var(--primary)]">
                      Aktiv
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Role Mode Toggle (Dual Role Support) ──────────── */}
      {mounted &&
        (role === "admin" || role === "cio" || role === "approver") && (
          <div className="px-3 mt-4 mb-2">
            <button
              onClick={toggleMode}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                isElevatedMode
                  ? "bg-[var(--primary-light)] border-[var(--primary)] text-[var(--primary)]"
                  : "bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCircle size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {isElevatedMode && role
                    ? ROLE_LABELS[role as UserRole]
                    : "Mitarbeiter Modus"}
                </span>
              </div>
              {isElevatedMode ? (
                <ToggleRight size={18} />
              ) : (
                <ToggleLeft size={18} />
              )}
            </button>
          </div>
        )}

      {/* ─── Navigation ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0" onClick={() => setShowOrgMenu(false)}>
        {/* Mitarbeiter Sektion */}
        <div className="px-3 mt-2">
          <p className="section-label px-2 mb-2">Mitarbeiter</p>
          <nav className="flex flex-col gap-0.5">
            {mitarbeiterItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </div>

        {/* Genehmiger Sektion */}
        {(role === "admin" || role === "cio" || role === "approver") &&
          isElevatedMode && (
            <div className="px-3 mt-6">
              <p className="section-label px-2 mb-2">Genehmiger</p>
              <nav className="flex flex-col gap-0.5">
                {genehmigerItems.map((item) =>
                  item.href === "/dashboard/reports" ? (
                    <PlanGate key={item.href} feature="reports" fallback={
                      <NavLink item={{ ...item, href: "/settings/subscription?upgrade=1" }} />
                    }>
                      <NavLink item={item} />
                    </PlanGate>
                  ) : (
                    <NavLink key={item.href} item={item} />
                  )
                )}
              </nav>
            </div>
          )}

        {/* Administration Sektion */}
        {role === "admin" && isElevatedMode && (
          <div className="px-3 mt-6">
            <p className="section-label px-2 mb-2">Administration</p>
            <nav className="flex flex-col gap-0.5">
              {adminItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* ─── Trial / Plan Banner ───────────────────────── */}
      {mounted && (
        <div className="px-3 pb-1">
          <Link
            href="/settings/subscription"
            className={`block w-full rounded-xl px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider transition-colors ${
              planTier === "pro"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : trialDaysLeft > 0
                  ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                  : "bg-[var(--danger-light)] text-[var(--danger)] border border-[var(--danger)]/30"
            }`}
          >
            {planTier === "pro"
              ? "✦ Pro Plan"
              : trialDaysLeft > 0
                ? `Lite Trial – ${trialDaysLeft}d übrig`
                : "Trial abgelaufen"}
          </Link>
        </div>
      )}

      {/* ─── Footer with Role Switcher ─────────────────── */}
      <div
        className="shrink-0 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Visual 1:1 TeamRadar Switcher */}
        {mounted && process.env.NODE_ENV !== "production" && (
          <SchemaRoleSwitcher />
        )}

        <div className="px-3 py-2">
          <div
            className="p-0.5 rounded-xl flex"
            style={{ background: "var(--bg-elevated)" }}
          >
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                theme === "light"
                  ? "bg-white text-[var(--primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-base)]"
              }`}
            >
              <Sun size={11} />
              <span>{t.settings.themeOptions.light}</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                theme === "dark"
                  ? "bg-white/[0.1] text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-base)]"
              }`}
            >
              <Moon size={11} />
              <span>{t.settings.themeOptions.dark}</span>
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] flex items-center justify-center text-white font-bold text-xs shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold truncate"
                style={{ color: "var(--text-base)" }}
              >
                {userEmail || "Benutzer"}
              </p>
              <p className="text-[9px]" style={{ color: "var(--text-subtle)" }}>
                Angemeldet
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href="/settings"
                onClick={onNavigate}
                className={`p-1.5 rounded-lg transition-all ${
                  pathname === "/settings"
                    ? "bg-[var(--primary-light)] text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-elevated)]"
                }`}
                title="Einstellungen"
              >
                <Settings size={13} />
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] transition-all"
                title="Abmelden"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
  onMobileToggle,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onMobileToggle?: () => void;
}) {
  return (
    <>
      <aside className="sidebar-fixed hidden md:flex flex-col">
        <SidebarContent onMobileToggle={onMobileToggle} />
      </aside>
      <aside
        className={`sidebar-fixed flex flex-col md:hidden ${mobileOpen ? "mobile-open" : ""}`}
        style={{ zIndex: 40 }}
      >
        <SidebarContent isMobile onNavigate={onMobileClose} />
      </aside>
      {!mobileOpen && (
        <button
          onClick={onMobileToggle}
          className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl border"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
          aria-label="Menü öffnen"
        >
          <Menu size={18} />
        </button>
      )}
    </>
  );
}
