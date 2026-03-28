import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrgMembersWithEmails, inviteUserToOrg } from '../actions/adminActions';

// Mocking the server action
vi.mock('../actions/adminActions', () => ({
  getOrgMembersWithEmails: vi.fn(),
  inviteUserToOrg: vi.fn(),
}));

describe('Administration Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrgMembersWithEmails', () => {
    it('should be a function', () => {
      expect(typeof getOrgMembersWithEmails).toBe('function');
    });

    it('should handle successful member fetching', async () => {
      const mockMembers = [
        { user_id: '1', role: 'admin', email: 'admin@test.com', created_at: new Date().toISOString() },
        { user_id: '2', role: 'employee', email: 'user@test.com', created_at: new Date().toISOString() }
      ];
      vi.mocked(getOrgMembersWithEmails).mockResolvedValue({ data: mockMembers } as any);

      const result = await getOrgMembersWithEmails('org-123');
      expect(result.data).toHaveLength(2);
      expect(result.data![0].email).toBe('admin@test.com');
      expect(vi.mocked(getOrgMembersWithEmails)).toHaveBeenCalledWith('org-123');
    });

    it('should handle errors when fetching members', async () => {
      vi.mocked(getOrgMembersWithEmails).mockResolvedValue({ error: 'Fehler beim Laden' } as any);
      
      const result = await getOrgMembersWithEmails('org-123');
      expect(result.error).toBe('Fehler beim Laden');
    });
  });

  describe('inviteUserToOrg', () => {
    it('should be a function', () => {
      expect(typeof inviteUserToOrg).toBe('function');
    });

    it('should handle successful invitation', async () => {
      vi.mocked(inviteUserToOrg).mockResolvedValue({ success: true } as any);

      const result = await inviteUserToOrg('new@test.com', 'org-123', 'employee', 'http://localhost:3000');
      
      expect(result.success).toBe(true);
      expect(vi.mocked(inviteUserToOrg)).toHaveBeenCalledWith('new@test.com', 'org-123', 'employee', 'http://localhost:3000');
    });

    it('should handle invitation errors', async () => {
      vi.mocked(inviteUserToOrg).mockResolvedValue({ error: 'Einladungsfehler' } as any);
      
      const result = await inviteUserToOrg('new@test.com', 'org-123', 'employee', 'http://localhost:3000');
      expect(result.error).toBe('Einladungsfehler');
    });
  });
});
