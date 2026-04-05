import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
  // Urlaubsantrag-spezifische Felder
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  documentId?: string;
  vacationDays?: number | string;
  vacationTypes?: Record<string, boolean>;
  location?: string;
  signedAt?: string;
  employeeSignatureBase64?: string; // base64-PNG der Mitarbeiter-Unterschrift
  // Genehmiger-Felder (optional, werden bei Genehmigung befüllt)
  approverLocation?: string;
  approverDate?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Mappt Wizard-Urlaubsart-IDs auf AcroForm-Feldnamen (case-insensitive exakter String-Match).
 * Wizard-IDs: "bezahlt", "unbezahlt", "ausgleich", "sonder"
 * Echte AcroForm-Namen (camelCase) stehen zuerst — "paid" würde sonst auch "unpaidleave" matchen.
 */
const VACATION_TYPE_KEYS: Record<string, string[]> = {
  unbezahlt: ["unpaidleave", "unpaid",    "unbezahlt",  "markierfeld1", "markierfeld 1"],
  bezahlt:   ["paidleave",   "paid",      "bezahlt",    "markierfeld2", "markierfeld 2"],
  ausgleich: ["flextime",    "flex",      "ausgleich",  "freizeit",     "markierfeld3", "markierfeld 3"],
  sonder:    ["specialleave","special",   "sonder",                     "markierfeld4", "markierfeld 4"],
};

/**
 * PDF Generation logic — füllt AcroForm-Vorlage aus oder erstellt Fallback-PDF.
 */
export async function generatePDF(
  data: DocumentData,
  templateBytes?: ArrayBuffer,
): Promise<Blob> {
  if (templateBytes) {
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Debug: alle Feldnamen loggen (hilft beim Mapping-Verifizieren)
    if (process.env.NODE_ENV !== "production") {
      console.log("[PDF Fields]", fields.map((f) => `${f.constructor.name}: ${f.getName()}`));
    }

    const applicantName =
      data.firstName || data.lastName
        ? `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim()
        : undefined;

    // Textfeld-Mapping: Feldname (lowercase) → Wert
    const textFieldMap: Record<string, string | undefined> = {
      applicantname:    applicantName,
      employeeid:       data.employeeId,
      personalid:       data.employeeId,
      personnelnr:      data.employeeId,
      documentid:       data.documentId,
      belegnummer:      data.documentId,
      vacationdays:     data.vacationDays !== undefined ? String(data.vacationDays) : undefined,
      arbeitstage:      data.vacationDays !== undefined ? String(data.vacationDays) : undefined,
      from:             data.from,
      von:              data.from,
      to:               data.to,
      bis:              data.to,
      reason:           data.reason,
      begruendung:      data.reason,
      applicantlocation: data.location,
      applicantdate:    data.signedAt,
      approverlocation: data.approverLocation,
      approverdate:     data.approverDate,
      // Legacy-Mapping für ältere Templates
      org:              data.orgName,
      email:            data.userEmail,
      ...Object.fromEntries(
        Object.entries(data.customFields ?? {}).map(([k, v]) => [
          k.toLowerCase(),
          v !== undefined ? String(v) : undefined,
        ])
      ),
    };

    let textFilledCount = 0;

    for (const field of fields) {
      const rawName = field.getName();
      const nameLower = rawName.toLowerCase();

      // ── Checkbox-Detection via try-catch (sicher bei Minification) ──────
      try {
        const cb = form.getCheckBox(rawName);
        for (const [typeKey, aliases] of Object.entries(VACATION_TYPE_KEYS)) {
          if (aliases.some((a) => nameLower.includes(a))) {
            const checked = data.vacationTypes?.[typeKey] ?? false;
            if (checked) cb.check();
            else cb.uncheck();
            break;
          }
        }
        continue; // Feld fertig behandelt
      } catch { /* kein Checkbox-Feld */ }

      // ── Textfeld-Detection via try-catch ─────────────────────────────────
      try {
        const tf = form.getTextField(rawName);
        // Exakter Match zuerst
        let value = textFieldMap[nameLower];
        // Substring-Match als Fallback
        if (value === undefined) {
          for (const [key, val] of Object.entries(textFieldMap)) {
            if (nameLower.includes(key) && val !== undefined) {
              value = val;
              break;
            }
          }
        }
        if (value !== undefined) {
          tf.setText(value);
          textFilledCount++;
        }
      } catch { /* kein Textfeld oder Typkonflikt */ }
    }

    // ── Koordinaten-Fallback: wenn keine AcroForm-Textfelder vorhanden ──────
    // Tritt auf, wenn das Template nur Checkbox-AcroForm-Felder hat.
    // Checkbox-Y-Position wird als vertikaler Anker genutzt.
    if (textFilledCount === 0) {
      console.warn(
        "[PDF] Keine AcroForm-Textfelder im Template — verwende koordinatenbasiertes Zeichnen",
      );
      const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const page0 = pdfDoc.getPages()[0];

      // Checkbox-Widget-Y als Anker ermitteln (paidLeave zuerst, dann alle anderen)
      let cbY = 495; // A4-Standardwert (Fallback falls kein Checkbox-Widget gefunden)
      const preferredCbNames = ["paidleave", "unpaidleave", "flextime", "specialleave"];
      outer: for (const preferred of preferredCbNames) {
        for (const f of fields) {
          if (f.getName().toLowerCase() === preferred) {
            try {
              const ws = f.acroField.getWidgets();
              if (ws.length > 0) {
                cbY = ws[0].getRectangle().y;
                break outer;
              }
            } catch { /* ignore */ }
          }
        }
      }
      console.log("[PDF] Koordinaten-Fallback aktiv, Checkbox-Anker cbY:", cbY);

      const coord = (
        text: string | undefined,
        x: number,
        y: number,
        size = 10,
      ) => {
        if (!text || text.trim() === "" || text === "undefined") return;
        page0.drawText(text.trim(), {
          x,
          y,
          size,
          font: fallbackFont,
          color: rgb(0, 0, 0),
        });
      };

      // Positionen relativ zum Checkbox-Anker (cbY) — kalibriert für WMC-A4-Vorlage
      coord(applicantName,               210, cbY + 87);   // Name (nach "Hiermit beantrage ich,")
      coord(data.employeeId,             490, cbY + 87);   // PersonalNr
      if (data.vacationDays !== undefined)
        coord(String(data.vacationDays),  57, cbY + 70);   // Arbeitstage
      coord(data.documentId,             490, cbY + 70);   // Belegnummer
      coord(data.from,                    90, cbY + 50);   // Von-Datum
      coord(data.to,                     425, cbY + 50);   // Bis-Datum
      coord(data.reason,                  57, cbY - 35);   // Begründung
      coord(data.location,                57, cbY - 90);   // Ort (Mitarbeiter)
      coord(data.signedAt,               160, cbY - 90);   // Datum (Mitarbeiter)
    }

    // Mitarbeiter-Unterschrift als Bild einbetten (falls vorhanden)
    if (data.employeeSignatureBase64) {
      try {
        const rawBase64 = data.employeeSignatureBase64
          .replace(/^data:image\/[^;]+;base64,/, "");
        const sigBytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));
        // PNG-Signatur: erste 2 Bytes 0x89 0x50
        const isPng = sigBytes[0] === 0x89 && sigBytes[1] === 0x50;
        const sigImage = isPng
          ? await pdfDoc.embedPng(sigBytes)
          : await pdfDoc.embedJpg(sigBytes);

        // Platzhalter-Textfeld suchen (breite Suche nach möglichen Namen)
        const sigField = fields.find((f) => {
          const n = f.getName().toLowerCase();
          return (
            n.includes("employeesignature") ||
            n.includes("employee_signature") ||
            n.includes("unterschrift_mitarbeiter") ||
            n.includes("mitarbeitersignatur") ||
            n === "unterschrift"
          );
        });

        if (sigField) {
          const widgets = sigField.acroField.getWidgets();
          if (widgets.length > 0) {
            const rect = widgets[0].getRectangle();
            const page = pdfDoc.getPages()[0];
            page.drawImage(sigImage, {
              x: rect.x + 2,
              y: rect.y + 2,
              width: rect.width - 4,
              height: rect.height - 4,
            });
          }
          // Platzhalter-Text leeren damit flatten nichts rendert
          try { form.getTextField(sigField.getName()).setText(""); } catch { /* ignore */ }
        }
      } catch (err) {
        console.warn("[PDF] Unterschrift konnte nicht eingebettet werden:", err);
      }
    }

    // ── Formular flatten: entfernt blaue Hintergründe, rendert statisch ───
    // Vor dem Flatten: leere Textfelder die keine große Box sind mit Linie versehen
    const largeBoxPatterns = ["begruendung", "reason", "notes", "unterschrift", "signature"];
    for (const field of form.getFields()) {
      const rawName = field.getName();
      try {
        const tf = form.getTextField(rawName);
        const currentText = tf.getText() ?? "";
        if (currentText.trim() === "") {
          const isLargeBox = largeBoxPatterns.some((p) =>
            rawName.toLowerCase().includes(p),
          );
          if (!isLargeBox) {
            const widgets = field.acroField.getWidgets();
            if (widgets.length > 0) {
              const rect = widgets[0].getRectangle();
              const page = pdfDoc.getPages()[0];
              // Linie am unteren Rand des leeren Feldes
              page.drawLine({
                start: { x: rect.x, y: rect.y },
                end:   { x: rect.x + rect.width, y: rect.y },
                thickness: 0.5,
                color: rgb(0, 0, 0),
              });
            }
          }
        }
      } catch { /* kein Textfeld – ignorieren */ }
    }

    form.flatten();

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
