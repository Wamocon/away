import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateOrganizationSettings, getOrganizationSettings } from '../admin';
import { createClient } from '../supabase/client';

// Mock Supabase client
vi.mock('../supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('admin lib - organization settings', () => {
  let mockSupabase: any;
  const mockResult = { data: null as any, error: null as any };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a chainable mock object that is also a then-able
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => Promise.resolve({ ...mockResult })),
      // Allow 'await mockSupabase' to resolve to the result
      then: vi.fn().mockImplementation((onFulfilled: any) => {
        return Promise.resolve({ ...mockResult }).then(onFulfilled);
      }),
    };

    (createClient as any).mockReturnValue(mockSupabase);
    mockResult.data = null;
    mockResult.error = null;
  });

  describe('updateOrganizationSettings', () => {
    it('should fetch and merge settings before updating', async () => {
      // Mock result of fetching (single)
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { settings: { existing: 'value' } }, 
        error: null 
      });
      // Mock result of update chain (then)
      mockResult.error = null;

      const result = await updateOrganizationSettings('org-123', { new: 'setting' });

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        settings: { existing: 'value', new: 'setting' }
      });
    });

    it('should throw error if update fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
      // Return error on await chain
      mockSupabase.then.mockImplementationOnce((onFulfilled: any) => {
         return Promise.resolve({ data: null, error: new Error('Update failed') }).then(onFulfilled);
      });

      await expect(updateOrganizationSettings('org-123', {}))
        .rejects.toThrow('Update failed');
    });
  });

  describe('getOrganizationSettings', () => {
    it('should return settings object if found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { settings: { theme: 'dark' } }, 
        error: null 
      });

      const settings = await getOrganizationSettings('org-123');
      expect(settings).toEqual({ theme: 'dark' });
    });

    it('should return empty object if no settings exist', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const settings = await getOrganizationSettings('org-123');
      expect(settings).toEqual({});
    });

    it('should throw error if fetch fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('Fetch failed') });

      await expect(getOrganizationSettings('org-123'))
        .rejects.toThrow('Fetch failed');
    });
  });
});
