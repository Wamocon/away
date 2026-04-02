import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  isAdmin, 
  isCIO,
  isApprover, 
  canApprove, 
  canManageUsers, 
  getUserRole,
  updateUserRole,
  ROLE_LABELS, 
  ROLE_COLORS 
} from '../roles';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

describe('roles utility helpers', () => {
  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      expect(isAdmin('admin')).toBe(true);
    });
    it('should return false for other roles', () => {
      expect(isAdmin('approver')).toBe(false);
      expect(isAdmin('employee')).toBe(false);
      expect(isAdmin(null as any)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('isApprover', () => {
    it('should return true for approver and admin roles', () => {
      expect(isApprover('approver')).toBe(true);
      expect(isApprover('admin')).toBe(true);
    });
    it('should return false for employee role', () => {
      expect(isApprover('employee')).toBe(false);
    });
  });

  describe('canApprove', () => {
    it('should return true if user is admin or approver', () => {
      expect(canApprove('admin')).toBe(true);
      expect(canApprove('approver')).toBe(true);
    });
    it('should return false for employee', () => {
      expect(canApprove('employee')).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('should only return true for admin', () => {
      expect(canManageUsers('admin')).toBe(true);
      expect(canManageUsers('approver')).toBe(false);
      expect(canManageUsers('employee')).toBe(false);
    });
  });

  describe('constants', () => {
    it('should have correct labels', () => {
      expect(ROLE_LABELS.admin).toBe('Administrator');
      expect(ROLE_LABELS.approver).toBe('Genehmiger');
      expect(ROLE_LABELS.employee).toBe('Mitarbeiter');
      expect(ROLE_LABELS.cio).toBe('CIO / GF');
    });

    it('should have defined colors', () => {
      expect(ROLE_COLORS.admin).toBeDefined();
      expect(ROLE_COLORS.cio).toBeDefined();
      expect(ROLE_COLORS.approver).toBeDefined();
      expect(ROLE_COLORS.employee).toBeDefined();
    });
  });

  describe('isCIO', () => {
    it('returns true for cio and admin', () => {
      expect(isCIO('cio')).toBe(true);
      expect(isCIO('admin')).toBe(true);
    });
    it('returns false for approver and employee', () => {
      expect(isCIO('approver')).toBe(false);
      expect(isCIO('employee')).toBe(false);
      expect(isCIO(null)).toBe(false);
    });
  });

  describe('canApprove with CIO', () => {
    it('returns true for cio', () => {
      expect(canApprove('cio')).toBe(true);
    });
  });

  describe('isApprover with CIO', () => {
    it('returns true for cio', () => {
      expect(isApprover('cio')).toBe(true);
    });
  });
});

describe('getUserRole (async)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
  });

  it('returns employee when userId or orgId is empty', async () => {
    expect(await getUserRole('', 'org-1')).toBe('employee');
    expect(await getUserRole('user-1', '')).toBe('employee');
  });

  it('returns the stored role', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { role: 'admin' }, error: null });
    expect(await getUserRole('user-1', 'org-1')).toBe('admin');
  });

  it('returns employee when no row found (null data)', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await getUserRole('user-1', 'org-1')).toBe('employee');
  });

  it('throws on error', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'db fail' } });
    await expect(getUserRole('user-1', 'org-1')).rejects.toEqual({ message: 'db fail' });
  });
});

describe('updateUserRole (async)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    // First .eq() returns mockSupabase so second .eq() can be called
    mockSupabase.eq.mockReturnValue(mockSupabase);
  });

  it('resolves without error on success', async () => {
    // Second .eq() call (last in chain) resolves
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)   // first eq → chain
      .mockResolvedValueOnce({ error: null }); // second eq → terminal
    await expect(updateUserRole('user-1', 'org-1', 'approver')).resolves.toBeUndefined();
    expect(mockSupabase.update).toHaveBeenCalledWith({ role: 'approver' });
  });

  it('throws on database error', async () => {
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ error: { message: 'upd fail' } });
    await expect(updateUserRole('user-1', 'org-1', 'cio')).rejects.toEqual({ message: 'upd fail' });
  });
});
