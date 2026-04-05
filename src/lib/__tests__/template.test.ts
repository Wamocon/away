import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  uploadTemplate,
  getTemplatesForOrg,
  getTemplateUrl,
  getTemplateBytes,
} from "../template";

// ── Hoisted mocks (required for vi.mock factory access) ─────────
const {
  mockOrder,
  mockEq,
  mockSelect,
  mockInsert,
  mockFromDb,
  mockDownload,
  mockGetPublicUrl,
  mockUpload,
  mockStorageFrom,
} = vi.hoisted(() => {
  const mockOrder = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockInsert = vi.fn();
  const mockFromDb = vi.fn().mockReturnValue({ select: mockSelect, insert: mockInsert });

  const mockDownload = vi.fn();
  const mockGetPublicUrl = vi.fn();
  const mockUpload = vi.fn();
  const mockStorageFrom = vi.fn().mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
    download: mockDownload,
  });

  return { mockOrder, mockEq, mockSelect, mockInsert, mockFromDb, mockDownload, mockGetPublicUrl, mockUpload, mockStorageFrom };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFromDb,
    storage: { from: mockStorageFrom },
  }),
}));

// ── Sample data ──────────────────────────────────────────────────
const SAMPLE_TEMPLATES = [
  { id: "t1", name: "Urlaub", type: "pdf", storage_path: "org-1/t1.pdf", organization_id: "org-1" },
];

describe("template lib", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire chain defaults after clearAllMocks
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockFromDb.mockReturnValue({ select: mockSelect, insert: mockInsert });
    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      download: mockDownload,
    });
  });

  // ── getTemplatesForOrg ────────────────────────────────────────

  describe("getTemplatesForOrg", () => {
    it("returns templates for the org", async () => {
      mockOrder.mockResolvedValueOnce({ data: SAMPLE_TEMPLATES, error: null });

      const result = await getTemplatesForOrg("org-1");

      expect(result).toEqual(SAMPLE_TEMPLATES);
      expect(mockFromDb).toHaveBeenCalledWith("document_templates");
      expect(mockEq).toHaveBeenCalledWith("organization_id", "org-1");
    });

    it("throws on DB error", async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: "db error" } });

      await expect(getTemplatesForOrg("org-1")).rejects.toMatchObject({ message: "db error" });
    });

    it("returns empty array when no templates exist", async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null });

      const result = await getTemplatesForOrg("org-2");
      expect(result).toEqual([]);
    });

    it("orders by created_at descending", async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });
      await getTemplatesForOrg("org-1");
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    });
  });

  // ── uploadTemplate ────────────────────────────────────────────

  describe("uploadTemplate", () => {
    it("uploads file and inserts record into document_templates", async () => {
      const file = new File(["content"], "vorlage.pdf", { type: "application/pdf" });
      mockUpload.mockResolvedValueOnce({
        data: { path: "org-1/12345_vorlage.pdf" },
        error: null,
      });
      mockInsert.mockResolvedValueOnce({ data: null, error: null });

      const result = await uploadTemplate("org-1", file);

      expect(result).toBeDefined();
      expect(mockStorageFrom).toHaveBeenCalledWith("templates");
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining("org-1/"),
        file,
        { cacheControl: "3600", upsert: true },
      );
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            organization_id: "org-1",
            name: "vorlage",
            type: "pdf",
          }),
        ]),
      );
    });

    it("throws on storage upload error", async () => {
      const file = new File(["content"], "fail.pdf");
      mockUpload.mockResolvedValueOnce({ data: null, error: { message: "storage fail" } });

      await expect(uploadTemplate("org-1", file)).rejects.toMatchObject({ message: "storage fail" });
    });

    it("throws on DB insert error", async () => {
      const file = new File(["content"], "dberr.pdf");
      mockUpload.mockResolvedValueOnce({ data: { path: "org-1/dberr.pdf" }, error: null });
      mockInsert.mockResolvedValueOnce({ data: null, error: { message: "insert fail" } });

      await expect(uploadTemplate("org-1", file)).rejects.toMatchObject({ message: "insert fail" });
    });

    it("uses timestamp prefix in storage path", async () => {
      const file = new File(["x"], "my-template.docx");
      mockUpload.mockResolvedValueOnce({ data: { path: "org-1/ts_my-template.docx" }, error: null });
      mockInsert.mockResolvedValueOnce({ data: null, error: null });

      await uploadTemplate("org-1", file);
      const uploadPath: string = mockUpload.mock.calls[0][0];
      expect(uploadPath).toMatch(/^org-1\/\d+_my-template\.docx$/);
    });
  });

  // ── getTemplateUrl ────────────────────────────────────────────

  describe("getTemplateUrl", () => {
    it("returns public URL for a template file", async () => {
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: "https://cdn.example.com/org-1/template.pdf" },
      });

      const url = await getTemplateUrl("org-1", "template.pdf");
      expect(url).toBe("https://cdn.example.com/org-1/template.pdf");
      expect(mockGetPublicUrl).toHaveBeenCalledWith("org-1/template.pdf");
    });
  });

  // ── getTemplateBytes ──────────────────────────────────────────

  describe("getTemplateBytes", () => {
    it("downloads and returns ArrayBuffer for a storage path", async () => {
      const fakeArrayBuffer = new ArrayBuffer(8);
      const fakeBlob = { arrayBuffer: vi.fn().mockResolvedValue(fakeArrayBuffer) };
      mockDownload.mockResolvedValueOnce({ data: fakeBlob, error: null });

      const result = await getTemplateBytes("org-1/test.pdf");

      expect(result).toBe(fakeArrayBuffer);
      expect(mockDownload).toHaveBeenCalledWith("org-1/test.pdf");
    });

    it("throws on download error", async () => {
      mockDownload.mockResolvedValueOnce({ data: null, error: { message: "download fail" } });

      await expect(getTemplateBytes("org-1/missing.pdf")).rejects.toMatchObject({
        message: "download fail",
      });
    });
  });
});
