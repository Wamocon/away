import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isDocumentIdUsed,
  registerDocumentId,
  getNextDocumentCounter,
} from "../documentNumbers";
import { createClient } from "../supabase/client";

vi.mock("../supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("documentNumbers lib", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi
        .fn()
        .mockImplementation(() => Promise.resolve({ error: null })),
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe("isDocumentIdUsed", () => {
    it("returns false for empty documentId", async () => {
      const used = await isDocumentIdUsed("org-1", "   ");
      expect(used).toBe(false);
    });

    it("returns true if document ID exists", async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ count: 1, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.select.mockReturnValue({ eq: mockEq1 });

      const used = await isDocumentIdUsed("org-1", "DOC-001");
      expect(used).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("document_numbers");
    });

    it("returns false if document ID does not exist", async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ count: 0, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.select.mockReturnValue({ eq: mockEq1 });

      const used = await isDocumentIdUsed("org-1", "DOC-002");
      expect(used).toBe(false);
    });

    it("returns false and logs on non-PGRST error", async () => {
      const mockEq2 = vi.fn().mockResolvedValue({
        count: null,
        error: { code: "OTHER", message: "err" },
      });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.select.mockReturnValue({ eq: mockEq1 });

      const used = await isDocumentIdUsed("org-1", "DOC-ERR");
      expect(used).toBe(false);
    });
  });

  describe("getNextDocumentCounter", () => {
    it("returns 0 when no documents exist", async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });
      const next = await getNextDocumentCounter("org-1", "ANT-");
      expect(next).toBe(0);
    });

    it("returns 0 when data is null", async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: null, error: null });
      const next = await getNextDocumentCounter("org-1", "ANT-");
      expect(next).toBe(0);
    });

    it("increments the last numeric suffix", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [{ document_id: "ANT-007" }],
        error: null,
      });
      const next = await getNextDocumentCounter("org-1", "ANT-");
      expect(next).toBe(8);
    });

    it("returns 0 if document_id has no numeric suffix", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [{ document_id: "ANT-XYZ" }],
        error: null,
      });
      const next = await getNextDocumentCounter("org-1", "ANT-");
      expect(next).toBe(0);
    });

    it("returns 0 on query error", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: { code: "OTHER", message: "err" },
      });
      const next = await getNextDocumentCounter("org-1", "ANT-");
      expect(next).toBe(0);
    });

    // v4.1 – Belegnummer format: suffix-based extraction (no trailing-digits confusion)
    it("extracts suffix after prefix correctly (v4.1 fix)", async () => {
      // prefix 'NSC2026' (length 8), doc_id 'NSC20265' → suffix '5' → next = 6
      mockSupabase.limit.mockResolvedValueOnce({
        data: [{ document_id: "NSC20265" }],
        error: null,
      });
      const next = await getNextDocumentCounter("org-1", "NSC2026");
      expect(next).toBe(6);
    });

    it("produces single-digit counter without zero-padding", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [{ document_id: "NSC20265" }],
        error: null,
      });
      const next = await getNextDocumentCounter("org-1", "NSC2026");
      expect(next).toBe(6);
      // v4.1: counter is NOT zero-padded – `NSC20266` not `NSC202606`
      const belegnummer = `NSC2026${next}`;
      expect(belegnummer).toBe("NSC20266");
      expect(belegnummer).not.toContain("06");
    });

    it("counter starts at 0 for a new year prefix", async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });
      const next = await getNextDocumentCounter("org-1", "NSC2030");
      expect(next).toBe(0);
      expect(`NSC2030${next}`).toBe("NSC20300");
    });
  });

  describe("registerDocumentId", () => {
    it("inserts the document ID successfully", async () => {
      mockSupabase.insert.mockResolvedValue({ error: null });

      await registerDocumentId("org-1", "user-1", "DOC-003");
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          organization_id: "org-1",
          user_id: "user-1",
          document_id: "DOC-003",
        },
      ]);
    });

    it("returns early for empty documentId", async () => {
      await registerDocumentId("org-1", "user-1", "   ");
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it("throws 23505 duplicate key error", async () => {
      mockSupabase.insert.mockResolvedValue({ error: { code: "23505" } });

      await expect(
        registerDocumentId("org-1", "user-1", "DOC-DUP"),
      ).rejects.toThrow("Diese Belegnummer wurde bereits vergeben.");
    });

    it("does not throw on non-PGRST warning errors", async () => {
      mockSupabase.insert.mockResolvedValue({
        error: { code: "WARN", message: "permission issue" },
      });
      // Should not throw, just warn
      await expect(
        registerDocumentId("org-1", "user-1", "DOC-WARN"),
      ).resolves.toBeUndefined();
    });
  });
});
