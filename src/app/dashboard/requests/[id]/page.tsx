'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { VacationRequest, updateVacationStatus } from '@/lib/vacation';
import { getUserRole, UserRole, canApprove } from '@/lib/roles';
import { getOrganizationsForUser } from '@/lib/organization';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowLeft, CheckCircle, XCircle, Clock,
  Mail, Calendar, Loader, AlertCircle,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<VacationRequest | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return; }
      if (!data.user) { router.push('/auth/login'); return; }

      const orgs = await getOrganizationsForUser(data.user.id);
      if (orgs.length > 0) {
        const org = orgs[0] as { id: string; name: string };
        const r = await getUserRole(data.user.id, org.id).catch(() => 'employee' as UserRole);
        setRole(r);
      }

      const { data: req } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('id', id)
        .single();

      setRequest(req as VacationRequest);
      setLoading(false);
    });
  }, [id, router]);

  const handleStatus = async (status: 'approved' | 'rejected') => {
    if (!request) return;
    setActionLoading(true);
    setError('');
    try {
      const updated = await updateVacationStatus(request.id, status);
      setRequest(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (!request) return;
    setActionLoading(true);
    try {
      const supabase = createClient();
      await supabase.functions.invoke('send-vacation-mail', {
        body: {
          requestId: request.id,
          fromDate: request.from,
          toDate: request.to,
          reason: request.reason,
          appUrl: window.location.origin,
        },
      });
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const statusConfig = {
    pending:  { label: 'Ausstehend', cls: 'badge-pending',  Icon: Clock, color: 'var(--warning)' },
    approved: { label: 'Genehmigt',  cls: 'badge-approved', Icon: CheckCircle, color: 'var(--success)' },
    rejected: { label: 'Abgelehnt', cls: 'badge-rejected',  Icon: XCircle, color: 'var(--danger)' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={40} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Antrag nicht gefunden</p>
        <Link href="/dashboard/requests" className="btn-primary mt-4 inline-flex">
          <ArrowLeft size={14} /> Zurück zu Anträgen
        </Link>
      </div>
    );
  }

  const cfg = statusConfig[request.status];
  const days = differenceInCalendarDays(parseISO(request.to), parseISO(request.from)) + 1;

  return (
    <div className="p-6 md:p-8 w-full max-w-3xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link href="/dashboard" className="hover:text-[var(--text-base)] transition-colors">Dashboard</Link>
        <ChevronRight size={12} />
        <Link href="/dashboard/requests" className="hover:text-[var(--text-base)] transition-colors">Anträge</Link>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--text-base)' }}>Antrag Details</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-base)' }}>
            Urlaubsantrag
          </h1>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-subtle)' }}>ID: {request.id}</p>
        </div>
        <span className={`badge ${cfg.cls} text-sm px-4 py-2`}>
          <cfg.Icon size={14} />
          {cfg.label}
        </span>
      </div>

      {/* Status Timeline */}
      <div className="card p-5 mb-5">
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-subtle)' }}>Status-Verlauf</h2>
        <div className="flex items-center gap-0">
          {[
            { label: 'Eingereicht', done: true, active: false },
            { label: 'In Prüfung', done: request.status !== 'pending', active: request.status === 'pending' },
            { label: request.status === 'rejected' ? 'Abgelehnt' : 'Genehmigt',
              done: request.status !== 'pending',
              active: false,
              color: request.status === 'rejected' ? 'var(--danger)' : 'var(--success)'
            },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all`}
                  style={{
                    background: s.done ? (s.color || 'var(--success)') : s.active ? 'var(--primary)' : 'var(--bg-elevated)',
                    borderColor: s.done ? (s.color || 'var(--success)') : s.active ? 'var(--primary)' : 'var(--border)',
                    color: s.done || s.active ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {s.done ? '✓' : i + 1}
                </div>
                <span className="text-[10px] font-semibold text-center whitespace-nowrap" style={{ color: s.done || s.active ? 'var(--text-base)' : 'var(--text-subtle)' }}>
                  {s.label}
                </span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 mt-[-14px] ${s.done ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="card p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-subtle)' }}>Zeitraum</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: 'var(--primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Von</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>
                  {format(parseISO(request.from), 'EEEE, dd. MMMM yyyy', { locale: de })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: 'var(--primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bis</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>
                  {format(parseISO(request.to), 'EEEE, dd. MMMM yyyy', { locale: de })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="badge badge-primary text-sm">{days} Urlaubstage</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-subtle)' }}>Details</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Grund</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>{request.reason || '–'}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Eingereicht am</p>
              <p className="text-sm" style={{ color: 'var(--text-base)' }}>
                {format(parseISO(request.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
              </p>
            </div>
            {request.template_fields && Object.keys(request.template_fields).length > 0 && (
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Weitere Angaben</p>
                {Object.entries(request.template_fields as Record<string, unknown>).map(([k, v]) => {
                  if (!v) return null;
                  
                  let displayValue = String(v);
                  
                  // Handle Checkbox/Multi-select objects (array of {label, checked})
                  if (Array.isArray(v)) {
                    displayValue = v
                      .filter(item => item && typeof item === 'object' && 'checked' in item && item.checked)
                      .map(item => item.label)
                      .join(', ');
                  } else if (typeof v === 'object' && v !== null && 'label' in (v as any)) {
                    displayValue = (v as any).label;
                  }

                  if (!displayValue) return null;

                  return (
                    <p key={k} className="text-xs" style={{ color: 'var(--text-base)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}:</span> {displayValue}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-subtle)' }}>Aktionen</h2>
        <div className="flex flex-wrap gap-2">
          {/* Approve / Reject for approvers */}
          {canApprove(role) && request.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatus('approved')}
                disabled={actionLoading}
                className="btn-primary"
                style={{ background: 'var(--success)' }}
              >
                {actionLoading ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                Genehmigen
              </button>
              <button
                onClick={() => handleStatus('rejected')}
                disabled={actionLoading}
                className="btn-secondary"
                style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--danger)' }}
              >
                <XCircle size={13} />
                Ablehnen
              </button>
            </>
          )}

          {/* Send email reminder */}
          <button onClick={handleSendReminder} disabled={actionLoading} className="btn-secondary">
            <Mail size={13} /> E-Mail Erinnerung
          </button>

          {/* Link kopieren */}
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="btn-secondary"
          >
            Link kopieren
          </button>
        </div>

        {error && (
          <div className="mt-3 text-xs p-2.5 rounded-lg" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
