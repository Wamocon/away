'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getOrganizationsForUser } from '@/lib/organization';
import { getUserRole, updateUserRole, UserRole, ROLE_LABELS, ROLE_COLORS } from '@/lib/roles';
import { getOrgMembersWithEmails } from '@/lib/actions/adminActions';
import {
  Users, ShieldCheck, UserPlus, Loader, CheckCircle,
  Trash2, Send, Building2, AlertCircle, RefreshCw, LayoutGrid, List,
  FileText, Upload, Files
} from 'lucide-react';
import { useViewMode } from '@/components/ui/ViewModeProvider';

interface Template {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx';
  storage_path: string;
}

interface OrgMember {
  user_id: string;
  role: UserRole;
  email?: string;
  created_at: string;
}

export default function AdminPage() {
  const { viewMode, setViewMode } = useViewMode();
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Einladung
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('employee');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Tab-Management
  const [activeTab, setActiveTab] = useState<'users' | 'templates'>('users');

  // Vorlagen
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Rollenänderung
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return; }
      setCurrentUserId(data.user.id);

      const orgs = await getOrganizationsForUser(data.user.id);
      if (orgs.length === 0) return;
      const org = orgs[0] as { id: string; name: string };
      
      // Nur Admins dürfen auf diese Seite
      const role = await getUserRole(data.user.id, org.id).catch(() => null);
      if (role !== 'admin') { router.push('/dashboard'); return; }

      setOrgId(org.id);
      setOrgName(org.name);
    });
  }, [router]);

  const loadMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // Nutzt die neue Server Action statt clientseitige Admin-Calls (behebt 403)
      const data = await getOrgMembersWithEmails(orgId);
      setMembers(data as OrgMember[]);
    } catch (err) {
      console.error('Fehler beim Laden der Mitglieder:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadTemplates = useCallback(async () => {
    if (!orgId) return;
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('document_templates')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      setTemplates((data as Template[]) || []);
    } catch { /* ignorieren */ }
  }, [orgId]);

  useEffect(() => { 
    if (orgId) {
      loadMembers();
      loadTemplates();
    }
  }, [orgId, loadMembers, loadTemplates]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !inviteEmail) return;
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const supabase = createClient();
      // Einladung via Supabase auth (benötigt ggf. ebenfalls Admin-API, hier Client-Fallback)
      const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
        data: { organization_id: orgId, role: inviteRole },
        redirectTo: `${window.location.origin}/auth/accept-invite?org=${orgId}&role=${inviteRole}`,
      });
      
      if (error) throw error;
      setInviteSuccess(`Einladung an ${inviteEmail} gesendet!`);
      setInviteEmail('');
      loadMembers(); // Liste aktualisieren
    } catch (err) {
      setInviteError(`Supabase Admin-Rechte erforderlich. Einladungs-URL: ${window.location.origin}/invite?org=${orgId}&role=${inviteRole}`);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    if (!orgId) return;
    setUpdatingRole(memberId);
    try {
      await updateUserRole(memberId, orgId, newRole);
      setMembers(prev => prev.map(m => m.user_id === memberId ? { ...m, role: newRole } : m));
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!orgId || !confirm('Benutzer wirklich entfernen?')) return;
    const supabase = createClient();
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', memberId)
      .eq('organization_id', orgId);
    setMembers(prev => prev.filter(m => m.user_id !== memberId));
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'xlsx'].includes(ext || '')) {
      setUploadError('Nur PDF, DOCX und XLSX werden unterstützt');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const supabase = createClient();
      const path = `${orgId}/${Date.now()}_${file.name}`;
      
      const { error: storageError } = await supabase.storage
        .from('templates')
        .upload(path, file);
      if (storageError) throw storageError;

      const { data, error: dbError } = await supabase
        .from('document_templates')
        .insert([{
          name: file.name.replace(`.${ext}`, ''),
          type: ext as 'pdf' | 'docx' | 'xlsx',
          storage_path: path,
          organization_id: orgId
        }])
        .select()
        .single();
      if (dbError) throw dbError;

      setTemplates(prev => [data as Template, ...prev]);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveTemplate = async (template: Template) => {
    if (!confirm(`Vorlage "${template.name}" wirklich löschen?`)) return;
    const supabase = createClient();
    await supabase.storage.from('templates').remove([template.storage_path]);
    await supabase.from('document_templates').delete().eq('id', template.id);
    setTemplates(prev => prev.filter(t => t.id !== template.id));
  };

  const stats = useMemo(() => ({
    total: members.length,
    admins: members.filter(m => m.role === 'admin').length,
    approvers: members.filter(m => m.role === 'approver').length,
    employees: members.filter(m => m.role === 'employee').length,
    templates: templates.length,
  }), [members, templates]);

  return (
    <div className="p-6 md:p-8 w-full animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
            <ShieldCheck size={22} style={{ color: 'var(--primary)' }} />
            Administration
          </h1>
          <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Building2 size={12} /> {orgName}
          </p>
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
          <button onClick={loadMembers} className="btn-secondary shrink-0">
            <RefreshCw size={13} /> Aktualisieren
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Mitglieder gesamt', value: stats.total, color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: 'Administratoren', value: stats.admins, color: 'var(--danger)', bg: 'var(--danger-light)' },
          { label: 'Genehmiger', value: stats.approvers, color: 'var(--warning)', bg: 'var(--warning-light)' },
          { label: 'Mitarbeiter', value: stats.employees, color: 'var(--success)', bg: 'var(--success-light)' },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="p-2 rounded-xl inline-flex mb-2" style={{ background: s.bg }}>
              <Users size={16} style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--text-base)' }}>{s.value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-[var(--bg-elevated)] rounded-xl border w-fit" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'users' ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-base)]'
          }`}
        >
          <Users size={14} /> Benutzer
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'templates' ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-base)]'
          }`}
        >
          <Files size={14} /> Vorlagen
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Haupt-Inhalt */}
        <div className="lg:col-span-2">
          {activeTab === 'users' ? (
            <div className="card overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>
                  Benutzerverwaltung
                </h2>
                <span className="badge badge-primary">{stats.total} Mitglieder</span>
              </div>

              {loading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Noch keine Mitglieder</p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Benutzer</th>
                        <th>Rolle</th>
                        <th>Seit</th>
                        <th>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(m => (
                        <tr key={m.user_id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] flex items-center justify-center text-white font-bold text-xs shrink-0">
                                {(m.email || m.user_id || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium truncate max-w-[150px]" style={{ color: 'var(--text-base)' }}>
                                  {m.email || m.user_id.slice(0, 8) + '...'}
                                </p>
                                {m.user_id === currentUserId && (
                                  <span className="text-[9px] font-bold" style={{ color: 'var(--primary)' }}>Du</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="relative">
                              <select
                                value={m.role}
                                onChange={e => handleRoleChange(m.user_id, e.target.value as UserRole)}
                                disabled={updatingRole === m.user_id || m.user_id === currentUserId}
                                className="text-xs rounded-lg px-2 py-1.5 pr-6 border appearance-none cursor-pointer disabled:opacity-50"
                                style={{
                                  background: 'var(--bg-elevated)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-base)',
                                }}
                              >
                                <option value="admin">Administrator</option>
                                <option value="approver">Genehmiger</option>
                                <option value="employee">Mitarbeiter</option>
                              </select>
                              {updatingRole === m.user_id && (
                                <Loader size={10} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--primary)' }} />
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {new Date(m.created_at).toLocaleDateString('de-DE')}
                            </span>
                          </td>
                          <td>
                            {m.user_id !== currentUserId && (
                              <button
                                onClick={() => handleRemoveMember(m.user_id)}
                                className="btn-ghost p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
                                title="Entfernen"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                   {members.map(m => (
                     <div key={m.user_id} className="border p-4 rounded-xl flex flex-col gap-3 relative transition-all hover:shadow-md" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                       <div className="flex justify-between items-start">
                         <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] flex items-center justify-center text-white font-bold text-sm shrink-0">
                               {(m.email || m.user_id || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                               <p className="text-sm font-medium truncate max-w-[150px]" style={{ color: 'var(--text-base)' }}>
                                 {m.email || m.user_id.slice(0, 8) + '...'}
                               </p>
                               {m.user_id === currentUserId && (
                                 <span className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>Du</span>
                               )}
                            </div>
                         </div>
                         {m.user_id !== currentUserId && (
                            <button
                              onClick={() => handleRemoveMember(m.user_id)}
                              className="btn-ghost p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
                              title="Entfernen"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                       </div>
                       <div className="flex justify-between items-center mt-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                         <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Seit {new Date(m.created_at).toLocaleDateString('de-DE')}
                         </span>
                         <div className="relative">
                            <select
                              value={m.role}
                              onChange={e => handleRoleChange(m.user_id, e.target.value as UserRole)}
                              disabled={updatingRole === m.user_id || m.user_id === currentUserId}
                              className="text-xs font-semibold rounded-lg px-2 py-1.5 pr-6 border appearance-none cursor-pointer disabled:opacity-50"
                              style={{
                                background: 'var(--bg-elevated)',
                                borderColor: 'var(--border)',
                                color: 'var(--text-base)',
                              }}
                            >
                              <option value="admin">Administrator</option>
                              <option value="approver">Genehmiger</option>
                              <option value="employee">Mitarbeiter</option>
                            </select>
                            {updatingRole === m.user_id && (
                              <Loader size={10} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--primary)' }} />
                            )}
                         </div>
                       </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>
                    Dokument-Vorlagen
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    PDF, Word oder Excel Anträge verwalten
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id="template-upload"
                    className="hidden"
                    onChange={handleTemplateUpload}
                    accept=".pdf,.docx,.xlsx"
                  />
                  <label
                    htmlFor="template-upload"
                    className="btn-primary cursor-pointer"
                  >
                    {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                    Hochladen
                  </label>
                </div>
              </div>

              {uploadError && <div className="p-3 bg-[var(--danger-light)] text-[var(--danger)] text-xs rounded-xl mb-4">{uploadError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(t => (
                  <div key={t.id} className="p-3 rounded-xl border flex items-center justify-between group transition-all hover:border-[var(--primary)]" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        t.type === 'pdf' ? 'bg-red-500/10 text-red-500' :
                        t.type === 'xlsx' ? 'bg-green-500/10 text-green-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-base)' }}>{t.name}</p>
                        <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--text-subtle)' }}>{t.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTemplate(t)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="col-span-2 text-center py-10 opacity-30">
                    <Files size={32} className="mx-auto mb-2" />
                    <p className="text-sm font-medium">Noch keine Vorlagen</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Einladungs-Panel */}
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
              <UserPlus size={15} style={{ color: 'var(--primary)' }} />
              Benutzer einladen
            </h2>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>E-Mail-Adresse</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="kollege@firma.de"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Rolle zuweisen</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                >
                  <option value="employee">Mitarbeiter</option>
                  <option value="approver">Genehmiger</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {inviteSuccess && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg text-xs" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                  <CheckCircle size={13} className="shrink-0 mt-0.5" />
                  {inviteSuccess}
                </div>
              )}
              {inviteError && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg text-xs" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span className="break-all">{inviteError}</span>
                </div>
              )}

              <button type="submit" disabled={inviting} className="btn-primary w-full justify-center">
                {inviting ? <Loader size={13} className="animate-spin" /> : <Send size={13} />}
                {inviting ? 'Sende Einladung...' : 'Einladung senden'}
              </button>
            </form>
          </div>

          {/* Rollen-Legende */}
          <div className="card p-5">
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-base)' }}>Rollen-Übersicht</h2>
            <div className="space-y-2.5">
              {([
                { role: 'admin', desc: 'Vollzugriff, Benutzerverwaltung, alle Anträge genehmigen' },
                { role: 'approver', desc: 'Anträge genehmigen und ablehnen' },
                { role: 'employee', desc: 'Anträge einreichen und eigene anzeigen' },
              ] as { role: UserRole; desc: string }[]).map(({ role: r, desc }) => (
                <div key={r} className="flex items-start gap-2">
                  <span className={`badge badge shrink-0 mt-0.5 ${ROLE_COLORS[r]}`}>
                    {ROLE_LABELS[r]}
                  </span>
                  <p className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
