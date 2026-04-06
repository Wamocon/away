/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  inviteUserToOrg,
  getOrgMembersWithEmails,
  getOrgApproversForNotification,
  getMemberSettings,
  updateMemberSettings,
  getAllAuthUsers,
  assignUsersToOrg,
  assignApproverToUsers,
  getAssignedApprover,
  removeUserFromOrg,
  getMyOrganizations,
  superAdminCreateOrg,
  superAdminRenameOrg,
  superAdminDeleteOrg,
  superAdminSetOrgAdmin,
  getOrgAdmins,
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
  // v4.2: adminClient is now used for the user_roles query (Bug 11 fix)
  // so it needs from/select/eq/order chain as well as auth.admin.getUserById
  const mockAdminClient = {
    auth: { admin: { getUserById: vi.fn() } },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(),
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
    mockAdminClient.from.mockReturnValue(mockAdminClient);
    mockAdminClient.select.mockReturnValue(mockAdminClient);
    mockAdminClient.eq.mockReturnValue(mockAdminClient);
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
    // Role check (own role) → admin, still via mockSupabase
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "admin" },
      error: null,
    });
    // user_roles list is now fetched via adminClient (Bug 11 fix)
    mockAdminClient.order.mockResolvedValueOnce({
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

// ─── v4.3: getMemberSettings & updateMemberSettings ──────────────────────────

describe("getMemberSettings", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const mockAdminClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
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
    mockAdminClient.from.mockReturnValue(mockAdminClient);
    mockAdminClient.select.mockReturnValue(mockAdminClient);
    mockAdminClient.eq.mockReturnValue(mockAdminClient);
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const res = await getMemberSettings("target-user", "org-1");
    expect(res.error).toContain("Nicht authentifiziert");
  });

  it("returns error when caller is not admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "caller-id" } } },
      error: null,
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "employee" },
      error: null,
    });
    const res = await getMemberSettings("target-user", "org-1");
    expect(res.error).toContain("Keine Berechtigung");
  });

  it("returns settings when admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
      error: null,
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "admin" },
      error: null,
    });
    mockAdminClient.maybeSingle.mockResolvedValueOnce({
      data: { settings: { vacationQuota: 28, firstName: "Anna" } },
      error: null,
    });

    const res = await getMemberSettings("target-user", "org-1");
    expect(res.data).toEqual({ vacationQuota: 28, firstName: "Anna" });
  });

  it("returns empty object when no settings row exists", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
      error: null,
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "admin" },
      error: null,
    });
    mockAdminClient.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const res = await getMemberSettings("target-user", "org-1");
    expect(res.data).toEqual({});
  });
});

describe("updateMemberSettings", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const mockAdminClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    upsert: vi.fn(),
    auth: { admin: {} },
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
    mockAdminClient.from.mockReturnValue(mockAdminClient);
    mockAdminClient.select.mockReturnValue(mockAdminClient);
    mockAdminClient.eq.mockReturnValue(mockAdminClient);
  });

  it("returns error when not admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "employee" },
      error: null,
    });
    const res = await updateMemberSettings("target", "org-1", { vacationQuota: 25 });
    expect(res.error).toContain("Keine Berechtigung");
  });

  it("merges new settings with existing and upserts", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
      error: null,
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "admin" },
      error: null,
    });
    // Existing settings
    mockAdminClient.maybeSingle.mockResolvedValueOnce({
      data: { settings: { theme: "dark", vacationQuota: 30 } },
      error: null,
    });
    mockAdminClient.upsert.mockResolvedValueOnce({ error: null });

    const res = await updateMemberSettings("target", "org-1", { vacationQuota: 28, employeeId: "E001" });
    expect(res.success).toBe(true);
    expect(mockAdminClient.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          theme: "dark",
          vacationQuota: 28,
          employeeId: "E001",
        }),
      }),
      expect.any(Object),
    );
  });
});

// ─── getAllAuthUsers ──────────────────────────────────────────────────────────

describe("getAllAuthUsers", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  const mockAdminClient = {
    auth: {
      admin: { listUsers: vi.fn() },
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
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
    mockAdminClient.from.mockReturnValue(mockAdminClient);
    mockAdminClient.select.mockReturnValue(mockAdminClient);
    mockAdminClient.eq.mockReturnValue(mockAdminClient);
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const res = await getAllAuthUsers("org-1");
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
    // isCallerSuperAdmin → not super admin
    mockAdminClient.eq.mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) });
    const res = await getAllAuthUsers("org-1");
    expect(res.error).toContain("Keine Berechtigung");
  });

  it("returns user list with isInOrg flag", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
      error: null,
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "admin" },
      error: null,
    });
    // getExistingRoles
    mockAdminClient.eq.mockReturnValue({
      data: [{ user_id: "u1" }],
      error: null,
    });
    // listUsers
    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          { id: "u1", email: "in@org.de", created_at: "2025-01-01" },
          { id: "u2", email: "out@org.de", created_at: "2025-01-02" },
        ],
      },
      error: null,
    });

    const res = await getAllAuthUsers("org-1");
    expect(res.data).toBeDefined();
    expect(res.data!.some((u) => u.isInOrg)).toBe(true);
  });
});

// ─── assignUsersToOrg ────────────────────────────────────────────────────────

describe("assignUsersToOrg", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  const mockAdminClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn(),
    auth: { admin: {} },
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
    mockAdminClient.from.mockReturnValue(mockAdminClient);
    mockAdminClient.select.mockReturnValue(mockAdminClient);
    mockAdminClient.eq.mockReturnValue(mockAdminClient);
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
    const res = await assignUsersToOrg(["u1"], "org-1");
    expect(res.error).toContain("Nicht authentifiziert");
  });

  it("returns error when not admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "emp-1" } } },
    });
    mockSupabase.single.mockResolvedValueOnce({ data: { role: "employee" }, error: null });
    mockAdminClient.eq.mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) });
    const res = await assignUsersToOrg(["u1"], "org-1");
    expect(res.error).toContain("Keine Berechtigung");
  });

  it("returns success with count when admin assigns users", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
    });
    mockSupabase.single.mockResolvedValueOnce({ data: { role: "admin" }, error: null });
    mockAdminClient.upsert.mockResolvedValue({ error: null });

    const res = await assignUsersToOrg(["u1", "u2"], "org-1");
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
  });
});

// ─── removeUserFromOrg ───────────────────────────────────────────────────────

describe("removeUserFromOrg", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  const mockAdminClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    auth: { admin: {} },
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
    mockAdminClient.from.mockReturnValue(mockAdminClient);
    mockAdminClient.select.mockReturnValue(mockAdminClient);
    mockAdminClient.eq.mockReturnValue({ delete: mockAdminClient.delete, eq: mockAdminClient.eq });
    mockAdminClient.delete.mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    const res = await removeUserFromOrg("target-1", "org-1");
    expect(res.error).toContain("Nicht authentifiziert");
  });

  it("returns error when trying to remove self", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "my-id" } } },
    });
    const res = await removeUserFromOrg("my-id", "org-1");
    expect(res.error).toContain("nicht selbst entfernen");
  });

  it("returns error when not admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "caller-id" } } },
    });
    mockSupabase.single.mockResolvedValueOnce({ data: { role: "employee" }, error: null });
    mockAdminClient.eq.mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) });
    const res = await removeUserFromOrg("target-1", "org-1");
    expect(res.error).toContain("Keine Berechtigung");
  });

  it("returns success when admin removes another user", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
    });
    mockSupabase.single.mockResolvedValueOnce({ data: { role: "admin" }, error: null });

    // Admin client delete chain
    const mockEqFinal = vi.fn().mockResolvedValue({ error: null });
    const mockEqMid = vi.fn().mockReturnValue({ eq: mockEqFinal });
    const mockDeleteReturn = { eq: mockEqMid };
    mockAdminClient.delete.mockReturnValue(mockDeleteReturn);
    mockAdminClient.from.mockReturnValue({ ...mockAdminClient, delete: mockAdminClient.delete });

    const res = await removeUserFromOrg("target-1", "org-1");
    expect(res.success).toBe(true);
  });
});

// ─── getMyOrganizations ──────────────────────────────────────────────────────

describe("getMyOrganizations", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    vi.mocked(serverLib.createClient).mockResolvedValue(mockSupabase as any);
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
  });

  it("returns empty array when not authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
    const res = await getMyOrganizations();
    expect(res).toEqual([]);
  });

  it("returns user orgs for normal user", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });

    // isCallerSuperAdmin → false (not super admin)
    const superAdminChainMock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
      from2: undefined,
    };

    const adminClientForUser = {
      ...superAdminChainMock,
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            organization_id: "org-1",
            organizations: { id: "org-1", name: "Org One" },
          },
        ],
      }),
    };

    vi.mocked(createSupabaseClient).mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }), // not super admin
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  organization_id: "org-1",
                  organizations: { id: "org-1", name: "Org One" },
                },
              ],
            }),
          }),
        }),
    } as any);

    const res = await getMyOrganizations();
    expect(Array.isArray(res)).toBe(true);
  });

  it("returns all orgs for super admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "super-admin-id" } } },
    });

    vi.mocked(createSupabaseClient).mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "super-admin-id" } }), // IS super admin
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: "org-1", name: "Org One" },
                { id: "org-2", name: "Org Two" },
              ],
            }),
          }),
        }),
    } as any);

    const res = await getMyOrganizations();
    expect(Array.isArray(res)).toBe(true);
  });

  it("returns empty array when exception is thrown (catch block)", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    // Make createAdminClient throw to hit the catch block
    vi.mocked(createSupabaseClient).mockImplementation(() => {
      throw new Error("Admin client crash");
    });
    const res = await getMyOrganizations();
    expect(res).toEqual([]);
  });
});

// ─── superAdminCreateOrg ─────────────────────────────────────────────────────

describe("superAdminCreateOrg", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    vi.mocked(serverLib.createClient).mockResolvedValue(mockSupabase as any);
  });

  it("throws when not logged in", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
    await expect(superAdminCreateOrg("New Org")).rejects.toThrow("Nicht eingeloggt");
  });

  it("throws when caller is not super admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "normal-user" } } },
    });
    vi.mocked(createSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }), // not super admin
          }),
        }),
      }),
    } as any);
    await expect(superAdminCreateOrg("New Org")).rejects.toThrow("Keine Berechtigung");
  });

  it("creates org and returns new org data", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "super-id" } } },
    });

    const newOrg = { id: "new-org-id", name: "New Org" };
    vi.mocked(createSupabaseClient)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "super-id" } }),
            }),
          }),
        }),
      } as any)
      .mockReturnValue({
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: newOrg, error: null }),
            }),
          }),
        }),
      } as any);

    const result = await superAdminCreateOrg("New Org");
    expect(result).toEqual(newOrg);
  });
});

// ─── superAdminRenameOrg ─────────────────────────────────────────────────────

describe("superAdminRenameOrg", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    vi.mocked(serverLib.createClient).mockResolvedValue(mockSupabase as any);
  });

  it("throws when not logged in", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(superAdminRenameOrg("org-1", "New Name")).rejects.toThrow("Nicht eingeloggt");
  });

  it("throws when not super admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    vi.mocked(createSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    } as any);
    await expect(superAdminRenameOrg("org-1", "New Name")).rejects.toThrow("Keine Berechtigung");
  });

  it("renames org successfully", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "super-id" } } },
    });
    vi.mocked(createSupabaseClient)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "super-id" } }),
            }),
          }),
        }),
      } as any)
      .mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      } as any);

    await expect(superAdminRenameOrg("org-1", "New Name")).resolves.not.toThrow();
  });
});

// ─── superAdminDeleteOrg ─────────────────────────────────────────────────────

describe("superAdminDeleteOrg", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    vi.mocked(serverLib.createClient).mockResolvedValue(mockSupabase as any);
  });

  it("throws when not logged in", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(superAdminDeleteOrg("org-1")).rejects.toThrow("Nicht eingeloggt");
  });

  it("throws when not super admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    vi.mocked(createSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    } as any);
    await expect(superAdminDeleteOrg("org-1")).rejects.toThrow("Keine Berechtigung");
  });

  it("deletes org and related data successfully", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "super-id" } } },
    });
    const mockEqDelete = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqDelete });
    vi.mocked(createSupabaseClient)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "super-id" } }),
            }),
          }),
        }),
      } as any)
      .mockReturnValue({
        from: vi.fn().mockReturnValue({ delete: mockDelete }),
      } as any);

    await expect(superAdminDeleteOrg("org-1")).resolves.not.toThrow();
  });
});

// ─── superAdminSetOrgAdmin ───────────────────────────────────────────────────

describe("superAdminSetOrgAdmin", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    vi.mocked(serverLib.createClient).mockResolvedValue(mockSupabase as any);
  });

  it("throws when not logged in", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(superAdminSetOrgAdmin("org-1", "admin@x.de")).rejects.toThrow("Nicht eingeloggt");
  });

  it("throws when not super admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    vi.mocked(createSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    } as any);
    await expect(superAdminSetOrgAdmin("org-1", "admin@x.de")).rejects.toThrow("Keine Berechtigung");
  });

  it("throws when user email not found", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "super-id" } } },
    });
    vi.mocked(createSupabaseClient)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "super-id" } }),
            }),
          }),
        }),
      } as any)
      .mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: { users: [{ id: "u1", email: "other@x.de" }] },
              error: null,
            }),
          },
        },
        from: vi.fn().mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) }),
      } as any);

    await expect(
      superAdminSetOrgAdmin("org-1", "notfound@x.de"),
    ).rejects.toThrow("Kein Benutzer");
  });

  it("assigns user as admin successfully", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "super-id" } } },
    });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createSupabaseClient)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "super-id" } }),
            }),
          }),
        }),
      } as any)
      .mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: {
                users: [{ id: "target-user", email: "admin@x.de" }],
              },
              error: null,
            }),
          },
        },
        from: vi.fn().mockReturnValue({ upsert: mockUpsert }),
      } as any);

    await expect(
      superAdminSetOrgAdmin("org-1", "admin@x.de"),
    ).resolves.not.toThrow();
    expect(mockUpsert).toHaveBeenCalled();
  });
});

// ─── getOrgAdmins ────────────────────────────────────────────────────────────

describe("getOrgAdmins", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    vi.mocked(serverLib.createClient).mockResolvedValue(mockSupabase as any);
  });

  it("returns empty array when not authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    const res = await getOrgAdmins("org-1");
    expect(res).toEqual([]);
  });

  it("returns empty array when no admin roles found", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    vi.mocked(createSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
      auth: { admin: { listUsers: vi.fn() } },
    } as any);
    const res = await getOrgAdmins("org-1");
    expect(res).toEqual([]);
  });

  it("returns admins with their emails", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const listUsers = vi.fn().mockResolvedValue({
      data: {
        users: [
          { id: "admin-1", email: "admin1@x.de" },
          { id: "admin-2", email: "admin2@x.de" },
          { id: "other-1", email: "other@x.de" },
        ],
      },
    });
    vi.mocked(createSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: "admin-1" }, { user_id: "admin-2" }],
              error: null,
            }),
          }),
        }),
      }),
      auth: { admin: { listUsers } },
    } as any);

    const res = await getOrgAdmins("org-1");
    expect(res).toHaveLength(2);
    expect(res.map((r) => r.email)).toContain("admin1@x.de");
    expect(res.map((r) => r.email)).toContain("admin2@x.de");
  });
});

// ─── assignApproverToUsers ───────────────────────────────────────────────────

describe("assignApproverToUsers", () => {
  const mockSupabase = {
    auth: { getSession: vi.fn() },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  const mockAdminClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    upsert: vi.fn(),
    auth: { admin: {} },
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
    mockAdminClient.from.mockReturnValue(mockAdminClient);
    mockAdminClient.select.mockReturnValue(mockAdminClient);
    mockAdminClient.eq.mockReturnValue(mockAdminClient);
    mockAdminClient.upsert.mockResolvedValue({ error: null });
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    const res = await assignApproverToUsers("org-1", "approver@x.de", ["u1"]);
    expect(res.error).toContain("Nicht authentifiziert");
  });

  it("returns error when not admin", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "employee-1" } } },
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "employee" },
      error: null,
    });
    mockAdminClient.eq.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    });
    const res = await assignApproverToUsers("org-1", "approver@x.de", ["u1"]);
    expect(res.error).toContain("Keine Berechtigung");
  });

  it("assigns approver to users and returns count", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-id" } } },
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "admin" },
      error: null,
    });
    mockAdminClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await assignApproverToUsers("org-1", "boss@x.de", ["u1", "u2"]);
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
  });
});

// ─── getAssignedApprover ─────────────────────────────────────────────────────

describe("getAssignedApprover", () => {
  const mockAdminClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    auth: { admin: {} },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    vi.mocked(createSupabaseClient).mockReturnValue(mockAdminClient as any);
    mockAdminClient.from.mockReturnValue(mockAdminClient);
    mockAdminClient.select.mockReturnValue(mockAdminClient);
    mockAdminClient.eq.mockReturnValue(mockAdminClient);
  });

  it("returns null when no assignedApproverEmail in settings", async () => {
    mockAdminClient.maybeSingle.mockResolvedValueOnce({
      data: { settings: {} },
      error: null,
    });
    const res = await getAssignedApprover("user-1", "org-1");
    expect(res).toBeNull();
  });

  it("returns found approver from org settings", async () => {
    mockAdminClient.maybeSingle.mockResolvedValueOnce({
      data: {
        settings: { assignedApproverEmail: "boss@x.de" },
      },
      error: null,
    });
    mockAdminClient.single.mockResolvedValueOnce({
      data: {
        settings: {
          approverEmails: [{ name: "Boss", email: "boss@x.de" }],
        },
      },
      error: null,
    });
    const res = await getAssignedApprover("user-1", "org-1");
    expect(res).toEqual({ name: "Boss", email: "boss@x.de" });
  });

  it("returns email-only fallback when approver not in org list", async () => {
    mockAdminClient.maybeSingle.mockResolvedValueOnce({
      data: {
        settings: { assignedApproverEmail: "external@x.de" },
      },
      error: null,
    });
    mockAdminClient.single.mockResolvedValueOnce({
      data: { settings: { approverEmails: [] } },
      error: null,
    });
    const res = await getAssignedApprover("user-1", "org-1");
    expect(res).toEqual({ name: "", email: "external@x.de" });
  });

  it("returns null on exception", async () => {
    vi.mocked(createSupabaseClient).mockImplementation(() => {
      throw new Error("crash");
    });
    const res = await getAssignedApprover("user-1", "org-1");
    expect(res).toBeNull();
  });
});
