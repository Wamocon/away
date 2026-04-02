'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getOrganizationsForUser } from '@/lib/organization';
import { getVacationRequestsForOrg, VacationRequest } from '@/lib/vacation';
import { getUserRole, UserRole, canApprove, ROLE_LABELS } from '@/lib/roles';
import { format, parseISO, differenceInCalendarDays, isFuture } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ClipboardList, CheckCircle, Clock, XCircle, CalendarDays,
  Plus, ArrowRight, Users, TrendingUp, Mail,
  ShieldCheck, LayoutGrid, List
} from 'lucide-react';
import { useViewMode } from '@/components/ui/ViewModeProvider';
import { useLanguage } from '@/components/ui/LanguageProvider';
import WizardVacationRequest from '@/components/WizardVacationRequest';

export default function Dashboard() {
  const { viewMode, setViewMode } = useViewMode();
  const { t } = useLanguage();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  // Mirror the sidebar's elevated-mode state (admin/approver/cio can toggle to employee view)
  const [isElevatedMode, setIsElevatedMode] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/login'); return; }
      setUser({ id: data.user.id, email: data.user.email ?? '' });
    }).catch(() => router.push('/auth/login'));
    // Read initial elevated mode from localStorage
    const saved = typeof window !== 'undefined' ? localStorage.getItem('role-mode') : null;
    setIsElevatedMode(saved !== 'employee');
  }, [router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const orgs = await getOrganizationsForUser(user.id);
      if (orgs.length === 0) return;
      const firstOrg = orgs[0] as { id: string; name: string };
      setOrg(firstOrg);
      const [userRole, reqs] = await Promise.all([
        getUserRole(user.id, firstOrg.id).catch(() => 'employee' as UserRole),
        getVacationRequestsForOrg(firstOrg.id),
      ]);
      setRole(userRole);
      setRequests(reqs);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Re-load when role mode changes (sidebar toggle)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ elevated: boolean }>).detail;
      if (detail !== undefined) setIsElevatedMode(detail.elevated);
      loadData();
    };
    window.addEventListener('role-mode-change', handler);
    return () => window.removeEventListener('role-mode-change', handler);
  }, [loadData]);

  // Stats
  const myRequests = requests.filter(r => r.user_id === user?.id);
  // isAdminView = user has elevated role AND has chosen the elevated mode
  const isAdminView = isElevatedMode && canApprove(role);
  const displayRequests = isAdminView ? requests : myRequests;
  const pending  = isAdminView ? requests.filter(r => r.status === 'pending') : myRequests.filter(r => r.status === 'pending');
  const approved = isAdminView
    ? requests.filter(r => r.status === 'approved')
    : myRequests.filter(r => r.status === 'approved');
  const upcoming = approved.filter(r => isFuture(parseISO(r.from)));

  // Approved days this year (always own days)
  const thisYear = new Date().getFullYear();
  const approvedDaysThisYear = myRequests
    .filter(r => r.status === 'approved' && parseISO(r.from).getFullYear() === thisYear)
    .reduce((sum, r) => sum + differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1, 0);

  const recentRequests = displayRequests.slice(0, 5);

  const statusConfig = {
    pending:  { label: 'Ausstehend', color: 'badge-pending',  Icon: Clock },
    approved: { label: 'Genehmigt',  color: 'badge-approved', Icon: CheckCircle },
    rejected: { label: 'Abgelehnt', color: 'badge-rejected',  Icon: XCircle },
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Lade...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full animate-fade-in">
      {/* ─── Page Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-base)' }}>
            {t.dashboard.welcome} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {org ? (
              <>Organisation: <span className="font-semibold" style={{ color: 'var(--text-base)' }}>{org.name}</span></>
            ) : 'Kein Unternehmen ausgewählt'}
            {role && (
              <span className={`ml-2 badge ${role === 'admin' ? 'role-admin' : role === 'approver' ? 'role-approver' : 'role-employee'}`}>
                {ROLE_LABELS[role]}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[var(--bg-elevated)] p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-base)]'}`}
              title="Listenansicht"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-base)]'}`}
              title="Rasteransicht"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          <Link href="/dashboard/calendar" className="btn-secondary">
            <CalendarDays size={14} />
            Kalender
          </Link>
          <button onClick={() => setShowWizard(true)} className="btn-primary">
            <Plus size={14} />
            {t.vacation.newRequest}
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Ausstehend */}
        <div className="kpi-card animate-fade-in-d1">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-xl" style={{ background: 'var(--warning-light)' }}>
              <Clock size={18} style={{ color: 'var(--warning)' }} />
            </div>
            {pending.length > 0 && (
              <span className="text-[10px] font-bold text-white bg-[var(--warning)] px-1.5 py-0.5 rounded-full">
                Neu
              </span>
            )}
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: 'var(--text-base)' }}>
            {pending.length}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {isAdminView ? 'Ausstehende Anträge' : 'Meine ausstehenden'}
          </p>
        </div>

        {/* Genehmigt */}
        <div className="kpi-card animate-fade-in-d2">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-xl" style={{ background: 'var(--success-light)' }}>
              <CheckCircle size={18} style={{ color: 'var(--success)' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: 'var(--text-base)' }}>
            {approved.length}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Genehmigte Anträge
          </p>
        </div>

        {/* Urlaubstage genutzt */}
        <div className="kpi-card animate-fade-in-d3">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-xl" style={{ background: 'var(--primary-light)' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: 'var(--text-base)' }}>
            {approvedDaysThisYear}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Urlaubstage {new Date().getFullYear()}
          </p>
        </div>

        {/* Bevorstehende */}
        <div className="kpi-card animate-fade-in-d4">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-xl" style={{ background: 'var(--info-light)' }}>
              <CalendarDays size={18} style={{ color: 'var(--info)' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: 'var(--text-base)' }}>
            {upcoming.length}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Bevorstehende Urlaube
          </p>
        </div>
      </div>

      {/* ─── Content Grid ─────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Aktuelle Anträge */}
        <div className="lg:col-span-2 card p-5 animate-fade-in-d1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>
                {isAdminView ? 'Anträge der Berater' : t.dashboard.myRequests}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isAdminView ? 'Alle Urlaubsanträge der Organisation' : 'Aktuelle Urlaubsanträge'}
              </p>
            </div>
            <Link href="/dashboard/requests" className="btn-ghost text-xs">
              Alle anzeigen <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardList size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Noch keine Anträge</p>
              <Link href="/dashboard/requests" className="btn-primary mt-4 inline-flex">
                <Plus size={13} /> Ersten Antrag stellen
              </Link>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2">
              {recentRequests.map(r => {
                const cfg = statusConfig[r.status];
                return (
                  <Link
                    key={r.id}
                    href={`/dashboard/requests/${r.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all no-underline group hover:border-[var(--primary)]"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
                  >
                    <cfg.Icon size={16} className={
                      r.status === 'approved' ? 'text-[var(--success)]' :
                      r.status === 'rejected' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'
                    } />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>
                        {format(parseISO(r.from), 'dd.MM.', { locale: de })} – {format(parseISO(r.to), 'dd.MM.yyyy', { locale: de })}
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                          ({differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1} Tage)
                        </span>
                      </p>
                      {r.reason && (
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {r.reason}
                        </p>
                      )}
                    </div>
                    <span className={`badge ${cfg.color} shrink-0`}>{cfg.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentRequests.map(r => {
                const cfg = statusConfig[r.status];
                return (
                  <Link
                    key={r.id}
                    href={`/dashboard/requests/${r.id}`}
                    className="flex flex-col gap-2 p-4 rounded-xl border transition-all no-underline group hover:border-[var(--primary)] hover:shadow-sm"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`badge ${cfg.color} text-[10px]`}>{cfg.label}</span>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                        {differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1} Tage
                      </span>
                    </div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>
                      {format(parseISO(r.from), 'dd.MM')} – {format(parseISO(r.to), 'dd.MM.yyyy')}
                    </div>
                    {r.reason && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {r.reason}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Seitenleiste */}
        <div className="flex flex-col gap-4">
          {/* Quick Actions */}
          <div className="card p-5 animate-fade-in-d3">
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-base)' }}>
              Schnellzugriff
            </h2>
            <div className="flex flex-col gap-2">
          <Link href="/dashboard/requests" className="btn-primary w-full justify-center">
                <Plus size={14} /> Urlaubsantrag stellen
              </Link>
              <Link href="/dashboard/calendar" className="btn-secondary w-full justify-center">
                <CalendarDays size={14} /> Kalender öffnen
              </Link>
              <Link href="/dashboard/email" className="btn-secondary w-full justify-center">
                <Mail size={14} /> E-Mail verbinden
              </Link>
              {canApprove(role) && isAdminView && (
                <Link href="/dashboard/requests?filter=pending" className="btn-secondary w-full justify-center" style={{ borderColor: 'rgba(245,158,11,0.3)', color: 'var(--warning)' }}>
                  <Clock size={14} /> Anträge genehmigen
                </Link>
              )}
              {role === 'admin' && isAdminView && (
                <Link href="/admin/settings" className="btn-secondary w-full justify-center" style={{ borderColor: 'rgba(239,68,68,0.2)', color: 'var(--danger)' }}>
                  <ShieldCheck size={14} /> Administration
                </Link>
              )}
            </div>
          </div>

          {/* Nächster Urlaub */}
          {upcoming.length > 0 && (
            <div className="card p-5 animate-fade-in-d4">
              <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-base)' }}>
                Nächster Urlaub
              </h2>
              {upcoming.slice(0, 2).map(r => (
                <div key={r.id} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                    <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                      in {differenceInCalendarDays(parseISO(r.from), new Date())} Tagen
                    </span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>
                    {format(parseISO(r.from), 'dd. MMMM', { locale: de })} – {format(parseISO(r.to), 'dd. MMMM yyyy', { locale: de })}
                  </p>
                  {r.reason && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{r.reason}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Admin-Badge – nur im elevated mode */}
          {role === 'admin' && isAdminView && (
            <div className="card p-5 animate-fade-in-d5" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} style={{ color: 'var(--primary)' }} />
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>Admin-Übersicht</h2>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                {pending.length} Anträge warten auf Genehmigung
              </p>
              <Link href="/admin/settings" className="btn-secondary w-full justify-center text-xs">
                <Users size={13} /> Zur Administration
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ─── Wizard Modal ───────────────────────────────── */}
      {showWizard && org && user && (
        <WizardVacationRequest
          orgId={org.id}
          orgName={org.name}
          userId={user.id}
          userEmail={user.email}
          onClose={() => setShowWizard(false)}
          onSuccess={() => { setShowWizard(false); loadData(); }}
        />
      )}
    </div>
  );
}
