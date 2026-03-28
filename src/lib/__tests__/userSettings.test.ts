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

      await saveUserSettings('user-1', 'org-1', 'new@test.com', { lang: 'de' });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        settings: { old: 'val', email: 'new@test.com', lang: 'de' }
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123');
    });

    it('should insert new settings if none exist', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // Result of insert (then)
      mockResult.error = null;

      await saveUserSettings('user-1', 'org-1', 'new@test.com', { lang: 'en' });

      expect(mockSupabase.insert).toHaveBeenCalledWith([{
        user_id: 'user-1',
        organization_id: 'org-1',
        settings: { email: 'new@test.com', lang: 'en' }
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
  });
});
