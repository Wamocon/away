'use client';
import { ClipboardList, FileBarChart, PieChart, TrendingUp, Calendar, Users } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto animate-fade-in space-y-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <FileBarChart size={24} className="text-[var(--primary)]" /> Berichte & Auswertungen
          </h1>
          <p className="text-sm mt-1 text-[var(--text-muted)]">
            Übersicht über genutzte Urlaubstage und Trends in der Organisation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder KPI - Total Days */}
        <div className="card p-6 border-l-4 border-[var(--primary)]">
          <div className="flex items-center gap-3 mb-4 text-[var(--text-muted)] uppercase text-[10px] font-black tracking-widest">
            <Calendar size={14} /> Total Urlaubstage
          </div>
          <div className="text-3xl font-black">248</div>
          <p className="text-[10px] mt-2 text-[var(--success)] font-bold">+12% zum Vorjahr</p>
        </div>

        {/* Placeholder KPI - Active Employees */}
        <div className="card p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-4 text-[var(--text-muted)] uppercase text-[10px] font-black tracking-widest">
            <Users size={14} /> Aktive Mitarbeiter
          </div>
          <div className="text-3xl font-black">12</div>
          <p className="text-[10px] mt-2 text-[var(--text-subtle)] font-bold">In deiner Organisation</p>
        </div>

        {/* Placeholder KPI - Pending Approval */}
        <div className="card p-6 border-l-4 border-amber-500">
          <div className="flex items-center gap-3 mb-4 text-[var(--text-muted)] uppercase text-[10px] font-black tracking-widest">
            <ClipboardList size={14} /> Wartend
          </div>
          <div className="text-3xl font-black">4</div>
          <p className="text-[10px] mt-2 text-amber-500 font-bold">Dringende Bearbeitung nötig</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Statistics Chart Placeholder */}
        <div className="card p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
            <PieChart size={48} className="text-[var(--primary)] opacity-20 mb-4" />
            <h3 className="text-sm font-bold opacity-60">Verteilung nach Urlaubsart</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mt-2 italic">Hier werden in Kürze detaillierte Diagramme zur Verteilung von bezahltem, unbezahltem Urlaub und Freizeitausgleich angezeigt.</p>
        </div>

        {/* Trend Chart Placeholder */}
        <div className="card p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
            <TrendingUp size={48} className="text-emerald-500 opacity-20 mb-4" />
            <h3 className="text-sm font-bold opacity-60">Auslastungs-Trends</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mt-2 italic">Analysiere, in welchen Monaten die meisten Urlaubsanträge gestellt werden, um die Kapazitäten besser zu planen.</p>
        </div>
      </div>
    </div>
  );
}
