import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePDF, generateExcel, generateWord } from '../documentGenerator';
import type { DocumentData } from '../documentGenerator';

// â”€â”€ Hoisted mock variables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { mockTextField, mockCheckBox, mockForm, mockPage, mockPdfDoc, mockDocZip, mockDoc, mockSheet, mockWorkbook } = vi.hoisted(() => {
  const mockTextField = { setText: vi.fn() };
  const mockCheckBox = { check: vi.fn(), uncheck: vi.fn() };
  const mockSheet = {};
  const mockForm = {
    getFields: vi.fn(),
    getTextField: vi.fn().mockReturnValue(mockTextField),
    getCheckBox: vi.fn().mockReturnValue(mockCheckBox),
  };
  const mockPage = {
    getSize: vi.fn().mockReturnValue({ width: 595, height: 841 }),
    drawText: vi.fn(),
  };
  const mockPdfDoc = {
    getForm: vi.fn().mockReturnValue(mockForm),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    addPage: vi.fn().mockReturnValue(mockPage),
  };
  const mockWorkbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: mockSheet } };
  const mockDocZip = { generate: vi.fn().mockReturnValue(new Blob(['docx'])) };
  const mockDoc = { render: vi.fn(), getZip: vi.fn().mockReturnValue(mockDocZip) };
  return { mockTextField, mockCheckBox, mockForm, mockPage, mockPdfDoc, mockDocZip, mockDoc, mockSheet, mockWorkbook };
});

// â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue(mockPdfDoc),
    create: vi.fn().mockResolvedValue(mockPdfDoc),
  },
}));

vi.mock('xlsx', () => ({
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

vi.mock('docxtemplater', () => ({
  default: vi.fn().mockImplementation(() => mockDoc),
}));

vi.mock('pizzip', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

// â”€â”€ Sample data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const sampleData: DocumentData = {
  from: '2025-06-01',
  to: '2025-06-10',
  reason: 'Urlaub',
  deputy: 'Max',
  notes: '',
  userEmail: 'emp@test.de',
  orgName: 'Acme GmbH',
  date: '2025-05-20',
  customFields: {
    firstName: 'Hans',
    lastName: 'Muster',
    employeeId: 'p-001',
    vacationDays: 8,
    documentId: 'ANT-001',
    location: 'Berlin',
    signedAt: '2025-05-20',
  },
};

describe('documentGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfDoc.save.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockPdfDoc.addPage.mockReturnValue(mockPage);
    mockPdfDoc.getForm.mockReturnValue(mockForm);
    mockForm.getFields.mockReturnValue([
      { getName: () => 'from_field', constructor: { name: 'PDFTextField' } },
      { getName: () => 'checkbox_reason', constructor: { name: 'PDFCheckBox' } },
    ]);
    mockForm.getTextField.mockReturnValue(mockTextField);
    mockForm.getCheckBox.mockReturnValue(mockCheckBox);
    mockPage.getSize.mockReturnValue({ width: 595, height: 841 });
    mockDoc.getZip.mockReturnValue(mockDocZip);
    mockDocZip.generate.mockReturnValue(new Blob(['docx']));
  });

  describe('generatePDF', () => {
    it('creates a new PDF when no template provided', async () => {
      const { PDFDocument } = await import('pdf-lib');
      vi.mocked(PDFDocument.create).mockResolvedValue(mockPdfDoc as any);

      const blob = await generatePDF(sampleData);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(PDFDocument.create).toHaveBeenCalled();
      expect(mockPage.drawText).toHaveBeenCalled();
    });

    it('fills existing PDF form when template provided', async () => {
      const { PDFDocument } = await import('pdf-lib');
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);

      const blob = await generatePDF(sampleData, templateBytes);

      expect(blob).toBeInstanceOf(Blob);
      expect(PDFDocument.load).toHaveBeenCalledWith(templateBytes);
      expect(mockForm.getFields).toHaveBeenCalled();
    });

    it('fills text fields matching field name patterns', async () => {
      const { PDFDocument } = await import('pdf-lib');
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);
      mockForm.getFields.mockReturnValue([
        { getName: () => 'from_date', constructor: { name: 'PDFTextField' } },
      ]);

      await generatePDF(sampleData, templateBytes);
      expect(mockForm.getTextField).toHaveBeenCalledWith('from_date');
      expect(mockTextField.setText).toHaveBeenCalledWith('2025-06-01');
    });

    it('handles checkbox fields for boolean customFields', async () => {
      const { PDFDocument } = await import('pdf-lib');
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);
      mockForm.getFields.mockReturnValue([
        { getName: () => 'reason_box', constructor: { name: 'PDFCheckBox' } },
      ]);
      const dataWithBool: DocumentData = {
        ...sampleData,
        customFields: { ...sampleData.customFields, reason_box: true },
      };

      await generatePDF(dataWithBool, templateBytes);
      expect(mockForm.getCheckBox).toHaveBeenCalled();
      expect(mockCheckBox.check).toHaveBeenCalled();
    });

    it('unchecks checkbox for false boolean value', async () => {
      const { PDFDocument } = await import('pdf-lib');
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as any);
      mockForm.getFields.mockReturnValue([
        { getName: () => 'reason_box', constructor: { name: 'PDFCheckBox' } },
      ]);
      const dataWithFalseBool: DocumentData = {
        ...sampleData,
        customFields: { ...sampleData.customFields, reason_box: false },
      };

      await generatePDF(dataWithFalseBool, templateBytes);
      expect(mockCheckBox.uncheck).toHaveBeenCalled();
    });
  });

  describe('generateExcel', () => {
    it('creates a new Excel workbook when no template', async () => {
      const XLSX = await import('xlsx');
      vi.mocked(XLSX.utils.book_new).mockReturnValue(mockWorkbook);

      const blob = await generateExcel(sampleData);

      expect(blob).toBeInstanceOf(Blob);
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    });

    it('fills existing Excel template when provided', async () => {
      const XLSX = await import('xlsx');
      const templateBytes = new ArrayBuffer(8);
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);

      const blob = await generateExcel(sampleData, templateBytes);

      expect(blob).toBeInstanceOf(Blob);
      expect(XLSX.read).toHaveBeenCalledWith(templateBytes, { type: 'array' });
      expect(XLSX.utils.sheet_add_aoa).toHaveBeenCalled();
    });
  });

  describe('generateWord', () => {
    it('generates a Word document from template', async () => {
      const blob = await generateWord(sampleData, new ArrayBuffer(8));

      expect(blob).toBeInstanceOf(Blob);
      expect(mockDoc.render).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2025-06-01', orgName: 'Acme GmbH' }),
      );
    });

    it('passes customFields to renderer', async () => {
      await generateWord(sampleData, new ArrayBuffer(8));
      const arg = mockDoc.render.mock.calls[0][0];
      expect(arg.firstName).toBe('Hans');
      expect(arg.lastName).toBe('Muster');
    });
  });
});
