import { getOrganizationsForUser } from "@/lib/organization";
import { getUserRole } from "@/lib/roles";
import { useEffect, useState, useCallback } from "react";
import CreateOrganization from "./CreateOrganization";
import { Plus } from "lucide-react";

export default function OrganizationSwitcher({
  userId,
  onOrgChange,
}: {
  userId: string;
  onOrgChange: (orgId: string, role: string, name?: string) => void;
}) {
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  const loadOrgs = useCallback(() => {
    getOrganizationsForUser(userId).then((data) => {
      const filtered = (data || []).filter(
        (o): o is { id: string; name: string } => o !== null,
      );
      setOrgs(filtered);
      if (filtered.length > 0 && !selectedOrg) {
        setSelectedOrg(filtered[0].id);
      }
    });
  }, [userId, selectedOrg]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  useEffect(() => {
    if (selectedOrg) {
      const org = orgs.find((o) => o.id === selectedOrg);
      getUserRole(userId, selectedOrg).then((role) => {
        onOrgChange(selectedOrg, role, org?.name);
      });
    }
  }, [selectedOrg, userId, onOrgChange, orgs]);

  const handleOrgCreated = (newOrg: { id: string; name: string }) => {
    setOrgs((prev) => [...prev, newOrg]);
    setSelectedOrg(newOrg.id);
    setShowCreate(false);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="font-semibold text-gray-200">Organisation</label>
        <button
          onClick={() => setShowCreate((prev) => !prev)}
          className="text-blue-500 hover:text-blue-400 text-xs flex items-center gap-1.5 transition-colors font-medium border border-blue-500/20 bg-blue-500/10 px-2 py-1 rounded-md"
        >
          <Plus size={12} />
          {showCreate ? "Abbrechen" : "Neu"}
        </button>
      </div>

      {orgs.length === 0 ? (
        <div className="text-sm text-gray-500 mb-2 italic">
          Noch keine Organisationen. Starten Sie durch Erstellen einer neuen.
        </div>
      ) : (
        <div className="flex items-center">
          <select
            className="w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-950 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
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
