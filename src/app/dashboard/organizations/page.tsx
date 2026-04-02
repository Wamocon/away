'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrganizationsForUser, createOrganization } from '@/lib/organization';
import { getUserRole } from '@/lib/roles';
import InviteUser from '@/components/InviteUser';
import TemplateUpload from '@/components/TemplateUpload';
import { Building2, Plus, ShieldCheck, User, LayoutGrid, List, Upload, X } from 'lucide-react';
import { useViewMode } from '@/components/ui/ViewModeProvider';

interface Org { id: string; name: string }

/** Wiederverwendbares Modal-Overlay */
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {children}
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  const { viewMode, setViewMode } = useViewMode();
  const [userId, setUserId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [uploadingOrgId, setUploadingOrgId] = useState<string | null>(null);

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
      setSelectedOrg(newOrg);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 w-full animate-fade-in">
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
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            <Plus size={14} /> Neu
          </button>
        </div>
      </div>

      {/* Org list / grid */}
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
            return (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className="w-full rounded-xl border text-left px-5 py-4 flex items-center gap-3 transition-all hover:border-[var(--primary)] hover:shadow-md"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] flex items-center justify-center shrink-0">
                  <Building2 size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold dark:text-white text-gray-800 truncate">{org.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isAdmin
                      ? <><ShieldCheck size={10} className="text-[var(--success)]" /><span className="text-[10px] text-[var(--success)] font-bold">Admin</span></>
                      : <><User size={10} className="text-[var(--primary)]" /><span className="text-[10px] text-[var(--primary)] font-bold">Mitarbeiter</span></>
                    }
                  </div>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">Details â†’</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orgs.map(org => {
            const role = roles[org.id] || 'user';
            const isAdmin = role === 'admin';
            return (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className="rounded-xl border flex items-start gap-3 p-5 text-left transition-all hover:shadow-md hover:border-[var(--primary)] w-full"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] flex items-center justify-center shrink-0">
                  <Building2 size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold dark:text-white text-gray-900 truncate">{org.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {isAdmin
                      ? <><ShieldCheck size={12} className="text-[var(--success)]" /><span className="text-xs text-[var(--success)] font-bold">Admin</span></>
                      : <><User size={12} className="text-[var(--primary)]" /><span className="text-xs text-[var(--primary)] font-bold">Mitarbeiter</span></>
                    }
                  </div>
                  <p className="text-[11px] mt-2 text-[var(--text-muted)]">Klicken fÃ¼r Details</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* === Modal: Organisation erstellen === */}
      {showCreate && (
        <Modal onClose={() => { setShowCreate(false); setCreateError(null); setNewName(''); }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-base)' }}>Neue Organisation erstellen</h2>
            <button onClick={() => { setShowCreate(false); setCreateError(null); setNewName(''); }} className="btn-ghost p-1.5 rounded-lg">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Name der Organisation</label>
              <input
                type="text"
                placeholder="z.B. Acme GmbH"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--text-base)' }}
                autoFocus
                required
              />
            </div>
            {createError && <p className="text-red-400 text-xs">{createError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCreate(false); setCreateError(null); setNewName(''); }} className="btn-secondary flex-1">Abbrechen</button>
              <button type="submit" disabled={creating || !newName.trim()} className="btn-primary flex-1">
                {creating ? 'Erstelle...' : 'Erstellen'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* === Modal: Organisation Details === */}
      {selectedOrg && (
        <Modal onClose={() => setSelectedOrg(null)}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary-light)] flex items-center justify-center">
                <Building2 size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-base)' }}>{selectedOrg.name}</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {roles[selectedOrg.id] === 'admin' ? 'Administrator' : 'Mitglied'}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedOrg(null)} className="btn-ghost p-1.5 rounded-lg">
              <X size={16} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {roles[selectedOrg.id] === 'admin' ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setUploadingOrgId(selectedOrg.id); setSelectedOrg(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--primary-light)] text-xs font-semibold rounded-xl border transition-all"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Upload size={13} /> Vorlage hochladen
                  </button>
                </div>
                <div className="pt-2">
                  <InviteUser organizationId={selectedOrg.id} />
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Du bist Mitglied dieser Organisation.</p>
            )}
          </div>
        </Modal>
      )}

      {uploadingOrgId && (
        <TemplateUpload
          organizationId={uploadingOrgId}
          isOpen={!!uploadingOrgId}
          onClose={() => setUploadingOrgId(null)}
          onSuccess={() => { setUploadingOrgId(null); if (userId) loadOrgs(userId); }}
        />
      )}
    </div>
  );
}
