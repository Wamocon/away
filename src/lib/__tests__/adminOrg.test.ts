import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  getApproverEmails,
  updateApproverEmails,
} from "../admin";

// ── Supabase mock ────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEqUpdate = vi.fn();
const mockFromUpdate = vi.fn();

let mockGetChain: Record<string, unknown>;
let mockUpdateChain: Record<string, unknown>;

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

beforeEach(() => {
  vi.clearAllMocks();

  // GET chain: from().select().eq().single()
  mockSingle.mockReset();
  mockGetChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ single: mockSingle }),
    }),
  };

  // UPDATE chain: from().update().eq()
  mockEqUpdate.mockReset();
  mockUpdate.mockReset();
  mockUpdate.mockReturnValue({ eq: mockEqUpdate });
  mockUpdateChain = { update: mockUpdate };

  // .from() switches between GET and UPDATE behaviour based on call order
  mockSupabase.from.mockReturnValue({
    ...mockGetChain,
    ...mockUpdateChain,
  });
});

// ── getOrganizationSettings ──────────────────────────────────────────────────

describe("getOrganizationSettings", () => {
  it("returns parsed settings object on success", async () => {
    mockSingle.mockResolvedValue({
      data: { settings: { approverEmails: [{ name: "Boss", email: "b@x.de" }] } },
      error: null,
    });
    const result = await getOrganizationSettings("org-1");
    expect(result).toEqual({
      approverEmails: [{ name: "Boss", email: "b@x.de" }],
    });
  });

  it("returns empty object when settings is null", async () => {
    mockSingle.mockResolvedValue({ data: { settings: null }, error: null });
    const result = await getOrganizationSettings("org-1");
    expect(result).toEqual({});
  });

  it("throws when supabase returns an error", async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error("DB error") });
    await expect(getOrganizationSettings("org-1")).rejects.toThrow("DB error");
  });
});

// ── updateOrganizationSettings ───────────────────────────────────────────────

describe("updateOrganizationSettings", () => {
  it("merges new settings with existing and returns success", async () => {
    // First call (.select) returns existing settings
    mockSingle.mockResolvedValueOnce({
      data: { settings: { theme: "dark" } },
      error: null,
    });
    // Second call (.update) succeeds
    mockEqUpdate.mockResolvedValueOnce({ error: null });

    const result = await updateOrganizationSettings("org-1", {
      approverEmails: [],
    });
    expect(result).toEqual({ success: true });
  });

  it("continues even when fetch of existing settings fails", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: new Error("not found"),
    });
    mockEqUpdate.mockResolvedValueOnce({ error: null });

    const result = await updateOrganizationSettings("org-1", { foo: "bar" });
    expect(result).toEqual({ success: true });
  });

  it("throws when the update fails", async () => {
    mockSingle.mockResolvedValueOnce({ data: { settings: {} }, error: null });
    mockEqUpdate.mockResolvedValueOnce({ error: new Error("write failed") });

    await expect(
      updateOrganizationSettings("org-1", { foo: "bar" }),
    ).rejects.toThrow("write failed");
  });
});

// ── getApproverEmails ────────────────────────────────────────────────────────

describe("getApproverEmails", () => {
  it("returns approver email list when present", async () => {
    mockSingle.mockResolvedValue({
      data: {
        settings: {
          approverEmails: [
            { name: "Anna", email: "anna@x.de" },
            { name: "Bob", email: "bob@x.de" },
          ],
        },
      },
      error: null,
    });
    const result = await getApproverEmails("org-1");
    expect(result).toHaveLength(2);
    expect(result[0].email).toBe("anna@x.de");
  });

  it("returns empty array when no approverEmails key exists", async () => {
    mockSingle.mockResolvedValue({
      data: { settings: {} },
      error: null,
    });
    const result = await getApproverEmails("org-1");
    expect(result).toEqual([]);
  });
});

// ── updateApproverEmails ─────────────────────────────────────────────────────

describe("updateApproverEmails", () => {
  it("writes the approverEmails array into org settings", async () => {
    mockSingle.mockResolvedValueOnce({ data: { settings: {} }, error: null });
    mockEqUpdate.mockResolvedValueOnce({ error: null });

    const approvers = [{ name: "Boss", email: "boss@x.de" }];
    const result = await updateApproverEmails("org-1", approvers);
    expect(result).toEqual({ success: true });
    // Verify update was called with approverEmails
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({ approverEmails: approvers }),
      }),
    );
  });
});
