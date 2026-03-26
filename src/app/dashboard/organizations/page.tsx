'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrganizationsForUser, createOrganization } from '@/lib/organization';
import { getUserRole } from '@/lib/roles';
import InviteUser from '@/components/InviteUser';
import TemplateUpload from '@/components/TemplateUpload';
import { Building2, Plus, ChevronDown, ChevronRight, ShieldCheck, User } from 'lucide-react';

interface Org { id: string; name: string }

export default function OrganizationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      loadOrgs(data.user.id);
    });
  }, []);

  const loadOrgs = async (uid: string) => {
    const data = await getOrganizationsForUser(uid);
    const filtered = (data || []).filter((o): o is Org => o !== null);
    setOrgs(filtered);
    const roleMap: Record<string, string> = {};
    await Promise.all(filtered.map(async (org) => {
      try { roleMap[org.id] = await getUserRole(uid, org.id); } catch { roleMap[org.id] = 'user'; }
    }));
    setRoles(roleMap);
  };

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
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900 flex items-center gap-2">
            <Building2 size={22} className="text-blue-500" /> Organisationen
          </h1>
          <p className="text-sm dark:text-white/40 text-gray-500 mt-1">Verwalte deine Organisationen und lade Mitarbeiter ein</p>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
        >
          <Plus size={13} /> Neu
        </button>
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
            <button type="submit" disabled={creating || !newName.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
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
          <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-blue-500 hover:underline">
            Erste Organisation erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map(org => {
            const role = roles[org.id] || 'user';
            const isAdmin = role === 'admin';
            const isOpen = expanded === org.id;
            return (
              <div key={org.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : org.id)}
                  className="w-full flex items-center justify-between px-5 py-4 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <Building2 size={14} className="text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold dark:text-white text-gray-800">{org.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isAdmin
                          ? <><ShieldCheck size={10} className="text-green-500" /><span className="text-[10px] text-green-500 font-medium">Admin</span></>
                          : <><User size={10} className="text-blue-400" /><span className="text-[10px] text-blue-400 font-medium">Mitarbeiter</span></>
                        }
                      </div>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown size={14} className="dark:text-white/30 text-gray-400" /> : <ChevronRight size={14} className="dark:text-white/30 text-gray-400" />}
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
      )}
    </div>
  );
}
