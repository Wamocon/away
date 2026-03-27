import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export interface DocumentData {
  from: string;
  to: string;
  reason: string;
  deputy: string;
  notes: string;
  userEmail: string;
  orgName: string;
  date: string;
  customFields?: Record<string, string>;
}

/**
 * PDF Generation logic (Fill existing form or create new)
 */
export async function generatePDF(data: DocumentData, templateBytes?: ArrayBuffer): Promise<Blob> {
  if (templateBytes) {
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    // Field name mapping logic
    const fieldMap: Record<string, string> = {
      from: data.from,
      to: data.to,
      reason: data.reason,
      deputy: data.deputy,
      notes: data.notes,
      email: data.userEmail,
      org: data.orgName,
      date: data.date,
      ...data.customFields
    };

    for (const field of fields) {
      const name = field.getName().toLowerCase();
      for (const [key, value] of Object.entries(fieldMap)) {
        if (name.includes(key.toLowerCase()) && value) {
          try {
            const tf = form.getTextField(field.getName());
            tf.setText(value);
          } catch { /* field type mismatch */ }
          break;
        }
      }
    }
    const bytes = await pdfDoc.save();
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  }

  // Fallback: Create simple PDF
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  
  page.drawText('URLAUBSANTRAG', { x: 50, y: height - 80, size: 22 });
  page.drawText(`Organisation: ${data.orgName}`, { x: 50, y: height - 120, size: 12 });
  page.drawText(`Von: ${data.from}`, { x: 50, y: height - 160, size: 12 });
  page.drawText(`Bis: ${data.to}`, { x: 50, y: height - 185, size: 12 });
  page.drawText(`Grund: ${data.reason}`, { x: 50, y: height - 210, size: 12 });
  page.drawText(`Antragsteller: ${data.userEmail}`, { x: 50, y: height - 240, size: 11 });
  
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Excel Generation (SheetJS)
 */
export async function generateExcel(data: DocumentData, templateBytes?: ArrayBuffer): Promise<Blob> {
  let workbook: XLSX.WorkBook;
  
  if (templateBytes) {
    workbook = XLSX.read(templateBytes, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Simple cell mapping logic (replace {key} in cells or just append)
    // For now we append a new row as a "generated" entry if it's a list
    // Or we look for placeholders
    XLSX.utils.sheet_add_aoa(sheet, [
      ['Antragsteller', data.userEmail],
      ['Von', data.from],
      ['Bis', data.to],
      ['Grund', data.reason],
      ['Vertretung', data.deputy]
    ], { origin: -1 }); // append at end
  } else {
    workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{
      'Antragsteller': data.userEmail,
      'Organisation': data.orgName,
      'Von': data.from,
      'Bis': data.to,
      'Grund': data.reason,
      'Vertretung': data.deputy,
      'Anmerkungen': data.notes
    }]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Urlaub');
  }

  const out = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Word Generation (docxtemplater + pizzip)
 */
export async function generateWord(data: DocumentData, templateBytes: ArrayBuffer): Promise<Blob> {
  const zip = new PizZip(templateBytes);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    from: data.from,
    to: data.to,
    reason: data.reason,
    deputy: data.deputy,
    notes: data.notes,
    userEmail: data.userEmail,
    orgName: data.orgName,
    date: data.date,
    ...data.customFields
  });

  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  
  return out;
}
