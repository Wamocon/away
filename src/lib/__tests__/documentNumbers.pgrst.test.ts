/**
 * documentNumbers.pgrst.test.ts
 *
 * Separate test file – each Vitest worker gets a FRESH module instance.
 * This resets isTableAvailable=true at startup, allowing us to test PGRST
 * error paths that set isTableAvailable=false.
 *
 * ORDERING IS CRITICAL:
 *   Tests that set isTableAvailable=false MUST run LAST in this file.
 *   Covered lines:
 *     – getUserDocumentNumbers null data  → Ln165 (data ?? [] branch)
 *     – registerDocumentId PGRST          → Ln129 (sets isTableAvailable=false – run last)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerDocumentId,
  getUserDocumentNumbers,
} from "../documentNumbers";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/client";

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
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
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.like.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
});

// ── SAFE tests (do NOT set isTableAvailable=false) ────────────────────────────

describe("getUserDocumentNumbers – null data path (Ln165)", () => {
  it("returns [] when data is null (data ?? [] branch)", async () => {
    // Chain ends at .order() – make it resolve with data=null, no error
    mockSupabase.order.mockResolvedValueOnce({ data: null, error: null });

    const result = await getUserDocumentNumbers("user-null");
    expect(result).toEqual([]);
  });
});

// ── Circuit-trigger tests (set isTableAvailable=false) – MUST run last ────────

describe("registerDocumentId – PGRST path (Ln129) [sets isTableAvailable=false]", () => {
  it("sets isTableAvailable=false and returns when insert returns PGRST error", async () => {
    mockSupabase.insert.mockResolvedValueOnce({
      error: { code: "PGRST", message: "Table not found" },
    });
    await expect(
      registerDocumentId("org-pgrst", "user-pgrst", "DOC-P001"),
    ).resolves.toBeUndefined();
  });
});


