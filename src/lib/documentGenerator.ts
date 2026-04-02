import { PDFDocument } from "pdf-lib";
import * as XLSX from "xlsx";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

export interface DocumentData {
  from: string;
  to: string;
  reason: string;
  deputy: string;
  notes: string;
  userEmail: string;
  orgName: string;
  date: string;
  customFields?: Record<string, unknown>;
}

/**
 * PDF Generation logic (Fill existing form or create new)
 */
export async function generatePDF(
  data: DocumentData,
  templateBytes?: ArrayBuffer,
): Promise<Blob> {
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
      ...data.customFields,
    };

    for (const field of fields) {
      const name = field.getName().toLowerCase();
      // Handle Checkboxes
      if (field.constructor.name === "PDFCheckBox") {
        for (const [key, value] of Object.entries(fieldMap)) {
          if (name.includes(key.toLowerCase()) && typeof value === "boolean") {
            const cb = form.getCheckBox(field.getName());
            if (value) cb.check();
            else cb.uncheck();
            break;
          }
        }
        continue;
      }

      // Handle Text Fields
      for (const [key, value] of Object.entries(fieldMap)) {
        if (name.includes(key.toLowerCase()) && value) {
          try {
            const tf = form.getTextField(field.getName());
            tf.setText(String(value));
          } catch {
            /* field type mismatch */
          }
          break;
        }
      }
    }
    const bytes = await pdfDoc.save();
    return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  }

  // Fallback: Create simple PDF
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { height } = page.getSize();

  page.drawText("URLAUBSANTRAG", { x: 50, y: height - 80, size: 22 });
  page.drawText(`Organisation: ${data.orgName}`, {
    x: 50,
    y: height - 120,
    size: 12,
  });
  page.drawText(
    `Name: ${data.customFields?.firstName} ${data.customFields?.lastName}`,
    { x: 50, y: height - 145, size: 12 },
  );
  page.drawText(`Von: ${data.from}`, { x: 50, y: height - 170, size: 12 });
  page.drawText(`Bis: ${data.to}`, { x: 200, y: height - 170, size: 12 });
  page.drawText(`Tage: ${data.customFields?.vacationDays}`, {
    x: 350,
    y: height - 170,
    size: 12,
  });

  page.drawText(`Grund: ${data.reason}`, { x: 50, y: height - 210, size: 12 });
  page.drawText(`Personalnr: ${data.customFields?.employeeId}`, {
    x: 50,
    y: height - 235,
    size: 11,
  });
  page.drawText(`Belegnr: ${data.customFields?.documentId}`, {
    x: 200,
    y: height - 235,
    size: 11,
  });

  page.drawText(`Ort: ${data.customFields?.location}`, {
    x: 50,
    y: height - 270,
    size: 11,
  });
  page.drawText(`Datum: ${data.customFields?.signedAt}`, {
    x: 200,
    y: height - 270,
    size: 11,
  });

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Excel Generation (SheetJS)
 */
export async function generateExcel(
  data: DocumentData,
  templateBytes?: ArrayBuffer,
): Promise<Blob> {
  let workbook: XLSX.WorkBook;

  if (templateBytes) {
    workbook = XLSX.read(templateBytes, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    XLSX.utils.sheet_add_aoa(
      sheet,
      [
        [
          "Name",
          `${data.customFields?.firstName} ${data.customFields?.lastName}`,
        ],
        ["Personalnr", data.customFields?.employeeId],
        ["Von", data.from],
        ["Bis", data.to],
        ["Tage", data.customFields?.vacationDays],
        ["Grund", data.reason],
      ],
      { origin: -1 },
    );
  } else {
    workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      {
        Vorname: data.customFields?.firstName,
        Nachname: data.customFields?.lastName,
        Personalnr: data.customFields?.employeeId,
        Organisation: data.orgName,
        Von: data.from,
        Bis: data.to,
        Tage: data.customFields?.vacationDays,
        Grund: data.reason,
        Ort: data.customFields?.location,
        Datum: data.customFields?.signedAt,
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, ws, "Urlaub");
  }

  const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Word Generation (docxtemplater + pizzip)
 */
export async function generateWord(
  data: DocumentData,
  templateBytes: ArrayBuffer,
): Promise<Blob> {
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
    ...data.customFields,
  });

  const out = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return out;
}
