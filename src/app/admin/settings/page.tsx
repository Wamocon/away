"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  updateOrganizationName,
} from "@/lib/organization";
import {
  updateUserRole,
  UserRole,
  ROLE_LABELS,
  ROLE_COLORS,
} from "@/lib/roles";
import {
  getOrgMembersWithEmails,
  inviteUserToOrg,
  getAllAuthUsers,
  assignUsersToOrg,
  getMemberSettings,
  updateMemberSettings,
} from "@/lib/actions/adminActions";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  getApproverEmails,
  updateApproverEmails,
  ApproverEmail,
} from "@/lib/admin";
import { assignApproverToUsers } from "@/lib/actions/adminActions";
import { useActiveOrg } from "@/components/ui/ActiveOrgProvider";
import { useToast } from "@/components/ui/ToastProvider";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { SystemTab } from "@/components/admin/SystemTab";
import {
  Users,
  ShieldCheck,
  UserPlus,
  Loader,
  CheckCircle,
  Trash2,
  Send,
  Building2,
  AlertCircle,
  FileText,
  Files,
  Settings,
  Info,
  Briefcase,
  Zap,
  Palette,
  MapPin,
  Plus,
  Monitor,
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/ui/AlertModal";

interface Template {
  id: string;
  name: string;
  type: "pdf" | "docx" | "xlsx";
  storage_path: string;
}

interface OrgMember {
  user_id: string;
  role: UserRole;
  email?: string;
  created_at: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { currentOrgId, currentOrg, switchOrg, userId: activeUserId, reload: reloadOrgs } = useActiveOrg();
  const { showSuccess, showError, showInfo } = useToast();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [newName, setNewName] = useState("");
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<
    | "general"
    | "company"
    | "policies"
    | "users"
    | "approvers"
    | "templates"
    | "organizations"
    | "integrations"
    | "system"
  >("general");

  // New Organization Settings States
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [companyWorkDays, setCompanyWorkDays] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);
  const [holidayRegion, setHolidayRegion] = useState("BY"); // Default: Bayern
  const [autoApproveLimit, setAutoApproveLimit] = useState(0); // 0 = disabled

  // Invitation
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("employee");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Role management
  const [, setUpdatingRole] = useState<string | null>(null);
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Bug 10/11: Alle Auth-User anzeigen und zuweisen
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; created_at: string; isInOrg: boolean }[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<UserRole>("employee");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Inline Mitarbeiter-Einstellungen bearbeiten (Bug 2)
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [memberSettings, setMemberSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [loadingMemberSettings, setLoadingMemberSettings] = useState<string | null>(null);
  const [savingMemberSettings, setSavingMemberSettings] = useState<string | null>(null);

  // Genehmiger-Verwaltung
  const [approverEmails, setApproverEmails] = useState<ApproverEmail[]>([]);
  const [newApproverName, setNewApproverName] = useState("");
  const [newApproverEmail, setNewApproverEmail] = useState("");
  const [savingApprovers, setSavingApprovers] = useState(false);
  // Massenzuordnung
  const [selectedApproverEmail, setSelectedApproverEmail] = useState("");
  const [assignTargetUserIds, setAssignTargetUserIds] = useState<Set<string>>(new Set());
  const [assigningApprover, setAssigningApprover] = useState(false);

  // Modal control
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    onConfirm: () => void;
    hideCancel?: boolean;
    loading?: boolean;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = (
    title: string,
    message: string | React.ReactNode,
    onConfirm: () => void,
    type: "warning" | "danger" = "warning",
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: async () => {
        await onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
        return;
      }
      setCurrentUserId(data.user.id);
    });
  }, [router]);

  // Aktive Org aus dem globalen Context übernehmen (persistiert in localStorage)
  useEffect(() => {
    if (currentOrgId) {
      setOrgId(currentOrgId);
      setOrgName(currentOrg?.name ?? "");
    }
  }, [currentOrgId, currentOrg]);

  const loadOrgSettings = useCallback(async (id: string) => {
    try {
      const settings = await getOrganizationSettings(id);
      if (settings.logoUrl) setLogoUrl(settings.logoUrl as string);
      if (settings.address) setAddress(settings.address as string);
      if (settings.primaryColor)
        setPrimaryColor(settings.primaryColor as string);
      if (settings.workDays) setCompanyWorkDays(settings.workDays as number[]);
      if (settings.holidayRegion)
        setHolidayRegion(settings.holidayRegion as string);
      if (settings.autoApproveLimit !== undefined)
        setAutoApproveLimit(settings.autoApproveLimit as number);
      const approvers = await getApproverEmails(id);
      setApproverEmails(approvers);
      if (approvers.length > 0) setSelectedApproverEmail(approvers[0].email);
    } catch (err) {
      console.error("Fehler beim Laden der Orga-Settings:", err);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const result = await getOrgMembersWithEmails(orgId);
      if (result.error) {
        setInviteError(result.error);
        return;
      }
      setMembers((result.data as OrgMember[]) || []);
    } catch {
      setInviteError(
        "Ein interner Fehler ist beim Laden der Mitglieder aufgetreten.",
      );
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadTemplates = useCallback(async () => {
    if (!orgId) return;
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      setTemplates((data as Template[]) || []);
    } catch {
      /* ignore */
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      loadMembers();
      loadTemplates();
      loadOrgSettings(orgId);
      setNewName(orgName);
    }
  }, [orgId, orgName, loadMembers, loadTemplates, loadOrgSettings]);

  const toggleCompanyWorkDay = (day: number) => {
    setCompanyWorkDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  const handleUpdateOrgSettings = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orgId) return;
    setIsSavingOrg(true);
    try {
      if (newName && newName !== orgName) {
        await updateOrganizationName(orgId, newName);
        setOrgName(newName);
        reloadOrgs(); // ActiveOrgProvider-Liste aktualisieren
      }

      await updateOrganizationSettings(orgId, {
        logoUrl,
        address,
        primaryColor,
        workDays: companyWorkDays,
        holidayRegion,
        autoApproveLimit,
      });

      showSuccess("Organisationseinstellungen erfolgreich gespeichert.");
    } catch (err) {
      showError("Beim Speichern ist ein Problem aufgetreten: " + (err as Error).message);
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !inviteEmail) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const result = await inviteUserToOrg(
        inviteEmail,
        orgId,
        inviteRole,
        window.location.origin,
      );
      if (result.error) {
        setInviteError(result.error);
        showError(result.error);
      } else {
        setInviteSuccess(`Einladung an ${inviteEmail} gesendet!`);
        showSuccess(`Einladung an ${inviteEmail} gesendet!`);
        setInviteEmail("");
        loadMembers();
      }
    } catch {
      setInviteError("Server-Fehler bei Einladung.");
      showError("Server-Fehler bei Einladung.");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    if (!orgId) return;
    setUpdatingRole(memberId);
    try {
      await updateUserRole(memberId, orgId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.user_id === memberId ? { ...m, role: newRole } : m)),
      );
      showSuccess(`Rolle auf "${ROLE_LABELS[newRole]}" aktualisiert.`);
    } catch (err) {
      showError("Rolle konnte nicht aktualisiert werden: " + (err as Error).message);
    } finally {
      setUpdatingRole(null);
    }
  };

  // Bug 10/11: Alle Auth-Benutzer laden
  const loadAllUsers = async () => {
    if (!orgId) return;
    setLoadingAllUsers(true);
    setBulkError("");
    try {
      const result = await getAllAuthUsers(orgId);
      if (result.error) {
        setBulkError(result.error);
        showError(result.error);
      } else {
        setAllUsers(result.data ?? []);
        setShowAllUsers(true);
        showInfo(`${result.data?.length ?? 0} Benutzer geladen.`);
      }
    } finally {
      setLoadingAllUsers(false);
    }
  };

  // Inline-Bearbeitung: Einstellungen eines Mitglieds laden/einblenden
  const handleExpandMember = async (userId: string) => {
    if (expandedMember === userId) {
      setExpandedMember(null);
      return;
    }
    if (!orgId) return;
    setExpandedMember(userId);
    if (memberSettings[userId]) return; // bereits geladen

    setLoadingMemberSettings(userId);
    try {
      const result = await getMemberSettings(userId, orgId);
      if (result.data) {
        setMemberSettings((prev) => ({ ...prev, [userId]: result.data! }));
      }
    } catch {
      showError("Mitarbeiter-Einstellungen konnten nicht geladen werden.");
    } finally {
      setLoadingMemberSettings(null);
    }
  };

  const handleSaveMemberSettings = async (userId: string) => {
    if (!orgId) return;
    setSavingMemberSettings(userId);
    try {
      const result = await updateMemberSettings(userId, orgId, memberSettings[userId] || {});
      if (result.error) {
        showError("Speichern fehlgeschlagen: " + result.error);
      } else {
        showSuccess("Mitarbeiter-Einstellungen gespeichert.");
      }
    } finally {
      setSavingMemberSettings(null);
    }
  };

  const updateLocalMemberSetting = (userId: string, key: string, value: unknown) => {
    setMemberSettings((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [key]: value },
    }));
  };

  const handleBulkAssign = async () => {
    if (!orgId || selectedUserIds.size === 0) return;
    setBulkAssigning(true);
    setBulkError("");
    setBulkSuccess("");
    try {
      const result = await assignUsersToOrg(
        Array.from(selectedUserIds),
        orgId,
        bulkRole,
      );
      if (result.error) {
        setBulkError(result.error);
        showError(result.error);
      } else {
        const msg = `${result.count} Benutzer erfolgreich zugewiesen.`;
        setBulkSuccess(msg);
        showSuccess(msg);
        setSelectedUserIds(new Set());
        loadMembers();
        await loadAllUsers();
      }
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleUploadTemplate = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "xlsx"].includes(ext || "")) {
      setUploadError("Nur PDF, DOCX und XLSX unterstützt.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const path = `${orgId}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("templates")
        .upload(path, file);
      if (storageError) throw storageError;
      const { data, error: dbError } = await supabase
        .from("document_templates")
        .insert([
          {
            name: file.name.replace(`.${ext}`, ""),
            type: ext as "pdf" | "docx" | "xlsx",
            storage_path: path,
            organization_id: orgId,
          },
        ])
        .select()
        .single();
      if (dbError) throw dbError;
      setTemplates((prev) => [data as Template, ...prev]);
      showSuccess(`Vorlage "${file.name}" erfolgreich hochgeladen.`);
    } catch (err) {
      const msg = (err as Error).message;
      setUploadError(msg);
      showError("Upload fehlgeschlagen: " + msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveTemplate = (template: Template) => {
    showConfirm(
      "Vorlage löschen?",
      `Möchtest du die Vorlage "${template.name}" wirklich unwiderruflich löschen?`,
      async () => {
        const supabase = createClient();
        await supabase.storage
          .from("templates")
          .remove([template.storage_path]);
        await supabase
          .from("document_templates")
          .delete()
          .eq("id", template.id);
        setTemplates((prev) => prev.filter((t) => t.id !== template.id));
        showSuccess(`Vorlage "${template.name}" gelöscht.`);
      },
      "danger",
    );
  };

  const handleAddApprover = () => {
    if (!newApproverEmail.trim()) return;
    setApproverEmails((prev) => [
      ...prev,
      { name: newApproverName.trim(), email: newApproverEmail.trim() },
    ]);
    setNewApproverName("");
    setNewApproverEmail("");
  };

  const handleRemoveApprover = (email: string) => {
    setApproverEmails((prev) => prev.filter((a) => a.email !== email));
  };

  const handleSaveApprovers = async () => {
    if (!orgId) return;
    setSavingApprovers(true);
    try {
      await updateApproverEmails(orgId, approverEmails);
      showSuccess("Genehmiger gespeichert.");
    } catch (err) {
      showError("Speichern fehlgeschlagen: " + (err as Error).message);
    } finally {
      setSavingApprovers(false);
    }
  };

  const handleAssignApprover = async () => {
    if (!orgId || !selectedApproverEmail || assignTargetUserIds.size === 0) return;
    setAssigningApprover(true);
    try {
      const result = await assignApproverToUsers(
        orgId,
        selectedApproverEmail,
        Array.from(assignTargetUserIds),
      );
      if (result.error) {
        showError(result.error);
      } else {
        showSuccess(`${result.count} Mitarbeiter dem Genehmiger zugeordnet.`);
        setAssignTargetUserIds(new Set());
      }
    } finally {
      setAssigningApprover(false);
    }
  };

  const dayLabels = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  return (
    <div className="p-6 md:p-8 w-full animate-fade-in space-y-6 text-[var(--text-base)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <ShieldCheck size={22} className="text-[var(--primary)]" />{" "}
            Administration
          </h1>
          <p className="text-sm mt-1 text-[var(--text-muted)]">
            Einstellungen & Organisationen
          </p>
        </div>
      </div>

      {activeTab !== "organizations" && (
        <div className="flex items-center gap-3 mb-6">
          <div className="card px-4 py-2 flex items-center gap-2 bg-[var(--bg-elevated)] text-xs font-bold border border-[var(--border)] shadow-sm">
            <Building2 size={13} className="text-[var(--primary)]" />
            {orgName || "Keine Organisation gewählt"}
          </div>
        </div>
      )}

      {/* Tabs Navigation - Always visible if logged in */}
      <div className="flex items-center gap-1 mb-8 p-1 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] w-fit shrink-0 overflow-x-auto shadow-sm">
        {(
          [
            { id: "general", label: "Allgemein", icon: Settings },
            { id: "company", label: "Unternehmen", icon: Briefcase },
            { id: "policies", label: "Richtlinien", icon: Zap },
            { id: "users", label: "Mitarbeiter", icon: Users },
            { id: "approvers", label: "Genehmiger", icon: ShieldCheck },
            { id: "templates", label: "Vorlagen", icon: Files },
            { id: "organizations", label: "Organisationen", icon: Building2 },
            { id: "integrations", label: "Integrationen", icon: Plus },
            { id: "system", label: "System", icon: Monitor },
          ] as const
        ).map((tab) => {
          const isDisabled = tab.id !== "organizations" && !orgId;
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white dark:bg-gray-800 shadow-md text-[var(--primary)]"
                  : isDisabled
                    ? "opacity-30 cursor-not-allowed text-[var(--text-muted)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-base)]"
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {!orgId && activeTab !== "organizations" && (
            <div className="card p-12 text-center space-y-4 animate-in fade-in duration-500">
              <Building2
                size={48}
                className="mx-auto text-[var(--text-muted)] opacity-20"
              />
              <h2 className="text-lg font-bold">
                Keine Organisation ausgewählt
              </h2>
              <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
                Bitte wähle eine Organisation aus oder erstelle eine neue, um
                die Einstellungen zu verwalten.
              </p>
              <button
                onClick={() => setActiveTab("organizations")}
                className="btn-primary mx-auto"
              >
                Zur Organisationsverwaltung
              </button>
            </div>
          )}

          {orgId && (
            <>
              {/* TAB: Allgemein */}
              {activeTab === "general" && (
                <div className="card p-6 space-y-6 animate-in slide-in-from-bottom-2 duration-300 shadow-sm">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Building2 size={18} className="text-[var(--primary)]" />{" "}
                    Stammdaten
                  </h2>
                  <form
                    onSubmit={handleUpdateOrgSettings}
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-[10px] font-black mb-2 text-[var(--text-muted)] uppercase tracking-wider">
                        Name der Organisation
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--bg-elevated)] border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingOrg}
                      className="btn-primary min-w-[160px] justify-center shadow-lg"
                    >
                      {isSavingOrg ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Änderungen speichern
                    </button>
                  </form>
                </div>
              )}

              {/* TAB: Unternehmen */}
              {activeTab === "company" && (
                <div className="card p-6 space-y-6 animate-in slide-in-from-bottom-2 duration-300 shadow-sm">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Palette size={18} className="text-[var(--primary)]" />{" "}
                    Branding & Details
                  </h2>
                  <form
                    onSubmit={handleUpdateOrgSettings}
                    className="space-y-6"
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black mb-2 text-[var(--text-muted)] uppercase tracking-wider">
                            Logo URL
                          </label>
                          <input
                            type="text"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="https://link-zu-deinem-logo.png"
                            className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--bg-elevated)] border-[var(--border)] focus:border-[var(--primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black mb-2 text-[var(--text-muted)] uppercase tracking-wider">
                            Primärfarbe (Hex)
                          </label>
                          <div className="flex gap-3">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-12 h-12 rounded-xl border-0 p-0 cursor-pointer overflow-hidden bg-transparent"
                            />
                            <input
                              type="text"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="flex-1 rounded-xl border px-4 py-3 text-sm bg-[var(--bg-elevated)] border-[var(--border)] font-mono"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black mb-2 text-[var(--text-muted)] uppercase tracking-wider">
                          Firmenadresse
                        </label>
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Musterstraße 1&#10;12345 Berlin"
                          rows={4}
                          className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--bg-elevated)] border-[var(--border)] outline-none resize-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingOrg}
                      className="btn-primary min-w-[160px] justify-center shadow-lg"
                    >
                      {isSavingOrg ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Profil aktualisieren
                    </button>
                  </form>
                </div>
              )}

              {/* TAB: Richtlinien */}
              {activeTab === "policies" && (
                <div className="card p-6 space-y-8 animate-in slide-in-from-bottom-2 duration-300 shadow-sm">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Zap size={18} className="text-[var(--primary)]" /> Globale
                    Richtlinien
                  </h2>
                  <form
                    onSubmit={handleUpdateOrgSettings}
                    className="space-y-8"
                  >
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-black mb-3 text-[var(--text-muted)] uppercase tracking-wider">
                        <Briefcase size={12} /> Standard-Arbeitswoche
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleCompanyWorkDay(day)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                              companyWorkDays.includes(day)
                                ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-md"
                                : "bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)]"
                            }`}
                          >
                            {dayLabels[day]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-black mb-2 text-[var(--text-muted)] uppercase tracking-wider">
                          <MapPin size={12} /> Feiertags-Region (DE)
                        </label>
                        <select
                          value={holidayRegion}
                          onChange={(e) => setHolidayRegion(e.target.value)}
                          className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--bg-elevated)] border-[var(--border)] outline-none"
                        >
                          <option value="BW">Baden-Württemberg</option>
                          <option value="BY">Bayern</option>
                          <option value="BE">Berlin</option>
                          <option value="BB">Brandenburg</option>
                          <option value="HB">Bremen</option>
                          <option value="HH">Hamburg</option>
                          <option value="HE">Hessen</option>
                          <option value="MV">Mecklenburg-Vorpommern</option>
                          <option value="NI">Niedersachsen</option>
                          <option value="NW">Nordrhein-Westfalen</option>
                          <option value="RP">Rheinland-Pfalz</option>
                          <option value="SL">Saarland</option>
                          <option value="SN">Sachsen</option>
                          <option value="ST">Sachsen-Anhalt</option>
                          <option value="SH">Schleswig-Holstein</option>
                          <option value="TH">Thüringen</option>
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-black mb-2 text-[var(--text-muted)] uppercase tracking-wider">
                          <Zap size={12} className="text-yellow-500" />{" "}
                          Auto-Genehmigung
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={autoApproveLimit}
                            onChange={(e) =>
                              setAutoApproveLimit(parseInt(e.target.value) || 0)
                            }
                            className="w-20 rounded-xl border px-4 py-3 text-sm bg-[var(--bg-elevated)] border-[var(--border)] font-bold text-center"
                          />
                          <span className="text-xs text-[var(--text-muted)]">
                            Tage (0 = Deaktiviert)
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingOrg}
                      className="btn-primary min-w-[160px] justify-center shadow-lg"
                    >
                      {isSavingOrg ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Richtlinien sichern
                    </button>
                  </form>
                </div>
              )}

              {/* TAB: Mitarbeiter */}
              {activeTab === "users" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                  {/* Bestehende Mitglieder */}
                  <div className="card space-y-4 shadow-sm overflow-hidden">
                    <div
                      className="p-6 border-b"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <h2 className="text-base font-bold flex items-center gap-2">
                        <Users size={18} className="text-[var(--primary)]" />{" "}
                        Teammitglieder
                      </h2>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 italic">
                        Verwalte Rollen und Zugriffsberechtigungen.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr
                            className="bg-[var(--bg-elevated)] border-b"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                              Benutzer
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                              Rolle
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                              Aktionen
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((m) => (
                            <>
                            <tr
                              key={m.user_id}
                              className={`border-b hover:bg-[var(--bg-elevated)]/50 transition-colors cursor-pointer ${expandedMember === m.user_id ? "bg-[var(--primary-light)]" : ""}`}
                              style={{ borderColor: "var(--border)" }}
                              onClick={() => handleExpandMember(m.user_id)}
                            >
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold">{m.email}</p>
                                <p className="text-[10px] text-[var(--text-muted)]">
                                  ID: {m.user_id.slice(0, 8)}...
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`badge ${ROLE_COLORS[m.role]}`}>
                                  {ROLE_LABELS[m.role]}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <select
                                    className="text-[10px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-2 py-1 outline-none focus:border-[var(--primary)]"
                                    value={m.role}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleUpdateRole(m.user_id, e.target.value as UserRole);
                                    }}
                                  >
                                    <option value="employee">Mitarbeiter</option>
                                    <option value="approver">Genehmiger</option>
                                    <option value="cio">CIO (Geschäftsführer)</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                  <span className="text-[var(--text-muted)] text-[10px]">
                                    {expandedMember === m.user_id ? "▲" : "▼"}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {/* Inline-Bearbeitungszeile */}
                            {expandedMember === m.user_id && (
                              <tr key={`${m.user_id}-expand`} className="border-b" style={{ borderColor: "var(--border)" }}>
                                <td colSpan={3} className="px-6 py-4 bg-[var(--bg-elevated)]/40">
                                  {loadingMemberSettings === m.user_id ? (
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                      <Loader size={14} className="animate-spin" /> Lade Einstellungen...
                                    </div>
                                  ) : (
                                    <div className="grid md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="block text-[10px] font-black mb-1 text-[var(--text-muted)] uppercase tracking-wider">Urlaubsanspruch (Tage)</label>
                                        <input
                                          type="number"
                                          value={(memberSettings[m.user_id]?.vacationQuota as number) ?? 30}
                                          onChange={(e) => updateLocalMemberSetting(m.user_id, "vacationQuota", parseInt(e.target.value) || 0)}
                                          className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-input)] border-[var(--border)]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-black mb-1 text-[var(--text-muted)] uppercase tracking-wider">Übertrag (Tage)</label>
                                        <input
                                          type="number"
                                          value={(memberSettings[m.user_id]?.carryOver as number) ?? 0}
                                          onChange={(e) => updateLocalMemberSetting(m.user_id, "carryOver", parseInt(e.target.value) || 0)}
                                          className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-input)] border-[var(--border)]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-black mb-1 text-[var(--text-muted)] uppercase tracking-wider">Mitarbeiter-ID</label>
                                        <input
                                          type="text"
                                          value={(memberSettings[m.user_id]?.employeeId as string) ?? ""}
                                          onChange={(e) => updateLocalMemberSetting(m.user_id, "employeeId", e.target.value)}
                                          className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-input)] border-[var(--border)]"
                                          placeholder="z.B. EMP-001"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-black mb-1 text-[var(--text-muted)] uppercase tracking-wider">Vertreter (Name)</label>
                                        <input
                                          type="text"
                                          value={(memberSettings[m.user_id]?.deputyName as string) ?? ""}
                                          onChange={(e) => updateLocalMemberSetting(m.user_id, "deputyName", e.target.value)}
                                          className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-input)] border-[var(--border)]"
                                          placeholder="Name des Vertreters"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-black mb-1 text-[var(--text-muted)] uppercase tracking-wider">Vorname</label>
                                        <input
                                          type="text"
                                          value={(memberSettings[m.user_id]?.firstName as string) ?? ""}
                                          onChange={(e) => updateLocalMemberSetting(m.user_id, "firstName", e.target.value)}
                                          className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-input)] border-[var(--border)]"
                                          placeholder="Vorname"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-black mb-1 text-[var(--text-muted)] uppercase tracking-wider">Nachname</label>
                                        <input
                                          type="text"
                                          value={(memberSettings[m.user_id]?.lastName as string) ?? ""}
                                          onChange={(e) => updateLocalMemberSetting(m.user_id, "lastName", e.target.value)}
                                          className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-input)] border-[var(--border)]"
                                          placeholder="Nachname"
                                        />
                                      </div>
                                      <div className="md:col-span-3 flex justify-end">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleSaveMemberSettings(m.user_id); }}
                                          disabled={savingMemberSettings === m.user_id}
                                          className="btn-primary text-xs"
                                        >
                                          {savingMemberSettings === m.user_id ? (
                                            <Loader size={13} className="animate-spin" />
                                          ) : (
                                            <CheckCircle size={13} />
                                          )}
                                          Einstellungen speichern
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bug 10/11: Alle Benutzer anzeigen und zuweisen */}
                  <div className="card p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold flex items-center gap-2">
                          <UserPlus size={18} className="text-[var(--primary)]" /> Alle Benutzer zuordnen
                        </h2>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">
                          Direkt in der Datenbank angelegte Benutzer der Organisation zuweisen.
                        </p>
                      </div>
                      <button
                        onClick={loadAllUsers}
                        disabled={loadingAllUsers}
                        className="btn-secondary text-xs"
                      >
                        {loadingAllUsers ? (
                          <Loader size={13} className="animate-spin" />
                        ) : (
                          <Users size={13} />
                        )}
                        Alle User laden
                      </button>
                    </div>

                    {bulkError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs rounded-xl">
                        {bulkError}
                      </div>
                    )}
                    {bulkSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs rounded-xl flex items-center gap-2">
                        <CheckCircle size={14} /> {bulkSuccess}
                      </div>
                    )}

                    {showAllUsers && allUsers.length > 0 && (
                      <>
                        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[var(--bg-elevated)]">
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                  <input
                                    type="checkbox"
                                    className="rounded"
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUserIds(new Set(allUsers.filter(u => !u.isInOrg).map(u => u.id)));
                                      } else {
                                        setSelectedUserIds(new Set());
                                      }
                                    }}
                                  />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">E-Mail</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allUsers.map((u) => (
                                <tr
                                  key={u.id}
                                  className="border-t hover:bg-[var(--bg-elevated)]/40"
                                  style={{ borderColor: "var(--border)" }}
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedUserIds.has(u.id)}
                                      disabled={u.isInOrg}
                                      onChange={(e) => {
                                        const next = new Set(selectedUserIds);
                                        if (e.target.checked) next.add(u.id);
                                        else next.delete(u.id);
                                        setSelectedUserIds(next);
                                      }}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {u.email || <span className="text-[var(--text-muted)]">—</span>}
                                    <div className="text-[10px] text-[var(--text-muted)]">{u.id.slice(0, 8)}…</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {u.isInOrg ? (
                                      <span className="badge badge-approved text-[10px]">Bereits Mitglied</span>
                                    ) : (
                                      <span className="badge badge-pending text-[10px]">Nicht zugeordnet</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {selectedUserIds.size > 0 && (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-elevated)] border" style={{ borderColor: "var(--border)" }}>
                            <span className="text-xs font-bold text-[var(--text-muted)]">
                              {selectedUserIds.size} ausgewählt
                            </span>
                            <select
                              value={bulkRole}
                              onChange={(e) => setBulkRole(e.target.value as UserRole)}
                              className="text-xs border rounded-lg px-2 py-1.5 outline-none"
                            >
                              <option value="employee">Mitarbeiter</option>
                              <option value="approver">Genehmiger</option>
                              <option value="cio">CIO</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={handleBulkAssign}
                              disabled={bulkAssigning}
                              className="btn-primary text-xs"
                            >
                              {bulkAssigning ? <Loader size={13} className="animate-spin" /> : <UserPlus size={13} />}
                              Organisation zuweisen
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Genehmiger */}
              {activeTab === "approvers" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                  {/* Genehmiger-Liste */}
                  <div className="card p-6 space-y-5 shadow-sm">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <ShieldCheck size={18} className="text-[var(--primary)]" />
                      Genehmiger-E-Mails
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      Hinterlege die E-Mail-Adressen der Genehmiger. Mitarbeiter können diesen dann per Massenzuordnung zugewiesen werden.
                    </p>

                    {/* Neue Genehmiger hinzufügen */}
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-[10px] font-black mb-1 text-[var(--text-muted)] uppercase tracking-wider">Name</label>
                        <input
                          type="text"
                          placeholder="Max Mustermann"
                          value={newApproverName}
                          onChange={(e) => setNewApproverName(e.target.value)}
                          className="w-full rounded-xl border px-3 py-2.5 text-sm bg-[var(--bg-elevated)] border-[var(--border)] focus:border-[var(--primary)] outline-none"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-black mb-1 text-[var(--text-muted)] uppercase tracking-wider">E-Mail-Adresse</label>
                        <input
                          type="email"
                          placeholder="genehmiger@firma.de"
                          value={newApproverEmail}
                          onChange={(e) => setNewApproverEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddApprover()}
                          className="w-full rounded-xl border px-3 py-2.5 text-sm bg-[var(--bg-elevated)] border-[var(--border)] focus:border-[var(--primary)] outline-none"
                        />
                      </div>
                      <button
                        onClick={handleAddApprover}
                        disabled={!newApproverEmail.trim()}
                        className="btn-primary px-4 py-2.5 flex items-center gap-2"
                      >
                        <UserPlus size={14} /> Hinzufügen
                      </button>
                    </div>

                    {/* Bestehende Genehmiger */}
                    {approverEmails.length > 0 ? (
                      <div className="space-y-2">
                        {approverEmails.map((a) => (
                          <div
                            key={a.email}
                            className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]"
                          >
                            <div>
                              <p className="text-sm font-semibold">{a.name || "–"}</p>
                              <p className="text-xs text-[var(--text-muted)]">{a.email}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveApprover(a.email)}
                              className="p-2 rounded-lg btn-ghost text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">Noch keine Genehmiger hinterlegt.</p>
                    )}

                    <button
                      onClick={handleSaveApprovers}
                      disabled={savingApprovers}
                      className="btn-primary min-w-[160px] justify-center shadow-md"
                    >
                      {savingApprovers ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      Genehmiger speichern
                    </button>
                  </div>

                  {/* Massenzuordnung */}
                  <div className="card p-6 space-y-5 shadow-sm">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <Users size={18} className="text-[var(--primary)]" />
                      Mitarbeiter zuordnen
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      Wähle einen Genehmiger und weise ihm Mitarbeiter zu. Die Zuordnung bestimmt, an welche E-Mail-Adresse ein Urlaubsantrag geschickt wird.
                    </p>

                    {approverEmails.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] italic">Bitte zuerst Genehmiger-E-Mails hinterlegen und speichern.</p>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[10px] font-black mb-1 text-[var(--text-muted)] uppercase tracking-wider">Genehmiger</label>
                          <select
                            value={selectedApproverEmail}
                            onChange={(e) => setSelectedApproverEmail(e.target.value)}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm bg-[var(--bg-elevated)] border-[var(--border)] focus:border-[var(--primary)] outline-none"
                          >
                            {approverEmails.map((a) => (
                              <option key={a.email} value={a.email}>
                                {a.name ? `${a.name} (${a.email})` : a.email}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black mb-2 text-[var(--text-muted)] uppercase tracking-wider">Mitarbeiter auswählen</label>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {members.map((m) => (
                              <label key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={assignTargetUserIds.has(m.user_id)}
                                  onChange={(e) => {
                                    setAssignTargetUserIds((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(m.user_id);
                                      else next.delete(m.user_id);
                                      return next;
                                    });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">{m.email ?? m.user_id}</span>
                                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${ROLE_COLORS[m.role]}`}>
                                  {ROLE_LABELS[m.role]}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleAssignApprover}
                          disabled={assigningApprover || assignTargetUserIds.size === 0 || !selectedApproverEmail}
                          className="btn-primary min-w-[200px] justify-center shadow-md"
                        >
                          {assigningApprover ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                          {assignTargetUserIds.size > 0 ? `${assignTargetUserIds.size} Mitarbeiter zuordnen` : "Mitarbeiter auswählen"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Vorlagen */}
              {activeTab === "templates" && (
                <div className="card p-6 space-y-6 animate-in slide-in-from-bottom-2 duration-300 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold flex items-center gap-2">
                        <Files size={18} className="text-[var(--primary)]" />{" "}
                        Dokumentvorlagen
                      </h2>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 italic">
                        Lade .docx, .xlsx oder .pdf Dateien hoch (Platzhalter:{" "}
                        {"{firstName}"}, {"{lastName}"}, etc.)
                      </p>
                    </div>
                    <label
                      className={`btn-primary cursor-pointer flex items-center gap-2 ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      {uploading ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      {uploading ? "Hochladen..." : "Neu"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleUploadTemplate}
                        accept=".pdf,.docx,.xlsx"
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl animate-in shake-1">
                      {uploadError}
                    </div>
                  )}

                  <div
                    className="grid md:grid-cols-2 gap-4 pt-4 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] flex items-center justify-between hover:border-[var(--primary)] transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${t.type === "pdf" ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"}`}
                          >
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black">{t.name}</p>
                            <p className="text-[9px] uppercase tracking-widest text-[var(--text-subtle)] font-black opacity-60">
                              {t.type}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTemplate(t)}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {templates.length === 0 && (
                      <div className="md:col-span-2 py-12 text-center border-2 border-dashed border-[var(--border)] rounded-3xl opacity-50">
                        <Files size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">
                          Keine Vorlagen vorhanden
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "organizations" && currentUserId && (
            <div className="card animate-in slide-in-from-bottom-2 duration-300 shadow-sm overflow-hidden">
              <div
                className="p-6 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Building2 size={18} className="text-[var(--primary)]" />{" "}
                  Organisationen verwalten
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 italic">
                  Wechsle zwischen deinen Organisationen oder erstelle eine
                  neue.
                </p>
              </div>

              <div className="p-6 space-y-8 bg-[var(--bg-elevated)]/30">
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 text-[var(--text-muted)]">
                    Aktiv anpassen
                  </h3>
                  <OrganizationSwitcher
                    userId={currentUserId ?? activeUserId ?? ""}
                    onOrgChange={(id: string, r: string, name?: string) => {
                      setOrgId(id);
                      setOrgName(name || "");
                      switchOrg(id); // globalen Context aktualisieren
                    }}
                  />
                </section>

                <section
                  className="pt-6 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 text-[var(--text-muted)]">
                    Organisationen Verlassen / Beitreten
                  </h3>
                  <p className="text-xs mb-4 text-[var(--text-subtle)]">
                    Falls du nicht mehr Teil einer Organisation sein möchtest,
                    kannst du diese hier verlassen (demnächst). Um einer neuen
                    beizutreten, lass dich von einem Administrator einladen.
                  </p>
                  <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center text-center opacity-40">
                    <Plus size={24} className="mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Neue Organisation Erstellen
                    </p>
                    <p className="text-[9px] mt-1 italic">
                      Nutzte das 'Neu' Menü oben oder kontaktiere den CIO.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          )}
          {activeTab === "integrations" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              {/* E-Mail Integration */}
              <div className="card p-6 shadow-sm space-y-5">
                <div
                  className="flex items-center gap-3 pb-4 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Send size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">E-Mail-Integration</h2>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      OAuth-Verbindungen für automatischen E-Mail-Versand
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="p-4 rounded-xl border flex items-start gap-3"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "#0078d4" }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="white"
                      >
                        <path d="M2 12l10-10 10 10-10 10z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">
                        Microsoft Outlook / Office 365
                      </p>
                      <p className="text-[10px] mt-0.5 text-[var(--text-muted)]">
                        Erfordert Azure App Registration (client_id)
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold">
                          Konfiguration ausstehend
                        </span>
                      </div>
                      <p className="text-[10px] mt-2 text-[var(--text-subtle)]">
                        Env-Variable:{" "}
                        <code className="bg-[var(--bg-input)] px-1 rounded">
                          AZURE_CLIENT_ID
                        </code>
                      </p>
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-xl border flex items-start gap-3"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white">
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">Google Workspace</p>
                      <p className="text-[10px] mt-0.5 text-[var(--text-muted)]">
                        Erfordert Google Cloud Console (client_id)
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold">
                          Konfiguration ausstehend
                        </span>
                      </div>
                      <p className="text-[10px] mt-2 text-[var(--text-subtle)]">
                        Env-Variable:{" "}
                        <code className="bg-[var(--bg-input)] px-1 rounded">
                          GOOGLE_CLIENT_ID
                        </code>
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className="p-4 rounded-xl text-[11px] text-[var(--text-muted)] space-y-1"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="font-bold text-[var(--text-base)]">
                    Einrichtung:
                  </p>
                  <p>
                    1. Azure/Google App registrieren und OAuth 2.0 Credentials
                    erstellen
                  </p>
                  <p>
                    2. Redirect URI eintragen:{" "}
                    <code className="bg-[var(--bg-input)] px-1 rounded">
                      {typeof window !== "undefined"
                        ? window.location.origin
                        : ""}
                      /auth/callback/calendar
                    </code>
                  </p>
                  <p>3. Client ID in der .env.local hinterlegen</p>
                  <p>
                    4. Server neu starten â€“ danach ist der OAuth-Button aktiv
                  </p>
                </div>
              </div>

              {/* Kalender-Integration */}
              <div className="card p-6 shadow-sm space-y-4">
                <div
                  className="flex items-center gap-3 pb-4 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Kalender-Sync</h2>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Externe Kalender mit AWAY synchronisieren
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Mitarbeiter können ihre Outlook- oder Google-Kalender
                  verbinden ({" "}
                  <a
                    href="/settings"
                    className="text-[var(--primary)] underline"
                  >
                    Persönliche Einstellungen
                  </a>{" "}
                  â†’ Kalender). Die Verbindung verwendet OAuth-Access-Token.
                </p>
              </div>

              {/* App-Version */}
              <div className="card p-6 shadow-sm">
                <div
                  className="flex items-center gap-3 pb-4 border-b mb-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Info size={16} />
                  </div>
                  <h2 className="text-base font-bold">App-Information</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {[
                    { label: "Version", value: "2.0.0" },
                    { label: "Framework", value: "Next.js 15" },
                    { label: "Datenbank", value: "Supabase" },
                    {
                      label: "Umgebung",
                      value: process.env.NODE_ENV ?? "production",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-3 rounded-xl"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        {item.label}
                      </p>
                      <p className="text-sm font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "system" && <SystemTab orgId={orgId} />}
        </div>

        <div className="space-y-6">
          {/* Quick Invite Sidebar */}
          {orgId && (
            <div className="card p-6 space-y-5 bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-elevated)] shadow-lg border-2 border-[var(--primary-light)]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shadow-lg">
                  <UserPlus size={18} />
                </div>
                <h2 className="text-sm font-black tracking-tight">
                  Schnell-Einladung
                </h2>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black mb-2 text-[var(--text-muted)] uppercase tracking-wider">
                    E-Mail Adresse
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="kollege@firma.de"
                    className="w-full rounded-xl border px-4 py-3 text-sm bg-white dark:bg-gray-800 border-[var(--border)] focus:border-[var(--primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-2 text-[var(--text-muted)] uppercase tracking-wider">
                    Rolle
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border px-4 py-3 text-sm bg-white dark:bg-gray-800 border-[var(--border)]"
                  >
                    <option value="employee">Mitarbeiter</option>
                    <option value="approver">Genehmiger</option>
                    <option value="cio">CIO (Geschäftsführer)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-primary w-full justify-center shadow-xl py-3 text-sm font-black tracking-tighter"
                >
                  {inviting ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}{" "}
                  Einladung senden
                </button>
                {inviteSuccess && (
                  <div className="p-3 rounded-xl bg-[var(--success-light)] text-[var(--success)] text-[10px] font-black border border-[var(--success-border)] flex items-center gap-2">
                    <CheckCircle size={12} /> {inviteSuccess}
                  </div>
                )}
                {inviteError && (
                  <div className="p-3 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-[10px] font-black border border-[var(--danger-border)] flex items-center gap-2">
                    <AlertCircle size={12} /> {inviteError}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Info Widget */}
          <div className="card p-6 bg-[var(--bg-elevated)] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Info size={16} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider">
                Info
              </h3>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              Diese Einstellungen gelten für die gesamte Organisation. Als
              Administrator hast du vollen Zugriff auf alle Daten und Exporte.
            </p>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        hideCancel={confirmModal.hideCancel}
        loading={confirmModal.loading}
      />
    </div>
  );
}
