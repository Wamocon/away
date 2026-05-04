/**
 * documentNumbers.pgrst2.test.ts
 *
 * Second PGRST isolation file – covers paths that need isTableAvailable=true
 * at start AND involve functions that set or don't set isTableAvailable=false.
 *
 * ORDERING:
 *   1. deleteDocumentNumberById PGRST (Ln215) – safe, does NOT set isTableAvailable=false
 *   2. getUserDocumentNumbers PGRST (Ln153)   – sets isTableAvailable=false (run last)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUserDocumentNumbers,
  deleteDocumentNumberById,
} from "../documentNumbers";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/client";

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.delete.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.like.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
});

// ── SAFE test (does NOT set isTableAvailable=false) ───────────────────────────

describe("deleteDocumentNumberById – PGRST silent path (Ln215)", () => {
  it("does not throw when delete returns PGRST error (code !== PGRST is false)", async () => {
    // deleteDocumentNumberById chain: .from().delete().eq("id").eq("user_id")
    const finalEqMock = vi.fn().mockResolvedValue({
      error: { code: "PGRST", message: "table not found" },
    });
    const firstEqResult = { eq: finalEqMock };
    mockSupabase.delete.mockReturnValueOnce({ eq: vi.fn().mockReturnValue(firstEqResult) });

    await expect(
      deleteDocumentNumberById("entry-1", "user-1"),
    ).resolves.toBeUndefined();
  });
});

// ── Circuit-trigger test (sets isTableAvailable=false) – MUST run last ────────

describe("getUserDocumentNumbers – PGRST path (Ln153) [sets isTableAvailable=false]", () => {
  it("sets isTableAvailable=false and returns [] on PGRST error", async () => {
    // getUserDocumentNumbers without organizationId:
    // chain ends at .order() – make it resolve with a PGRST error
    mockSupabase.order.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST", message: "Table gone" },
    });

    const result = await getUserDocumentNumbers("user-p");
    expect(result).toEqual([]);
  });
});
