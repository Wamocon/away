'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrganizationsForUser, createOrganization } from '@/lib/organization';
import { getUserRole } from '@/lib/roles';
import InviteUser from '@/components/InviteUser';
import TemplateUpload from '@/components/TemplateUpload';
import { Building2, Plus, ChevronDown, ChevronRight, ShieldCheck, User, LayoutGrid, List } from 'lucide-react';
import { useViewMode } from '@/components/ui/ViewModeProvider';

interface Org { id: string; name: string }

export default function OrganizationsPage() {
  const { viewMode, setViewMode } = useViewMode();
  const [userId, setUserId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadOrgs = useCallback(async (uid: string) => {
    const data = await getOrganizationsForUser(uid);
    const filtered = (data || []).filter((o): o is Org => o !== null);
    setOrgs(filtered);
    const roleMap: Record<string, string> = {};
    await Promise.all(filtered.map(async (org) => {
      try { roleMap[org.id] = await getUserRole(uid, org.id); } catch { roleMap[org.id] = 'user'; }
    }));
    setRoles(roleMap);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      loadOrgs(data.user.id);
    });
  }, [loadOrgs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const newOrg = await createOrganization(userId, newName.trim());
      setOrgs(prev => [...prev, newOrg]);
      setRoles(prev => ({ ...prev, [newOrg.id]: 'admin' }));
      setNewName('');
      setShowCreate(false);
      setExpanded(newOrg.id);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
            <Building2 size={22} style={{ color: 'var(--primary)' }} /> Organisationen
          </h1>
          <p className="text-sm dark:text-white/40 text-gray-500 mt-1">Verwalte deine Organisationen und lade Mitarbeiter ein</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setShowCreate(s => !s)}
            className="btn-primary"
          >
            <Plus size={14} /> Neu
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border p-4 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-sm font-semibold dark:text-white text-gray-800 mb-3">Neue Organisation erstellen</p>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder="Name der Organisation"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--text-base)' }}
              required
            />
            <button type="submit" disabled={creating || !newName.trim()} className="btn-primary px-4 py-2">
              {creating ? '...' : 'Erstellen'}
            </button>
          </form>
          {createError && <p className="text-red-400 text-xs mt-2">{createError}</p>}
        </div>
      )}

      {/* Org list */}
      {orgs.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <Building2 size={32} className="mx-auto mb-3 dark:text-white/20 text-gray-300" />
          <p className="text-sm dark:text-white/40 text-gray-500">Noch keine Organisationen.</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-[var(--primary)] hover:underline">
            Erste Organisation erstellen
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {orgs.map(org => {
            const role = roles[org.id] || 'user';
            const isAdmin = role === 'admin';
            const isOpen = expanded === org.id;
            return (
              <div key={org.id} className="rounded-xl border overflow-hidden transition-all hover:border-[var(--primary)]" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : org.id)}
                  className="w-full flex items-center justify-between px-5 py-4 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] flex items-center justify-center">
                      <Building2 size={14} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold dark:text-white text-gray-800">{org.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isAdmin
                          ? <><ShieldCheck size={10} className="text-[var(--success)]" /><span className="text-[10px] text-[var(--success)] font-bold">Admin</span></>
                          : <><User size={10} className="text-[var(--primary)]" /><span className="text-[10px] text-[var(--primary)] font-bold">Mitarbeiter</span></>
                        }
                      </div>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
                    {isAdmin && (
                      <>
                        <TemplateUpload organizationId={org.id} />
                        <InviteUser organizationId={org.id} />
                      </>
                    )}
                    {!isAdmin && (
                      <p className="text-sm dark:text-white/40 text-gray-500">Du bist Mitglied dieser Organisation.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orgs.map(org => {
            const role = roles[org.id] || 'user';
            const isAdmin = role === 'admin';
            const isOpen = expanded === org.id;
            return (
              <div key={org.id} className="rounded-xl border flex flex-col transition-all hover:shadow-md hover:border-[var(--primary)]" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <div className="p-5 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] flex items-center justify-center shrink-0">
                      <Building2 size={18} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="text-left">
                      <p className="text-base font-bold dark:text-white text-gray-900">{org.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {isAdmin
                          ? <><ShieldCheck size={12} className="text-[var(--success)]" /><span className="text-xs text-[var(--success)] font-bold">Admin</span></>
                          : <><User size={12} className="text-[var(--primary)]" /><span className="text-xs text-[var(--primary)] font-bold">Mitarbeiter</span></>
                        }
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(isOpen ? null : org.id)}
                    className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'btn-ghost'}`}
                  >
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>
                
                {isOpen && (
                  <div className="px-5 pb-5 pt-2 space-y-4 animate-slide-down">
                    <div className="h-px bg-[var(--border)] mb-4" />
                    {isAdmin && (
                      <div className="space-y-4">
                        <TemplateUpload organizationId={org.id} />
                        <InviteUser organizationId={org.id} />
                      </div>
                    )}
                    {!isAdmin && (
                      <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                        <p className="text-xs dark:text-white/50 text-gray-500">Du bist Mitglied dieser Organisation.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
