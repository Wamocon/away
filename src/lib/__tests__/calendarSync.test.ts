import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveOAuthSettings, getOAuthSettings } from '../calendarSync';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  upsert: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

describe('calendarSync lib', () => {
  const VALID_ID = '00000000-0000-4000-a000-000000000000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw if userId or orgId is missing', async () => {
    await expect(saveOAuthSettings('', VALID_ID, 'outlook', 'test@test.com', 'token'))
      .rejects.toThrow('Benutzer-ID fehlt oder ist ungültig.');
  });

  it('should call upsert if valid data provided', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.upsert.mockResolvedValueOnce({ error: null });
    
    await saveOAuthSettings(VALID_ID, VALID_ID, 'outlook', 'test@test.com', 'token');
    
    expect(mockSupabase.from).toHaveBeenCalledWith('user_settings');
    expect(mockSupabase.upsert).toHaveBeenCalled();
  });

  it('should return null if userId or orgId is missing in getOAuthSettings', async () => {
    const result = await getOAuthSettings('', '', 'google');
    expect(result).toBeNull();
  });
});
