import { describe, it, expect, vi, beforeEach } from "vitest";
import { generatePDF, generateExcel, generateWord } from "../documentGenerator";
import type { DocumentData } from "../documentGenerator";

// ── Hoisted mock variables ─────────────────────────────────────
const {
  mockTextField,
  mockCheckBox,
  mockForm,
  mockPage,
  mockPdfDoc,
  mockDocZip,
  mockDoc,
  mockSheet,
  mockWorkbook,
} = vi.hoisted(() => {
  const mockTextField = { setText: vi.fn() };
  const mockCheckBox = { check: vi.fn(), uncheck: vi.fn() };
  const mockSheet = {};
  const mockForm = {
    getFields: vi.fn(),
    getTextField: vi.fn().mockReturnValue(mockTextField),
    getCheckBox: vi.fn().mockReturnValue(mockCheckBox),
    flatten: vi.fn(),
  };
  const mockPage = {
    getSize: vi.fn().mockReturnValue({ width: 595, height: 841 }),
    drawText: vi.fn(),
    drawLine: vi.fn(),
    drawImage: vi.fn(),
  };
  const mockPdfDoc = {
    getForm: vi.fn().mockReturnValue(mockForm),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    addPage: vi.fn().mockReturnValue(mockPage),
    getPages: vi.fn().mockReturnValue([mockPage]),
    embedFont: vi.fn().mockResolvedValue({ name: "Helvetica" }),
    embedPng: vi.fn().mockResolvedValue({ width: 100, height: 50 }),
    embedJpg: vi.fn().mockResolvedValue({ width: 100, height: 50 }),
  };
  const mockWorkbook = {
    SheetNames: ["Sheet1"],
    Sheets: { Sheet1: mockSheet },
  };
  const mockDocZip = { generate: vi.fn().mockReturnValue(new Blob(["docx"])) };
  const mockDoc = {
    render: vi.fn(),
    getZip: vi.fn().mockReturnValue(mockDocZip),
  };
  return {
    mockTextField,
    mockCheckBox,
    mockForm,
    mockPage,
    mockPdfDoc,
    mockDocZip,
    mockDoc,
    mockSheet,
    mockWorkbook,
  };
});

// ── Mocks ──────────────────────────────────────────────────────
vi.mock("pdf-lib", () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue(mockPdfDoc),
    create: vi.fn().mockResolvedValue(mockPdfDoc),
  },
  rgb: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0 }),
  StandardFonts: { Helvetica: "Helvetica" },
}));

vi.mock("xlsx", () => ({
  default: {
    read: vi.fn().mockReturnValue(mockWorkbook),
    write: vi.fn().mockReturnValue(new Uint8Array([10, 20])),
    utils: {
      book_new: vi.fn().mockReturnValue(mockWorkbook),
      json_to_sheet: vi.fn().mockReturnValue({}),
      book_append_sheet: vi.fn(),
      sheet_add_aoa: vi.fn(),
    },
  },
  read: vi.fn().mockReturnValue(mockWorkbook),
  write: vi.fn().mockReturnValue(new Uint8Array([10, 20])),
  utils: {
    book_new: vi.fn().mockReturnValue(mockWorkbook),
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
    sheet_add_aoa: vi.fn(),
  },
}));

vi.mock("docxtemplater", () => ({
  default: vi.fn().mockImplementation(() => mockDoc),
}));

vi.mock("pizzip", () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

// ── Sample data ────────────────────────────────────────────────
const sampleData: DocumentData = {
  from: "2025-06-01",
  to: "2025-06-10",
  reason: "Urlaub",
  deputy: "Max",
  notes: "",
  userEmail: "emp@test.de",
  orgName: "Acme GmbH",
  date: "2025-05-20",
  customFields: {
    firstName: "Hans",
    lastName: "Muster",
    employeeId: "p-001",
    vacationDays: 8,
    documentId: "ANT-001",
    location: "Berlin",
    signedAt: "2025-05-20",
  },
};

describe("documentGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfDoc.save.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockPdfDoc.addPage.mockReturnValue(mockPage);
    mockPdfDoc.getForm.mockReturnValue(mockForm);
    mockForm.getFields.mockReturnValue([
      { getName: () => "from_field", constructor: { name: "PDFTextField" } },
      {
        getName: () => "checkbox_reason",
        constructor: { name: "PDFCheckBox" },
      },
    ]);
    mockForm.getTextField.mockReturnValue(mockTextField);
    mockForm.getCheckBox.mockReturnValue(mockCheckBox);
    mockPage.getSize.mockReturnValue({ width: 595, height: 841 });
    mockDoc.getZip.mockReturnValue(mockDocZip);
    mockDocZip.generate.mockReturnValue(new Blob(["docx"]));
  });

  describe("generatePDF", () => {
    it("creates a new PDF when no template provided", async () => {
      const { PDFDocument } = await import("pdf-lib");
      vi.mocked(PDFDocument.create).mockResolvedValue(mockPdfDoc as any);

      const blob = await generatePDF(sampleData);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/pdf");
      expect(PDFDocument.create).toHaveBeenCalled();
      expect(mockPage.drawText).toHaveBeenCalled();
    });

    it("fills existing PDF form when template provided", async () => {
      const { PDFDocument } = await import("pdf-lib");
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);

      const blob = await generatePDF(sampleData, templateBytes);

      expect(blob).toBeInstanceOf(Blob);
      expect(PDFDocument.load).toHaveBeenCalledWith(templateBytes);
      expect(mockForm.getFields).toHaveBeenCalled();
    });

    it("fills text fields matching field name patterns", async () => {
      const { PDFDocument } = await import("pdf-lib");
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);
      mockForm.getFields.mockReturnValue([
        { getName: () => "from_date" },
      ]);
      // getCheckBox throws so the code falls through to text field handling
      mockForm.getCheckBox.mockImplementationOnce(() => { throw new Error("not a checkbox"); });

      await generatePDF(sampleData, templateBytes);
      expect(mockForm.getTextField).toHaveBeenCalledWith("from_date");
      expect(mockTextField.setText).toHaveBeenCalledWith("2025-06-01");
    });

    it("handles checkbox fields for boolean customFields", async () => {
      const { PDFDocument } = await import("pdf-lib");
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);
      // "paid_checkbox" contains "paid" → matches VACATION_TYPE_KEYS.paid
      mockForm.getFields.mockReturnValue([
        { getName: () => "paid_checkbox" },
      ]);
      // Ensure getCheckBox returns a fresh spy so check() can be asserted cleanly
      const checkSpy = vi.fn();
      const uncheckSpy = vi.fn();
      mockForm.getCheckBox.mockImplementation(() => ({ check: checkSpy, uncheck: uncheckSpy }));
      const dataWithPaid: DocumentData = {
        ...sampleData,
        vacationTypes: { bezahlt: true },
      };

      await generatePDF(dataWithPaid, templateBytes);
      expect(mockForm.getCheckBox).toHaveBeenCalledWith("paid_checkbox");
      expect(checkSpy).toHaveBeenCalled();
    });

    it("unchecks checkbox for false boolean value", async () => {
      const { PDFDocument } = await import("pdf-lib");
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);
      // "paid_checkbox" contains "paid" → matches VACATION_TYPE_KEYS.paid
      mockForm.getFields.mockReturnValue([
        { getName: () => "paid_checkbox" },
      ]);
      const checkSpy = vi.fn();
      const uncheckSpy = vi.fn();
      mockForm.getCheckBox.mockImplementation(() => ({ check: checkSpy, uncheck: uncheckSpy }));
      const dataWithUnpaid: DocumentData = {
        ...sampleData,
        vacationTypes: { paid: false },
      };

      await generatePDF(dataWithUnpaid, templateBytes);
      expect(mockForm.getCheckBox).toHaveBeenCalledWith("paid_checkbox");
      expect(uncheckSpy).toHaveBeenCalled();
    });
  });

  describe("generateExcel", () => {
    it("creates a new Excel workbook when no template", async () => {
      const XLSX = await import("xlsx");
      vi.mocked(XLSX.utils.book_new).mockReturnValue(mockWorkbook);

      const blob = await generateExcel(sampleData);

      expect(blob).toBeInstanceOf(Blob);
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    });

    it("fills existing Excel template when provided", async () => {
      const XLSX = await import("xlsx");
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);

      const blob = await generateExcel(sampleData, templateBytes);

      expect(blob).toBeInstanceOf(Blob);
      expect(XLSX.read).toHaveBeenCalledWith(templateBytes, { type: "array" });
      expect(XLSX.utils.sheet_add_aoa).toHaveBeenCalled();
    });
  });

  describe("generateWord", () => {
    it("generates a Word document from template", async () => {
      const blob = await generateWord(sampleData, new ArrayBuffer(8));

      expect(blob).toBeInstanceOf(Blob);
      expect(mockDoc.render).toHaveBeenCalledWith(
        expect.objectContaining({ from: "2025-06-01", orgName: "Acme GmbH" }),
      );
    });

    it("passes customFields to renderer", async () => {
      await generateWord(sampleData, new ArrayBuffer(8));
      const arg = mockDoc.render.mock.calls[0][0];
      expect(arg.firstName).toBe("Hans");
      expect(arg.lastName).toBe("Muster");
    });
  });

  // ─── v4.5 – VACATION_TYPE_KEYS + PNG/JPEG detection ───────────────

  describe("VACATION_TYPE_KEYS checkbox matching (v4.5)", () => {
    it("checks paidLeave checkbox for bezahlt vacation type", async () => {
      const { PDFDocument } = await import("pdf-lib");
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);

      mockForm.getFields.mockReturnValue([
        { getName: () => "paidLeave", constructor: { name: "PDFCheckBox" } },
        { getName: () => "unpaidLeave", constructor: { name: "PDFCheckBox" } },
      ]);
      // Simulate getCheckBox returning mock, getTextField throwing (= checkbox)
      mockForm.getCheckBox.mockReturnValue(mockCheckBox);
      mockForm.getTextField.mockImplementation(() => {
        throw new Error("not a text field");
      });

      const dataWithPaid: DocumentData = {
        ...sampleData,
        vacationTypes: { bezahlt: true, unbezahlt: false },
      };

      await generatePDF(dataWithPaid, templateBytes);
      // check should be called for paidLeave (bezahlt=true)
      expect(mockCheckBox.check).toHaveBeenCalled();
    });

    it("does not check unpaidLeave when only bezahlt is selected", async () => {
      const { PDFDocument } = await import("pdf-lib");
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);

      const checkMock = vi.fn();
      const uncheckMock = vi.fn();
      mockForm.getFields.mockReturnValue([
        { getName: () => "unpaidLeave", constructor: { name: "PDFCheckBox" } },
      ]);
      mockForm.getCheckBox.mockReturnValue({ check: checkMock, uncheck: uncheckMock });
      mockForm.getTextField.mockImplementation(() => {
        throw new Error("not a text field");
      });

      const dataWithPaidOnly: DocumentData = {
        ...sampleData,
        vacationTypes: { bezahlt: true, unbezahlt: false },
      };

      await generatePDF(dataWithPaidOnly, templateBytes);
      // unpaidLeave should be unchecked since unbezahlt=false
      expect(uncheckMock).toHaveBeenCalled();
      expect(checkMock).not.toHaveBeenCalled();
    });
  });

  describe("coordinate-based fallback (v4.5)", () => {
    it("uses coordinate fallback when template has no text fields", async () => {
      const { PDFDocument } = await import("pdf-lib");
      const templateBytes = new ArrayBuffer(8);

      const drawTextMock = vi.fn();
      const mockPageFallback = {
        getSize: vi.fn().mockReturnValue({ width: 595, height: 841 }),
        drawText: drawTextMock,
        drawLine: vi.fn(),
        drawImage: vi.fn(),
      };

      const mockEmbedFont = vi.fn().mockResolvedValue({});
      const flattenMock = vi.fn();

      const mockPdfDocFallback = {
        getForm: vi.fn().mockReturnValue({
          getFields: vi.fn().mockReturnValue([
            // Only checkbox fields, no text fields
            { getName: () => "paidLeave", acroField: { getWidgets: vi.fn().mockReturnValue([{ getRectangle: vi.fn().mockReturnValue({ x: 100, y: 490, width: 10, height: 10 }) }]) } },
          ]),
          getCheckBox: vi.fn().mockReturnValue({ check: vi.fn(), uncheck: vi.fn() }),
          getTextField: vi.fn().mockImplementation(() => { throw new Error("not text"); }),
          flatten: flattenMock,
        }),
        getPages: vi.fn().mockReturnValue([mockPageFallback]),
        embedFont: mockEmbedFont,
        save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      };

      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDocFallback as any);

      const dataWithName: DocumentData = {
        ...sampleData,
        firstName: "Max",
        lastName: "Mustermann",
        from: "2026-04-09",
        to: "2026-04-22",
      };

      const blob = await generatePDF(dataWithName, templateBytes);
      expect(blob).toBeInstanceOf(Blob);
      // drawText should be called at least once for name/dates in fallback mode
      expect(drawTextMock).toHaveBeenCalled();
    });
  });
});

