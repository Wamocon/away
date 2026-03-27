'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toggleUserRoleAction } from '@/lib/actions/debugActions';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

/**
 * SchemaRoleSwitcher - 1:1 Visuell exakt wie TeamRadar.
 * Positioniert am Ende der Sidebar vor dem Theme-Switcher.
 */
export default function SchemaRoleSwitcher() {
  const [currentSchema, setCurrentSchema] = useState('');
  const [currentRole, setCurrentRole] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    const schema = process.env.NEXT_PUBLIC_SCHEMA || 'away-dev';
    setCurrentSchema(schema);

    const checkRole = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: orgs } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('organization_id', { ascending: true });
        
        setCurrentRole(orgs?.[0]?.role || 'employee');
      } catch (err) {
        console.error('Debug Role Check failed:', err);
      }
    };

    checkRole();
  }, []);

  const handleToggle = async (newRole: string) => {
    if (newRole === currentRole || switching) return;
    setSwitching(newRole);
    setMessage(null);
    try {
      // Server Action mit Service Role Key
      const result = await toggleUserRoleAction(newRole);
      if (result.success) {
        setCurrentRole(result.newRole);
        setMessage({ type: 'success', text: `Rolle zu ${result.newRole} gewechselt.` });
        // Refresh nach Erfolg
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Toggle Error:', err);
      setMessage({ type: 'error', text: errorMsg || 'Fehler beim Wechsel' });
    } finally {
      setSwitching(null);
    }
  };

  if (!mounted) return null;

  const roles = [
    { id: 'admin', label: 'Admin' },
    { id: 'cio', label: 'CIO' },
    { id: 'department_lead', label: 'Ltg.' },
    { id: 'employee', label: 'Mitarb.' },
  ];

  return (
    <div className="mb-2 px-3 flex flex-col gap-2">
      {/* Toast-Nachricht (Schwebend über dem Switcher) */}
      {message && (
        <div className={`fixed bottom-24 left-6 right-6 md:right-auto md:w-[230px] px-3 py-2 rounded-xl text-[10px] font-bold shadow-2xl border z-[99999] animate-in slide-in-from-bottom-4 fade-in duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-500 text-white border-emerald-400' 
            : 'bg-rose-500 text-white border-rose-400 font-mono italic text-[9px]'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            <span className="truncate">{message.text}</span>
          </div>
        </div>
      )}

      {/* TeamRadar 1:1 Design Box */}
      <div className="p-0.5 rounded-xl bg-blue-500/5 border border-blue-500/10 flex flex-col gap-1 p-2">
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="text-[8px] font-black text-blue-500/50 uppercase tracking-[0.2em]">Dev: Role Switch</div>
          <div className="text-[7px] font-mono text-blue-500/30 uppercase opacity-50">{currentSchema}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-1">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => handleToggle(r.id)}
              disabled={!!switching}
              className={`py-1.5 rounded text-[10px] font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1 ${
                currentRole === r.id 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-blue-500/40 hover:bg-blue-500/10 hover:text-blue-500/60'
              } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {switching === r.id && <Loader2 size={10} className="animate-spin" />}
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
