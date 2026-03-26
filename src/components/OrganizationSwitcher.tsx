import { getOrganizationsForUser } from '@/lib/organization';
import { getUserRole } from '@/lib/roles';
// supabase wird hier nicht benötigt
import { useEffect, useState } from 'react';

export default function OrganizationSwitcher({ userId, onOrgChange }: { userId: string, onOrgChange: (orgId: string, role: string) => void }) {
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    getOrganizationsForUser(userId).then(data => {
      const filtered = (data || []).filter((o): o is { id: string; name: string } => o !== null);
      setOrgs(filtered);
      if (filtered.length > 0) {
        setSelectedOrg(filtered[0].id);
      }
    });
  }, [userId]);

  useEffect(() => {
    if (selectedOrg) {
      getUserRole(userId, selectedOrg).then(role => {
        setRole(role);
        onOrgChange(selectedOrg, role);
      });
    }
  }, [selectedOrg, userId, onOrgChange]);

  return (
    <div className="mb-4">
      <label className="block mb-1 font-semibold">Organisation wählen:</label>
      <select
        className="border rounded px-2 py-1"
        value={selectedOrg}
        onChange={e => setSelectedOrg(e.target.value)}
      >
        {orgs.map(org => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>
      {role && <span className="ml-2 text-sm text-gray-500">({role})</span>}
    </div>
  );
}
