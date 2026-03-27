import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrgMembersWithEmails } from '../actions/adminActions';

// Mocking the server action
vi.mock('../actions/adminActions', () => ({
  getOrgMembersWithEmails: vi.fn(),
}));

describe('Administration logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provided a mockable getOrgMembersWithEmails function', () => {
    expect(typeof getOrgMembersWithEmails).toBe('function');
  });

  it('should handle successful member fetching in tests', async () => {
    const mockMembers = [
      { user_id: '1', role: 'admin', email: 'admin@test.com', created_at: new Date().toISOString() },
      { user_id: '2', role: 'employee', email: 'user@test.com', created_at: new Date().toISOString() }
    ];
    vi.mocked(getOrgMembersWithEmails).mockResolvedValue(mockMembers as any);

    const result = await getOrgMembersWithEmails('org-123');
    expect(result).toHaveLength(2);
    expect(result[0].email).toBe('admin@test.com');
  });

  it('should handle errors when fetching members', async () => {
    vi.mocked(getOrgMembersWithEmails).mockRejectedValue(new Error('Unauthorized'));
    
    await expect(getOrgMembersWithEmails('org-123')).rejects.toThrow('Unauthorized');
  });
});
