'use client';
import { useEffect, useState } from 'react';
import { getVacationRequestsForOrg, updateVacationStatus, VacationRequest } from '@/lib/vacation';
import { format, parseISO } from 'date-fns';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const statusConfig = {
  pending:  { label: 'Ausstehend', color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  icon: Clock },
  approved: { label: 'Genehmigt', color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  icon: CheckCircle },
  rejected: { label: 'Abgelehnt', color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20',    icon: XCircle },
};

export default function VacationList({
  organizationId,
  isAdmin,
}: {
  organizationId: string;
  isAdmin: boolean;
}) {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    getVacationRequestsForOrg(organizationId)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [organizationId]);

  const handleStatus = async (id: string, status: 'approved' | 'rejected') => {
    setActionId(id);
    try {
      const updated = await updateVacationStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
    } catch {
      // silent fail
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <div className="text-xs dark:text-white/30 text-gray-400 py-4 text-center">Lade Anträge...</div>;
  }

  if (requests.length === 0) {
    return <div className="text-xs dark:text-white/30 text-gray-400 py-4 text-center">Noch keine Urlaubsanträge.</div>;
  }

  return (
    <div className="space-y-2">
      {requests.map(r => {
        const cfg = statusConfig[r.status];
        const Icon = cfg.icon;
        return (
          <div key={r.id} className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-start gap-2.5 min-w-0">
              <Icon size={14} className={`mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium dark:text-white text-gray-800">
                  {format(parseISO(r.from), 'dd.MM.yyyy')} – {format(parseISO(r.to), 'dd.MM.yyyy')}
                </div>
                {r.reason && (
                  <div className="text-xs dark:text-white/40 text-gray-500 truncate mt-0.5">{r.reason}</div>
                )}
                <div className={`text-[10px] font-semibold mt-1 ${cfg.color}`}>{cfg.label}</div>
              </div>
            </div>

            {isAdmin && r.status === 'pending' && (
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => handleStatus(r.id, 'approved')}
                  disabled={actionId === r.id}
                  className="text-[11px] px-2 py-1 rounded bg-green-500/15 hover:bg-green-500/25 text-green-400 font-semibold transition disabled:opacity-50"
                >
                  ✓ Genehmigen
                </button>
                <button
                  onClick={() => handleStatus(r.id, 'rejected')}
                  disabled={actionId === r.id}
                  className="text-[11px] px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 font-semibold transition disabled:opacity-50"
                >
                  ✕ Ablehnen
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
