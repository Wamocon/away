'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrganizationsForUser } from '@/lib/organization';
import { getVacationRequestsForOrg, VacationRequest } from '@/lib/vacation';
import { differenceInCalendarDays, parseISO, format, getMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { ClipboardList, FileBarChart, TrendingUp, Calendar, Users, Clock, CheckCircle, XCircle, Download, Loader } from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export default function ReportsPage() {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgs = await getOrganizationsForUser(user.id);
    if (orgs.length === 0) { setLoading(false); return; }
    const org = orgs[0] as { id: string };
    setOrgId(org.id);
    const [reqs, { data: members }] = await Promise.all([
      getVacationRequestsForOrg(org.id),
      supabase.from('organization_members').select('id').eq('organization_id', org.id),
    ]);
    setRequests(reqs);
    setMemberCount(members?.length ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalDays = requests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1, 0);

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

  // Monthly distribution (all requests this year)
  const currentYear = new Date().getFullYear();
  const monthlyData = Array(12).fill(0);
  requests.forEach(r => {
    const d = parseISO(r.from);
    if (d.getFullYear() === currentYear) {
      monthlyData[getMonth(d)]++;
    }
  });
  const maxMonth = Math.max(...monthlyData, 1);

  const handleExportCSV = () => {
    const header = ['ID', 'Von', 'Bis', 'Tage', 'Grund', 'Status', 'Eingereicht'];
    const rows = requests.map(r => [
      r.id.slice(0, 8),
      r.from, r.to,
      differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      r.status,
      format(parseISO(r.created_at), 'dd.MM.yyyy HH:mm'),
    ]);
    const csv = [header, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `urlaubsantraege-${currentYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
            <FileBarChart size={24} style={{ color: 'var(--primary)' }} /> Berichte & Auswertungen
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Echtzeitdaten deiner Organisation · {currentYear}
          </p>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-1.5 text-xs">
          <Download size={13} /> CSV exportieren
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Genehmigte Tage', value: totalDays, Icon: Calendar, color: 'var(--primary)', border: 'border-[var(--primary)]' },
          { label: 'Mitarbeiter', value: memberCount, Icon: Users, color: '#3b82f6', border: 'border-blue-500' },
          { label: 'Ausstehend', value: pending, Icon: Clock, color: 'var(--warning)', border: 'border-amber-500' },
          { label: 'Genehmigt', value: approved, Icon: CheckCircle, color: 'var(--success)', border: 'border-emerald-500' },
          { label: 'Abgelehnt', value: rejected, Icon: XCircle, color: 'var(--danger)', border: 'border-red-500' },
        ].map(({ label, value, Icon, color, border }) => (
          <div key={label} className={`card p-5 border-l-4 ${border}`}>
            <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              <Icon size={13} style={{ color }} />
              {label}
            </div>
            <div className="text-3xl font-black" style={{ color: 'var(--text-base)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <div className="card p-6">
        <h2 className="text-xs font-black uppercase tracking-widest mb-5 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
          <TrendingUp size={14} style={{ color: 'var(--primary)' }} /> Anträge pro Monat ({currentYear})
        </h2>
        <div className="flex items-end gap-1 h-32">
          {monthlyData.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold" style={{ color: 'var(--text-subtle)' }}>{count > 0 ? count : ''}</span>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${(count / maxMonth) * 100}%`,
                  minHeight: count > 0 ? '4px' : '0',
                  background: i === new Date().getMonth() ? 'var(--primary)' : 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}
              />
              <span className="text-[8px]" style={{ color: 'var(--text-subtle)' }}>{MONTH_NAMES[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h2 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
            <ClipboardList size={14} style={{ color: 'var(--primary)' }} /> Status-Verteilung
          </h2>
          {requests.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Noch keine Anträge vorhanden</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Genehmigt', count: approved, color: 'var(--success)' },
                { label: 'Ausstehend', count: pending, color: 'var(--warning)' },
                { label: 'Abgelehnt', count: rejected, color: 'var(--danger)' },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text-base)' }}>{label}</span>
                    <span className="font-bold" style={{ color }}>{count} ({requests.length > 0 ? Math.round((count / requests.length) * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${requests.length > 0 ? (count / requests.length) * 100 : 0}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 Recent Requests */}
        <div className="card p-6">
          <h2 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
            <Calendar size={14} style={{ color: 'var(--primary)' }} /> Letzte Anträge
          </h2>
          {requests.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Noch keine Anträge vorhanden</p>
          ) : (
            <div className="space-y-2">
              {[...requests]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .slice(0, 5)
                .map(r => {
                  const days = differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1;
                  const statusColor = r.status === 'approved' ? 'var(--success)' : r.status === 'rejected' ? 'var(--danger)' : 'var(--warning)';
                  return (
                    <div key={r.id} className="flex items-center justify-between text-xs py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <span style={{ color: 'var(--text-base)' }} className="font-medium">
                          {format(parseISO(r.from), 'dd.MM', { locale: de })} – {format(parseISO(r.to), 'dd.MM.yyyy', { locale: de })}
                        </span>
                        <span className="ml-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>{days} Tage</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor}20`, color: statusColor }}>
                        {r.status === 'approved' ? 'Genehmigt' : r.status === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
