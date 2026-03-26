'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrganizationsForUser } from '@/lib/organization';
import { getVacationRequestsForOrg } from '@/lib/vacation';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface VacationRequest {
  id: string;
  user_id: string;
  from: string;
  to: string;
  reason: string;
}

export default function CalendarPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      getOrganizationsForUser(uid).then(orgs => {
        const firstOrg = orgs.find(o => o !== null) as { id: string; name: string } | undefined;
        if (firstOrg) setOrgId(firstOrg.id);
      });
    });
  }, []);

  useEffect(() => {
    if (!orgId) return;
    getVacationRequestsForOrg(orgId).then(data => setRequests((data as VacationRequest[]) || []));
  }, [orgId]);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (getDay(days[0]) + 6) % 7; // Monday=0

  const isVacationDay = (date: Date) => {
    return requests.some(r => {
      const from = parseISO(r.from);
      const to = parseISO(r.to);
      return date >= from && date <= to;
    });
  };

  const getDayRequests = (date: Date) => {
    return requests.filter(r => {
      const from = parseISO(r.from);
      const to = parseISO(r.to);
      return date >= from && date <= to;
    });
  };

  const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const today = new Date();

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900 flex items-center gap-2">
            <CalendarDays size={22} className="text-blue-500" /> Kalender
          </h1>
          <p className="text-sm dark:text-white/40 text-gray-500 mt-1">Übersicht aller Urlaubsabwesenheiten</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-black/5 transition">
            <ChevronLeft size={16} className="dark:text-white/60 text-gray-500" />
          </button>
          <span className="text-sm font-semibold dark:text-white text-gray-800 w-36 text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: de })}
          </span>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-black/5 transition">
            <ChevronRight size={16} className="dark:text-white/60 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
          {weekdays.map(d => (
            <div key={d} className="text-center py-2.5 text-[11px] font-bold uppercase tracking-widest dark:text-white/25 text-gray-400">
              {d}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e-${i}`} className="h-14 border-b border-r" style={{ borderColor: 'var(--border)' }} />
          ))}
          {days.map((day, idx) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            const isVacation = isVacationDay(day);
            const dayReqs = getDayRequests(day);
            const totalCells = firstDayOfWeek + days.length;
            const isLastRow = idx >= totalCells - 7;
            return (
              <div
                key={day.toISOString()}
                className={`h-14 border-r p-1.5 relative transition-colors ${!isLastRow ? 'border-b' : ''} ${isVacation ? 'bg-blue-500/10' : 'dark:hover:bg-white/[0.02] hover:bg-black/[0.02]'}`}
                style={{ borderColor: 'var(--border)' }}
                title={dayReqs.map(r => r.reason).join(', ')}
              >
                <span className={`text-xs font-semibold block text-right ${isToday ? 'w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center ml-auto text-[11px]' : 'dark:text-white/50 text-gray-500'}`}>
                  {format(day, 'd')}
                </span>
                {isVacation && (
                  <div className="mt-0.5 h-1 rounded-full bg-blue-500/60 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {requests.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest dark:text-white/30 text-gray-400">Aktuelle Anträge</p>
          {requests.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <div className="text-sm dark:text-white/70 text-gray-700">
                <span className="font-medium">{format(parseISO(r.from), 'dd.MM.yyyy')}</span>
                {' – '}
                <span className="font-medium">{format(parseISO(r.to), 'dd.MM.yyyy')}</span>
              </div>
              {r.reason && <div className="text-xs dark:text-white/40 text-gray-400 truncate">{r.reason}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
