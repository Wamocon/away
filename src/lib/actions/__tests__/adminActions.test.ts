import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inviteUserToOrg } from '../adminActions';
import * as serverLib from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Mocks
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('inviteUserToOrg Logic', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  const mockAdminClient = {
    auth: {
      admin: {
        inviteUserByEmail: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    vi.mocked(serverLib.createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(createSupabaseClient).mockReturnValue(mockAdminClient as any);
  });

  it('should translate email rate limit error', async () => {
    // Setup session
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'admin-id' } } }, error: null });
    
    // Setup role check
    mockSupabase.single.mockResolvedValue({ data: { role: 'admin' }, error: null });

    // Setup invite error
    mockAdminClient.auth.admin.inviteUserByEmail.mockResolvedValue({ 
      data: {}, 
      error: { message: 'email rate limit exceeded' } 
    });

    const result = await inviteUserToOrg('test@example.com', 'org-123', 'employee', 'http://localhost:3000');
    
    expect(result.error).toContain('E-Mail-Limit überschritten');
  });

  it('should translate already registered error', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'admin-id' } } }, error: null });
    mockSupabase.single.mockResolvedValue({ data: { role: 'admin' }, error: null });
    mockAdminClient.auth.admin.inviteUserByEmail.mockResolvedValue({ 
      data: {}, 
      error: { message: 'User already registered' } 
    });

    const result = await inviteUserToOrg('test@example.com', 'org-123', 'employee', 'http://localhost:3000');
    
    expect(result.error).toBe('Dieser Benutzer ist bereits registriert.');
  });

  it('should return success on valid invitation', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'admin-id' } } }, error: null });
    mockSupabase.single.mockResolvedValue({ data: { role: 'admin' }, error: null });
    mockAdminClient.auth.admin.inviteUserByEmail.mockResolvedValue({ data: {}, error: null });

    const result = await inviteUserToOrg('test@example.com', 'org-123', 'employee', 'http://localhost:3000');
    
    expect(result.success).toBe(true);
  });
});
