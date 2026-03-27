import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrganizationsForUser, getCurrentOrganization, createOrganization } from '../organization';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

describe('organization lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch organizations for a user (mocked)', async () => {
    mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null });
    const res = await getOrganizationsForUser('user-1');
    expect(res).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
  });

  it('should fetch a single organization (mocked)', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'org-1', name: 'Org 1' }, error: null });
    const res = await getCurrentOrganization('org-1');
    expect(res.name).toBe('Org 1');
  });

  it('should create an organization via RPC', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: 'new-org-id', error: null });
    const res = await createOrganization('user-1', 'New Org');
    expect(res.id).toBe('new-org-id');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_new_organization', {
      org_name: 'New Org',
      creator_id: 'user-1'
    });
  });
});
