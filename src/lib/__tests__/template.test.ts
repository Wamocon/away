import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadTemplate, getTemplatesForOrg, getTemplateUrl } from '../template';

const mockStorage = {
  from: vi.fn().mockReturnThis(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
};

const mockDb = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  insert: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      // Always return the mockDb chain
      mockDb.from(table);
      return mockDb;
    },
    storage: mockStorage,
  }),
}));

describe('template lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.from.mockReturnValue(mockDb);
    mockDb.select.mockReturnValue(mockDb);
    mockDb.eq.mockReturnValue(mockDb);
    mockDb.maybeSingle.mockReturnValue(mockDb);
  });

  describe('getTemplatesForOrg', () => {
    it('returns templates for the org', async () => {
      mockDb.eq.mockResolvedValueOnce({ data: [{ id: 1, file_name: 'template.docx' }], error: null });
      const result = await getTemplatesForOrg('org-1');
      expect(result).toEqual([{ id: 1, file_name: 'template.docx' }]);
    });

    it('throws on error', async () => {
      mockDb.eq.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
      await expect(getTemplatesForOrg('org-1')).rejects.toEqual({ message: 'db error' });
    });
  });

  describe('uploadTemplate', () => {
    it('uploads file and inserts record when it does not exist', async () => {
      const file = new File(['content'], 'new-template.docx', { type: 'application/octet-stream' });
      mockStorage.from.mockReturnValue(mockStorage);
      mockStorage.upload.mockResolvedValueOnce({ data: { path: 'org-1/new-template.docx' }, error: null });
      // maybeSingle for existing check → null (not existing)
      mockDb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // insert
      mockDb.insert.mockResolvedValueOnce({ data: null, error: null });

      const result = await uploadTemplate('org-1', file);
      expect(result).toEqual({ path: 'org-1/new-template.docx' });
      expect(mockStorage.upload).toHaveBeenCalledWith(
        'org-1/new-template.docx',
        file,
        expect.any(Object),
      );
      expect(mockDb.insert).toHaveBeenCalledWith([{ organization_id: 'org-1', file_name: 'new-template.docx' }]);
    });

    it('skips insert when template already exists', async () => {
      const file = new File(['content'], 'existing.docx');
      mockStorage.from.mockReturnValue(mockStorage);
      mockStorage.upload.mockResolvedValueOnce({ data: { path: 'org-1/existing.docx' }, error: null });
      // maybeSingle returns existing record
      mockDb.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing-id' }, error: null });

      const result = await uploadTemplate('org-1', file);
      expect(result).toEqual({ path: 'org-1/existing.docx' });
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('throws on storage upload error', async () => {
      const file = new File(['content'], 'fail.docx');
      mockStorage.from.mockReturnValue(mockStorage);
      mockStorage.upload.mockResolvedValueOnce({ data: null, error: { message: 'storage fail' } });

      await expect(uploadTemplate('org-1', file)).rejects.toEqual({ message: 'storage fail' });
    });

    it('throws on db insert error', async () => {
      const file = new File(['content'], 'dberr.docx');
      mockStorage.from.mockReturnValue(mockStorage);
      mockStorage.upload.mockResolvedValueOnce({ data: { path: 'p' }, error: null });
      mockDb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      mockDb.insert.mockResolvedValueOnce({ data: null, error: { message: 'insert fail' } });

      await expect(uploadTemplate('org-1', file)).rejects.toEqual({ message: 'insert fail' });
    });
  });

  describe('getTemplateUrl', () => {
    it('returns public URL', () => {
      mockStorage.from.mockReturnValue(mockStorage);
      mockStorage.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/t.docx' } });

      const url = getTemplateUrl('org-1', 'template.docx');
      expect(url).resolves.toBe('https://cdn.example.com/t.docx');
    });
  });
});
