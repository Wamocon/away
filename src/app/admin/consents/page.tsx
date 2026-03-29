'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrganizationConsents, ConsentType } from '@/lib/legal';
import { ShieldCheck, User, CheckCircle, XCircle, Clock, Search, Filter, ShieldAlert } from 'lucide-react';
import { getOrganizationsForUser } from '@/lib/organization';

type UserConsentStatus = {
  user_id: string;
  role: string;
  consents: {
    agb: boolean;
    privacy: boolean;
    dsgvo: boolean;
    version?: string;
    accepted_at?: string;
  };
};

export default function AdminConsentsPage() {
  const [data, setData] = useState<UserConsentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const orgs = await getOrganizationsForUser(user.id);
      if (orgs.length === 0) return;
      const currentOrg = orgs[0] as { id: string; name: string };
      setOrg(currentOrg);

      const { users, consents } = await getOrganizationConsents(currentOrg.id);

      const status = users.map(u => {
        const userConsents = consents.filter(c => c.user_id === u.user_id);
        const hasAgb = userConsents.some(c => c.consent_type === 'agb');
        const hasPrivacy = userConsents.some(c => c.consent_type === 'privacy');
        const hasDsgvo = userConsents.some(c => c.consent_type === 'dsgvo');
        
        return {
          user_id: u.user_id,
          role: u.role,
          consents: {
            agb: hasAgb,
            privacy: hasPrivacy,
            dsgvo: hasDsgvo,
            version: userConsents[0]?.version,
            accepted_at: userConsents[0]?.accepted_at
          }
        };
      });

      setData(status);
    } catch (err) {
      setError('Fehler beim Laden der Zustimmungsdaten.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = data.filter(d => d.user_id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3 text-[var(--text-base)]">
            <ShieldCheck size={28} className="text-[var(--primary)]" />
            Rechtszustimmungen & Compliance
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Audit-Übersicht für Organisation: <span className="font-bold text-[var(--primary)]">{org?.name}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Benutzer-ID suchen..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] transition-all outline-none w-64"
            />
          </div>
          <button onClick={loadData} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-all">
            <Clock size={18} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 flex items-center gap-4 border-l-4 border-l-[var(--success)] shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[var(--success-light)] flex items-center justify-center text-[var(--success)]">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Vollständig</p>
            <p className="text-2xl font-black text-[var(--text-base)]">{data.filter(d => d.consents.agb && d.consents.privacy && d.consents.dsgvo).length}</p>
          </div>
        </div>
        
        <div className="card p-6 flex items-center gap-4 border-l-4 border-l-[var(--warning)] shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[var(--warning-light)] flex items-center justify-center text-[var(--warning)]">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Unvollständig (Bestand)</p>
            <p className="text-2xl font-black text-[var(--text-base)]">{data.filter(d => !d.consents.agb || !d.consents.privacy || !d.consents.dsgvo).length}</p>
          </div>
        </div>

        <div className="card p-6 flex items-center gap-4 border-l-4 border-l-[var(--primary)] shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)]">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Geprüfte Version</p>
            <p className="text-2xl font-black text-[var(--text-base)]">V1.0</p>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="card overflow-hidden shadow-xl border-[var(--border)]">
        {loading ? (
          <div className="p-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-[var(--text-muted)]">Audit-Daten werden abgerufen...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center text-[var(--text-muted)]">
            <ShieldAlert size={40} className="mx-auto mb-4 opacity-20" />
            <p>Keine Benutzerdaten zur Auswertung gefunden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Benutzer / Rolle</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-center text-[var(--text-muted)]">AGB</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-center text-[var(--text-muted)]">Datenschutz</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-center text-[var(--text-muted)]">DSGVO</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Zustimmungszeitpunkt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(d => {
                  const isComplete = d.consents.agb && d.consents.privacy && d.consents.dsgvo;
                  return (
                    <tr key={d.user_id} className="hover:bg-[var(--bg-surface)] transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] group-hover:scale-110 transition-transform">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[var(--text-base)]">{d.user_id.split('-')[0]}...</p>
                            <p className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-wider">{d.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {d.consents.agb ? <CheckCircle size={18} className="text-[var(--success)] mx-auto" /> : <XCircle size={18} className="text-[var(--danger)] mx-auto opacity-20" />}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {d.consents.privacy ? <CheckCircle size={18} className="text-[var(--success)] mx-auto" /> : <XCircle size={18} className="text-[var(--danger)] mx-auto opacity-20" />}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {d.consents.dsgvo ? <CheckCircle size={18} className="text-[var(--success)] mx-auto" /> : <XCircle size={18} className="text-[var(--danger)] mx-auto opacity-20" />}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          isComplete ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--warning-light)] text-[var(--warning)]'
                        }`}>
                          {isComplete ? 'Vollständig' : 'Unvollständig'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right font-medium text-xs text-[var(--text-muted)] tabular-nums">
                        {d.consents.accepted_at ? new Date(d.consents.accepted_at).toLocaleString('de-DE') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
        <ShieldCheck size={20} className="text-blue-500 mt-1" />
        <div>
          <p className="text-sm font-bold text-blue-500">Hinweis zum Audit-Status</p>
          <p className="text-xs text-blue-500/70 mt-1 leading-relaxed">
            Als "Unvollständig" markierte Konten betreffen in der Regel Bestandsnutzer, die vor Einführung der digitalen Pflichtzustimmung registriert wurden. 
            Diese Konten wurden aus Gründen der Stabilität nicht rückwirkend migriert (Rollout-Entscheidung). Neue Nutzer müssen zwingend zustimmen.
          </p>
        </div>
      </div>
    </div>
  );
}
