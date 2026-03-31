import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isDocumentIdUsed, registerDocumentId } from '../documentNumbers';
import { createClient } from '../supabase/client';

vi.mock('../supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('documentNumbers lib', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation(() => Promise.resolve({ error: null })),
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe('isDocumentIdUsed', () => {
    it('should return true if document ID exists in the organization', async () => {
      mockSupabase.select.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb: any) => cb({ count: 1, error: null }))
      });

      // Need to mock the chain correctly for isDocumentIdUsed
      // .from().select().eq().eq()
      const mockEq2 = vi.fn().mockResolvedValue({ count: 1, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.select.mockReturnValue({ eq: mockEq1 });

      const used = await isDocumentIdUsed('org-1', 'DOC-001');
      expect(used).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('document_numbers');
    });

    it('should return false if document ID does not exist', async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ count: 0, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.select.mockReturnValue({ eq: mockEq1 });

      const used = await isDocumentIdUsed('org-1', 'DOC-002');
      expect(used).toBe(false);
    });
  });

  describe('registerDocumentId', () => {
    it('should insert the document ID successfully', async () => {
      mockSupabase.insert.mockResolvedValue({ error: null });

      await registerDocumentId('org-1', 'user-1', 'DOC-003');
      expect(mockSupabase.insert).toHaveBeenCalledWith([{
        organization_id: 'org-1',
        user_id: 'user-1',
        document_id: 'DOC-003'
      }]);
    });

    it('should throw an error if document ID is already taken (Postgres error 23505)', async () => {
      mockSupabase.insert.mockResolvedValue({ error: { code: '23505' } });

      await expect(registerDocumentId('org-1', 'user-1', 'DOC-DUP'))
        .rejects.toThrow('Diese Belegnummer wurde bereits vergeben.');
    });
  });
});
