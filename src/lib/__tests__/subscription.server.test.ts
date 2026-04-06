/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { getSubscriptionServer, isSuperAdminServer } from "../subscription.server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// ── Shared mock supabase ─────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = { from: mockFrom };

function resetChain() {
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle, eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue({
    getAll: () => [],
    setAll: () => {},
  } as any);
  vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
  resetChain();
});

// ── getSubscriptionServer ────────────────────────────────────────────────────

describe("getSubscriptionServer", () => {
  it("returns null when orgId is empty", async () => {
    const result = await getSubscriptionServer("", "https://x.co", "anon-key", "public");
    expect(result).toBeNull();
  });

  it("returns subscription data on success", async () => {
    const sub = {
      id: "s1",
      organization_id: "org-1",
      plan_id: "plan-1",
      status: "active",
    };
    mockMaybeSingle.mockResolvedValue({ data: sub, error: null });

    const result = await getSubscriptionServer(
      "org-1",
      "https://x.co",
      "anon-key",
      "public",
    );
    expect(result).toEqual(sub);
  });

  it("returns null when data is null", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getSubscriptionServer(
      "org-1",
      "https://x.co",
      "anon-key",
      "public",
    );
    expect(result).toBeNull();
  });

  it("returns null when supabase returns an error", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error("DB failure"),
    });

    const result = await getSubscriptionServer(
      "org-1",
      "https://x.co",
      "anon-key",
      "public",
    );
    expect(result).toBeNull();
  });

  it("returns null when createServerClient throws", async () => {
    vi.mocked(createServerClient).mockImplementation(() => {
      throw new Error("crash");
    });

    const result = await getSubscriptionServer(
      "org-1",
      "https://x.co",
      "anon-key",
      "public",
    );
    expect(result).toBeNull();
  });

  it("passes schema option to createServerClient", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await getSubscriptionServer("org-1", "https://x.co", "anon-key", "wmc");

    expect(createServerClient).toHaveBeenCalledWith(
      "https://x.co",
      "anon-key",
      expect.objectContaining({ db: { schema: "wmc" } }),
    );
  });
});

// ── isSuperAdminServer ───────────────────────────────────────────────────────

describe("isSuperAdminServer", () => {
  it("returns false when userId is empty", async () => {
    const result = await isSuperAdminServer("", "https://x.co", "anon-key");
    expect(result).toBe(false);
  });

  it("returns true when user is found in super_admins", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { user_id: "super-1" },
      error: null,
    });

    const result = await isSuperAdminServer(
      "super-1",
      "https://x.co",
      "anon-key",
    );
    expect(result).toBe(true);
  });

  it("returns false when user is not in super_admins", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await isSuperAdminServer(
      "regular-user",
      "https://x.co",
      "anon-key",
    );
    expect(result).toBe(false);
  });

  it("returns false when createServerClient throws", async () => {
    vi.mocked(createServerClient).mockImplementation(() => {
      throw new Error("crash");
    });

    const result = await isSuperAdminServer(
      "user-1",
      "https://x.co",
      "anon-key",
    );
    expect(result).toBe(false);
  });

  it("queries super_admins table with the given userId", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await isSuperAdminServer("user-42", "https://x.co", "anon-key");

    expect(mockFrom).toHaveBeenCalledWith("super_admins");
  });
});
