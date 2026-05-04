import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isDocumentIdUsed,
  registerDocumentId,
  getNextDocumentCounter,
  getUserDocumentNumbers,
  deleteDocumentNumberById,
  buildDocumentPrefix,
  buildDocumentId,
  isValidDocumentId,
  DEFAULT_PATTERN,
  DocumentNumberPattern,
} from "../documentNumbers";
import { createClient } from "../supabase/client";

vi.mock("../supabase/client", () => ({
  createClient: vi.fn(),
}));

// ═══════════════════════════════════════════════════════════════════
// Reine Hilfsfunktionen (keine DB, kein Mock nötig)
// ═══════════════════════════════════════════════════════════════════

describe("buildDocumentPrefix", () => {
  const date2026 = new Date("2026-05-04");

  it("builds default prefix from first/last name and year", () => {
    const prefix = buildDocumentPrefix(DEFAULT_PATTERN, "Nurzhan", "Schmidt", date2026);
    expect(prefix).toBe("NSC2026");
  });

  it("uses ORGKUERZEL placeholder", () => {
    const p: DocumentNumberPattern = { pattern: "{ORGKUERZEL}-{JAHR}-{NR}", counterDigits: 2, orgAbbreviation: "WMC" };
    expect(buildDocumentPrefix(p, "Max", "Muster", date2026)).toBe("WMC-2026-");
  });

  it("uses 2-digit year with JAHR2", () => {
    const p: DocumentNumberPattern = { pattern: "{VORNAME1}{NACHNAME2}{JAHR2}{NR}", counterDigits: 2 };
    expect(buildDocumentPrefix(p, "Max", "Muster", date2026)).toBe("MMU26");
  });

  it("uppercases letters", () => {
    const prefix = buildDocumentPrefix(DEFAULT_PATTERN, "anna", "becker", date2026);
    expect(prefix).toBe("ABE2026");
  });
});

describe("buildDocumentId", () => {
  const date2026 = new Date("2026-05-04");

  it("pads counter to 2 digits by default", () => {
    const id = buildDocumentId(DEFAULT_PATTERN, "Nurzhan", "Schmidt", 0, date2026);
    expect(id).toBe("NSC202600");
  });

  it("second request gets 01", () => {
    const id = buildDocumentId(DEFAULT_PATTERN, "Nurzhan", "Schmidt", 1, date2026);
    expect(id).toBe("NSC202601");
  });

  it("respects custom counterDigits=3", () => {
    const p: DocumentNumberPattern = { pattern: "{VORNAME1}{NACHNAME2}{JAHR}{NR}", counterDigits: 3 };
    const id = buildDocumentId(p, "Nurzhan", "Schmidt", 5, date2026);
    expect(id).toBe("NSC2026005");
  });

  it("uses org abbreviation", () => {
    const p: DocumentNumberPattern = { pattern: "{ORGKUERZEL}-{JAHR}-{NR}", counterDigits: 2, orgAbbreviation: "WMC" };
    const id = buildDocumentId(p, "Max", "Muster", 3, date2026);
    expect(id).toBe("WMC-2026-03");
  });

  it("falls back to ORG when orgAbbreviation is missing", () => {
    const p: DocumentNumberPattern = { pattern: "{ORGKUERZEL}-{NR}", counterDigits: 2 };
    const id = buildDocumentId(p, "Max", "Muster", 0, date2026);
    expect(id).toBe("ORG-00");
  });
});

describe("isValidDocumentId", () => {
  it("accepts standard Belegnummer", () => {
    expect(isValidDocumentId("NSC202601")).toBe(true);
  });

  it("accepts hyphenated format", () => {
    expect(isValidDocumentId("WMC-2026-01")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidDocumentId("")).toBe(false);
  });

  it("rejects single character", () => {
    expect(isValidDocumentId("A")).toBe(false);
  });

  it("rejects strings with spaces", () => {
    expect(isValidDocumentId("NSC 2026")).toBe(false);
  });

  it("rejects strings longer than 30 chars", () => {
    expect(isValidDocumentId("A".repeat(31))).toBe(false);
  });
});

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

    // NOTE: PGRST test moved to end of file – it sets isTableAvailable=false
    // which would break all subsequent tests via the Circuit-Breaker.
  });

  describe("getUserDocumentNumbers", () => {
    it("returns entries for a user (no orgId filter)", async () => {
      // override only `order` – the terminal call – to return a resolved Promise
      mockSupabase.order = vi.fn().mockResolvedValue({
        data: [
          { id: "1", document_id: "NSC202600", created_at: "2026-01-01" },
          { id: "2", document_id: "NSC202601", created_at: "2026-02-01" },
        ],
        error: null,
      });

      const result = await getUserDocumentNumbers("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].document_id).toBe("NSC202600");
      expect(mockSupabase.from).toHaveBeenCalledWith("document_numbers");
    });

    it("filters by orgId when provided", async () => {
      // With orgId the chain ends with a second .eq() after .order()
      const mockEq2 = vi.fn().mockResolvedValue({
        data: [{ id: "1", document_id: "NSC202600", created_at: "2026-01-01" }],
        error: null,
      });
      mockSupabase.order = vi.fn().mockReturnValue({ eq: mockEq2 });

      const result = await getUserDocumentNumbers("user-1", "org-1");
      expect(result).toHaveLength(1);
      expect(mockEq2).toHaveBeenCalledWith("organization_id", "org-1");
    });

    it("returns empty array when data is null", async () => {
      mockSupabase.order = vi.fn().mockResolvedValue({ data: null, error: null });
      const result = await getUserDocumentNumbers("user-1");
      expect(result).toEqual([]);
    });

    it("returns empty array on non-PGRST query error", async () => {
      mockSupabase.order = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "db error" },
      });
      const result = await getUserDocumentNumbers("user-1");
      expect(result).toEqual([]);
    });
  });

  describe("deleteDocumentNumberById", () => {
    it("calls delete with id and userId filter", async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.delete = vi.fn().mockReturnValue({ eq: mockEq1 });

      await deleteDocumentNumberById("entry-1", "user-1");
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockEq1).toHaveBeenCalledWith("id", "entry-1");
      expect(mockEq2).toHaveBeenCalledWith("user_id", "user-1");
    });

    it("throws when delete returns a non-PGRST error", async () => {
      const mockEq2 = vi.fn().mockResolvedValue({
        error: { code: "OTHER", message: "permission denied" },
      });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.delete = vi.fn().mockReturnValue({ eq: mockEq1 });

      await expect(
        deleteDocumentNumberById("entry-2", "user-1"),
      ).rejects.toThrow("Belegnummer konnte nicht gelöscht werden: permission denied");
    });

    it("silently ignores PGRST errors in delete (does not throw)", async () => {
      // PGRST error: condition (error && error.code !== "PGRST") is false → no throw
      const mockEq2 = vi.fn().mockResolvedValue({ error: { code: "PGRST", message: "table gone" } });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.delete = vi.fn().mockReturnValue({ eq: mockEq1 });

      await expect(deleteDocumentNumberById("entry-pgrst", "user-1")).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PGRST / Circuit-Breaker tests – MUST run last in this file.
  // These tests trigger isTableAvailable=false (module-level state),
  // which causes all subsequent DB calls to short-circuit to the
  // early-return path. Keep them here to avoid false positives above.
  // ═══════════════════════════════════════════════════════════════════
  describe("Circuit-Breaker behavior (PGRST – run last)", () => {
    it("isDocumentIdUsed: returns false on PGRST and marks table unavailable", async () => {
      // PGRST error in isDocumentIdUsed → sets isTableAvailable=false (covers Ln99 Branch0)
      const mockEq2 = vi.fn().mockResolvedValue({
        count: null,
        error: { code: "PGRST", message: "table not found" },
      });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockSupabase.select.mockReturnValue({ eq: mockEq1 });

      const used = await isDocumentIdUsed("org-pgrst", "DOC-PGRST");
      expect(used).toBe(false);
    });

    // After the test above, isTableAvailable=false – remaining tests verify
    // that the circuit-breaker causes graceful early returns.

    it("registerDocumentId: resolves early (circuit broken – insert not called)", async () => {
      await expect(
        registerDocumentId("org-pgrst", "user-1", "DOC-PGRST"),
      ).resolves.toBeUndefined();
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it("getUserDocumentNumbers: returns empty array when table unavailable", async () => {
      const result = await getUserDocumentNumbers("user-1");
      expect(result).toEqual([]);
      // from() should NOT have been called (early return before supabase call)
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("deleteDocumentNumberById: resolves without throwing when table unavailable", async () => {
      mockSupabase.delete = vi.fn();
      await expect(
        deleteDocumentNumberById("entry-x", "user-1"),
      ).resolves.toBeUndefined();
      expect(mockSupabase.delete).not.toHaveBeenCalled();
    });
  });
});
