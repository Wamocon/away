import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrganizationsForUser, getCurrentOrganization, createOrganization, joinOrganization } from '../organization';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
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
    mockSupabase.order.mockResolvedValueOnce({ data: [], error: null });
    const res = await getOrganizationsForUser('user-1');
    expect(res).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    expect(mockSupabase.order).toHaveBeenCalledWith('organization_id', { ascending: true });
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
  
  it('should join organization as employee', async () => {
    // Mock existing user_roles check (not found)
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Mock insert
    mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null });
    
    const res = await joinOrganization('user-1', 'org-1');
    expect(res.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    expect(mockSupabase.insert).toHaveBeenCalledWith([{
      user_id: 'user-1',
      organization_id: 'org-1',
      role: 'employee'
    }]);
  });
});
