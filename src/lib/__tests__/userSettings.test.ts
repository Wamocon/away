import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveUserSettings, getUserSettings } from '../userSettings';
import { createClient } from '../supabase/client';

// Mock Supabase client
vi.mock('../supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('userSettings lib', () => {
  let mockSupabase: any;
  const mockResult = { data: null as any, error: null as any };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ ...mockResult })),
      // Allow 'await mockSupabase' for chainable update/insert
      then: vi.fn().mockImplementation((onFulfilled: any) => {
        return Promise.resolve({ ...mockResult }).then(onFulfilled);
      }),
    };

    (createClient as any).mockReturnValue(mockSupabase);
    mockResult.data = null;
    mockResult.error = null;
  });

  describe('saveUserSettings', () => {
    it('should update existing settings by merging', async () => {
      // Mock result of fetching (maybeSingle)
      mockSupabase.maybeSingle.mockResolvedValueOnce({ 
        data: { id: '123', settings: { old: 'val' } }, 
        error: null 
      });
      // Result of update (then)
      mockResult.error = null;

      await saveUserSettings('user-1', 'org-1', 'new@test.com', { 
        firstName: 'Max',
        lastName: 'Mustermann',
        employeeId: 'P-123'
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        settings: { 
          old: 'val', 
          email: 'new@test.com', 
          firstName: 'Max',
          lastName: 'Mustermann',
          employeeId: 'P-123'
        }
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123');
    });

    it('should insert new settings if none exist', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // Result of insert (then)
      mockResult.error = null;

      await saveUserSettings('user-1', 'org-1', 'new@test.com', { 
        firstName: 'Anna'
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith([{
        user_id: 'user-1',
        organization_id: 'org-1',
        settings: { email: 'new@test.com', firstName: 'Anna' }
      }]);
    });
  });

  describe('getUserSettings', () => {
    it('should return combined data with flattened email', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ 
        data: { 
          id: '123', 
          settings: { email: 'pref@test.com', theme: 'dark' } 
        }, 
        error: null 
      });

      const result = await getUserSettings('user-1', 'org-1');
      expect(result.email).toBe('pref@test.com');
      expect(result.settings.theme).toBe('dark');
    });

    it('should handle missing organization_id by limiting results', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await getUserSettings('user-1');
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
    });

    it('should throw on error', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('db fail') });
      await expect(getUserSettings('user-1', 'org-1')).rejects.toThrow('db fail');
    });
  });

  describe('saveUserSettings with null organizationId', () => {
    it('uses is(organization_id, null) when organizationId is null', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      mockResult.error = null;

      await saveUserSettings('user-1', null, 'a@b.de');

      // The `is` method should have been called with ('organization_id', null)
      // Since mockSupabase.eq doubles as .is via the same chain, verify the insert used null
      expect(mockSupabase.insert).toHaveBeenCalledWith([{
        user_id: 'user-1',
        organization_id: null,
        settings: { email: 'a@b.de' },
      }]);
    });

    it('throws when insert fails', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      mockResult.error = new Error('insert error');

      await expect(saveUserSettings('user-1', 'org-1', 'x@y.de')).rejects.toThrow('insert error');
    });
  });

  describe('saveUserSettings – v4.1 extended fields', () => {
    it('persists vacationQuota and carryOver', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'id-1', settings: {} },
        error: null,
      });
      mockResult.error = null;

      await saveUserSettings('user-1', 'org-1', 'a@b.de', {
        vacationQuota: 28,
        carryOver: 3,
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({ vacationQuota: 28, carryOver: 3 }),
        })
      );
    });

    it('persists deputyName and deputyEmail', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'id-2', settings: {} },
        error: null,
      });
      mockResult.error = null;

      await saveUserSettings('user-1', 'org-1', 'a@b.de', {
        deputyName: 'Lisa Müller',
        deputyEmail: 'lisa@example.de',
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            deputyName: 'Lisa Müller',
            deputyEmail: 'lisa@example.de',
          }),
        })
      );
    });

    it('persists notification preferences', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'id-3', settings: { notifyOnApproval: true } },
        error: null,
      });
      mockResult.error = null;

      await saveUserSettings('user-1', 'org-1', 'a@b.de', {
        notifyOnApproval: false,
        notifyOnRejection: true,
        notifyOnReminder: true,
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            notifyOnApproval: false,
            notifyOnRejection: true,
            notifyOnReminder: true,
          }),
        })
      );
    });

    it('merges new fields with existing settings without overwriting unrelated keys', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'id-4', settings: { theme: 'dark', language: 'de' } },
        error: null,
      });
      mockResult.error = null;

      await saveUserSettings('user-1', 'org-1', 'a@b.de', { vacationQuota: 30 });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            theme: 'dark',
            language: 'de',
            vacationQuota: 30,
          }),
        })
      );
    });
  });
});
