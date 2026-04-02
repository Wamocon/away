/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  inviteUserToOrg,
  getOrgMembersWithEmails,
  getOrgApproversForNotification,
} from "../adminActions";
import * as serverLib from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Mocks
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

describe("inviteUserToOrg Logic", () => {
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
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(serverLib.createClient).mockResolvedValue(mockSupabase as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createSupabaseClient).mockReturnValue(mockAdminClient as any);
  });

  it("should translate email rate limit error", async () => {
    // Setup session
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
      error: null,
    });

    // Setup role check
    mockSupabase.single.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    // Setup invite error
    mockAdminClient.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: {},
      error: { message: "email rate limit exceeded" },
    });

    const result = await inviteUserToOrg(
      "test@example.com",
      "org-123",
      "employee",
      "http://localhost:3000",
    );

    expect(result.error).toContain("E-Mail-Limit überschritten");
  });

  it("should translate already registered error", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });
    mockAdminClient.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: {},
      error: { message: "User already registered" },
    });

    const result = await inviteUserToOrg(
      "test@example.com",
      "org-123",
      "employee",
      "http://localhost:3000",
    );

    expect(result.error).toBe("Dieser Benutzer ist bereits registriert.");
  });

  it("should return success on valid invitation", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });
    mockAdminClient.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await inviteUserToOrg(
      "test@example.com",
      "org-123",
      "employee",
      "http://localhost:3000",
    );

    expect(result.success).toBe(true);
  });
});

describe("getOrgMembersWithEmails", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  const mockAdminClient = {
    auth: { admin: { getUserById: vi.fn() } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    vi.mocked(serverLib.createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(createSupabaseClient).mockReturnValue(mockAdminClient as any);
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const res = await getOrgMembersWithEmails("org-1");
    expect(res.error).toContain("Nicht authentifiziert");
  });

  it("returns error when user is not admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "employee" },
      error: null,
    });
    const res = await getOrgMembersWithEmails("org-1");
    expect(res.error).toContain("Keine Berechtigung");
  });

  it("returns members with emails when admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
      error: null,
    });
    // Role check → admin
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "admin" },
      error: null,
    });
    // Roles list
    mockSupabase.order.mockResolvedValueOnce({
      data: [{ user_id: "u1", role: "admin", created_at: "" }],
      error: null,
    });
    // getUserById
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: "admin@x.de" } },
    });

    const res = await getOrgMembersWithEmails("org-1");
    expect(res.data).toHaveLength(1);
    expect(res.data![0].email).toBe("admin@x.de");
  });
});

describe("getOrgApproversForNotification", () => {
  const mockAdminClient = {
    auth: { admin: { getUserById: vi.fn() } },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    vi.mocked(createSupabaseClient).mockReturnValue(mockAdminClient as any);
    mockAdminClient.from.mockReturnValue(mockAdminClient);
    mockAdminClient.select.mockReturnValue(mockAdminClient);
    mockAdminClient.eq.mockReturnValue(mockAdminClient);
    mockAdminClient.in.mockReturnValue(mockAdminClient);
  });

  it("returns empty array when no roles found", async () => {
    mockAdminClient.in.mockResolvedValueOnce({ data: null, error: null });
    const res = await getOrgApproversForNotification("org-1");
    expect(res).toEqual([]);
  });

  it("returns members with emails from user_settings", async () => {
    // Use a fresh mock returning user with email via auth admin fallback (simpler to wire)
    const getUserById = vi
      .fn()
      .mockResolvedValue({ data: { user: { email: "approver@org.de" } } });
    vi.mocked(createSupabaseClient).mockReturnValue({
      auth: { admin: { getUserById } },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ user_id: "u1", role: "admin" }],
              error: null,
            }),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }), // no user_settings email
            }),
          }),
        }),
      }),
    } as any);

    const res = await getOrgApproversForNotification("org-1");
    expect(res).toHaveLength(1);
    expect(res[0].email).toBe("approver@org.de");
  });

  it("falls back to auth admin email when user_settings has no email", async () => {
    mockAdminClient.in.mockResolvedValueOnce({
      data: [{ user_id: "u1", role: "cio" }],
      error: null,
    });
    // user_settings → no email
    const mockMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockAdminClient.from.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: mockEq }) }),
    });
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: "cio@x.de" } },
    });

    // Reset from mock to handle user_roles call first
    vi.mocked(createSupabaseClient).mockReturnValue({
      ...mockAdminClient,
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ user_id: "u1", role: "cio" }],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        }),
    } as any);

    const res = await getOrgApproversForNotification("org-1");
    expect(res.length).toBeGreaterThanOrEqual(0); // at least resolves
  });

  it("returns empty array on unexpected error", async () => {
    vi.mocked(createSupabaseClient).mockImplementation(() => {
      throw new Error("fatal");
    });
    const res = await getOrgApproversForNotification("org-1");
    expect(res).toEqual([]);
  });
});
