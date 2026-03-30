import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVacationRequest, getVacationRequestsForOrg } from '../vacation';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

describe('vacation lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a vacation request with template fields', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'req-1' }, error: null });
    
    const input = {
      userId: 'user-1',
      organizationId: 'org-1',
      from: '2024-05-01',
      to: '2024-05-05',
      reason: 'Urlaub',
      template_fields: { guest: 'yes' }
    };
    
    const res = await createVacationRequest(input);
    expect(res.id).toBe('req-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('vacation_requests');
    expect(mockSupabase.insert).toHaveBeenCalledWith([{
      user_id: 'user-1',
      organization_id: 'org-1',
      from: '2024-05-01',
      to: '2024-05-05',
      reason: 'Urlaub',
      status: 'pending',
      template_fields: { guest: 'yes' }
    }]);
  });

  it('should fetch vacation requests for an organization', async () => {
    mockSupabase.order.mockResolvedValueOnce({ data: [{ id: '1' }], error: null });
    const res = await getVacationRequestsForOrg('org-1');
    expect(res).toHaveLength(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('vacation_requests');
    expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1');
  });
});
