import { getOrganizationsForUser } from "@/lib/organization";
import { getUserRole } from "@/lib/roles";
import { useEffect, useState, useCallback } from "react";
import { useActiveOrg } from "@/components/ui/ActiveOrgProvider";
import CreateOrganization from "./CreateOrganization";
import { Plus } from "lucide-react";

export default function OrganizationSwitcher({
  userId,
  onOrgChange,
}: {
  userId: string;
  onOrgChange: (orgId: string, role: string, name?: string) => void;
}) {
  const { orgs: contextOrgs, currentOrgId, switchOrg, reload } = useActiveOrg();
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>("employee");

  // Lokale Org-Liste aus dem Context übernehmen
  useEffect(() => {
    setOrgs(contextOrgs);
  }, [contextOrgs]);

  // Aktive Org aus Context übernehmen
  useEffect(() => {
    if (currentOrgId && currentOrgId !== selectedOrg) {
      setSelectedOrg(currentOrgId);
    } else if (!currentOrgId && orgs.length > 0) {
      setSelectedOrg(orgs[0].id);
    }
  }, [currentOrgId, orgs, selectedOrg]);

  // Rolle laden wenn sich die Org ändert
  useEffect(() => {
    if (!selectedOrg || !userId) return;
    const org = orgs.find((o) => o.id === selectedOrg);
    getUserRole(userId, selectedOrg)
      .then((role) => {
        setCurrentRole(role);
        onOrgChange(selectedOrg, role, org?.name);
      })
      .catch(() => {
        const fallbackRole = "employee";
        setCurrentRole(fallbackRole);
        onOrgChange(selectedOrg, fallbackRole, org?.name);
      });
  }, [selectedOrg, userId, onOrgChange, orgs]);

  // Fallback: Orgs direkt laden falls Context noch leer ist
  const loadOrgs = useCallback(() => {
    if (contextOrgs.length > 0) return;
    getOrganizationsForUser(userId).then((data) => {
      const filtered = (data || []).filter(
        (o): o is { id: string; name: string } => o !== null,
      );
      setOrgs(filtered);
      if (filtered.length > 0 && !selectedOrg) {
        setSelectedOrg(filtered[0].id);
      }
    });
  }, [userId, selectedOrg, contextOrgs.length]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  const handleOrgCreated = (newOrg: { id: string; name: string }) => {
    reload(); // ActiveOrgProvider neu laden
    setSelectedOrg(newOrg.id);
    switchOrg(newOrg.id);
    setShowCreate(false);
  };

  // Nur Admin und CIO dürfen Organisationen erstellen
  const canCreateOrg = currentRole === "admin" || currentRole === "cio";

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="font-semibold" style={{ color: "var(--text-muted)" }}>Organisation</label>
        {canCreateOrg && (
          <button
            onClick={() => setShowCreate((prev) => !prev)}
            className="text-[var(--primary)] hover:text-[var(--primary-hover)] text-xs flex items-center gap-1.5 transition-colors font-medium border border-[var(--primary)]/20 bg-[var(--primary-light)] px-2 py-1 rounded-md"
          >
            <Plus size={12} />
            {showCreate ? "Abbrechen" : "Neu"}
          </button>
        )}
      </div>

      {orgs.length === 0 ? (
        <div className="text-sm italic" style={{ color: "var(--text-muted)" }}>
          Noch keine Organisationen vorhanden.
        </div>
      ) : (
        <div className="flex items-center">
          <select
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-base)",
            }}
            value={selectedOrg}
            onChange={(e) => {
              setSelectedOrg(e.target.value);
              switchOrg(e.target.value);
            }}
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}
                style={{ background: "var(--bg-elevated)", color: "var(--text-base)" }}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showCreate && (
        <CreateOrganization
          userId={userId}
          onCreated={handleOrgCreated}
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
