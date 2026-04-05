import { createClient as createClientComponent } from "@/lib/supabase/client";
import { getOAuthSettings } from "@/lib/calendarSync";
import { getOrgApproversForNotification, getAssignedApprover } from "@/lib/actions/adminActions";
import { getApproverEmails } from "@/lib/admin";
import { getTemplatesForOrg, getTemplateBytes, DocumentTemplate } from "@/lib/template";
import { generatePDF, DocumentData } from "@/lib/documentGenerator";
import { VacationRequest } from "@/lib/vacation";

/** Safe base URL – works on both client and server */
function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  const vercelUrl = process.env.VERCEL_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "https://away.wamocon.de";
}

interface EmailAttachment {
  filename: string;
  content: string; // base64
  mimeType: string;
}

/**
 * Sends an email via the Supabase Edge Function 'send-vacation-mail'.
 * Uses the sender's connected Google / Microsoft OAuth token.
 */
async function sendEmail({
  fromUserId,
  orgId,
  toEmail,
  subject,
  text,
  attachment,
}: {
  fromUserId: string;
  orgId: string;
  toEmail: string;
  subject: string;
  text: string;
  attachment?: EmailAttachment;
}): Promise<{ success: boolean; error?: unknown }> {
  const supabase = createClientComponent();
  const [google, outlook] = await Promise.all([
    getOAuthSettings(fromUserId, orgId, "google"),
    getOAuthSettings(fromUserId, orgId, "outlook"),
  ]);
  const provider = google ? "google" : outlook ? "microsoft" : null;
  const token = google?.token ?? outlook?.token;
  if (!provider || !token) {
    console.warn(
      `[Notifications] Keine E-Mail-Verbindung fuer Nutzer ${fromUserId}.`,
    );
    return { success: false, error: "No email connection" };
  }
  try {
    const { error } = await supabase.functions.invoke("send-vacation-mail", {
      body: { provider, to: toEmail, subject, text, accessToken: token, attachment },
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    // In dev mode, Edge Functions are often unavailable – suppress to avoid overlay noise
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Notifications] Edge Function nicht verfügbar (dev):",
        (err as Error)?.message ?? err,
      );
    }
    return { success: false, error: err };
  }
}

/**
 * Fetches the email address of a user from user_settings.
 */
async function getEmailForUser(
  userId: string,
  orgId: string,
): Promise<string | null> {
  try {
    const supabase = createClientComponent();
    const { data } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .maybeSingle();
    const settings = data?.settings as Record<string, string> | undefined;
    return settings?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Notifies all approvers, CIOs and admins about a new vacation request.
 */
export async function notifyApproversOfSubmission(
  request: VacationRequest,
  applicantName: string,
): Promise<void> {
  const members = await getOrgApproversForNotification(request.organization_id);
  const recipients = members.filter((m) => m.email);
  if (recipients.length === 0) {
    console.warn("[Notifications] Keine Genehmiger mit E-Mail gefunden.");
    return;
  }
  const baseUrl = getAppBaseUrl();
  const subject = `Neuer Urlaubsantrag: ${applicantName}`;
  const text = [
    "Hallo,",
    "",
    `${applicantName} hat einen neuen Urlaubsantrag eingereicht.`,
    "",
    `Zeitraum: ${request.from} bis ${request.to}`,
    `Grund: ${request.reason || "Kein Grund angegeben"}`,
    "",
    "Antrag pruefen:",
    `${baseUrl}/dashboard/requests/${request.id}`,
    "",
    "Viele Gruesse,",
    "Deine Away App",
  ].join("\n");
  console.log(
    `[Notifications] Benachrichtige ${recipients.length} Genehmiger.`,
  );
  await Promise.allSettled(
    recipients
      .filter((r) => r.email)
      .map((r) =>
        sendEmail({
          fromUserId: request.user_id,
          orgId: request.organization_id,
          toEmail: r.email!,
          subject,
          text,
        }),
      ),
  );
}

/**
 * Notifies the applicant about a status change (approved / rejected).
 */
export async function notifyApplicantOfStatusChange(
  request: VacationRequest,
  newStatus: "approved" | "rejected",
  approverUserId: string,
): Promise<void> {
  try {
    const applicantEmail = await getEmailForUser(
      request.user_id,
      request.organization_id,
    );
    if (!applicantEmail) {
      console.warn(
        `[Notifications] Keine E-Mail fuer Antragsteller ${request.user_id}.`,
      );
      return;
    }
    const statusGer = newStatus === "approved" ? "GENEHMIGT" : "ABGELEHNT";
    const baseUrl = getAppBaseUrl();
    const subject = `Urlaubsantrag ${statusGer}: ${request.from} - ${request.to}`;
    const text = [
      "Hallo,",
      "",
      `dein Urlaubsantrag fuer den Zeitraum ${request.from} bis ${request.to} wurde ${statusGer.toLowerCase()}.`,
      "",
      "Details zum Antrag:",
      `${baseUrl}/dashboard/requests/${request.id}`,
      "",
      "Viele Gruesse,",
      "Deine Away App",
    ].join("\n");
    console.log(
      `[Notifications] Benachrichtige Antragsteller (${applicantEmail}) ueber Status: ${newStatus}`,
    );
    const result = await sendEmail({
      fromUserId: approverUserId,
      orgId: request.organization_id,
      toEmail: applicantEmail,
      subject,
      text,
    });
    if (!result.success)
      console.warn(
        "[Notifications] Status-Benachrichtigung fehlgeschlagen:",
        result.error,
      );
  } catch (err) {
    console.error(
      "[Notifications] Fehler in notifyApplicantOfStatusChange:",
      err,
    );
  }
}

/**
 * Hilfsfunktion: PDF-Blob → base64-String (Browser-kompatibel).
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Entferne den data:... Präfix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Baut DocumentData aus einem VacationRequest und dessen template_fields auf.
 */
function buildDocumentData(
  request: VacationRequest,
  extra?: { approverLocation?: string; approverDate?: string },
): DocumentData {
  const tf = (request.template_fields ?? {}) as Record<string, unknown>;
  const vacationTypes: Record<string, boolean> = {};
  if (Array.isArray(tf.vacationTypes)) {
    for (const vt of tf.vacationTypes as { id: string; checked?: boolean }[]) {
      vacationTypes[vt.id] = !!vt.checked;
    }
  }
  return {
    from: request.from,
    to: request.to,
    reason: request.reason ?? "",
    deputy: String(tf.deputy ?? ""),
    notes: String(tf.notes ?? ""),
    userEmail: "",
    orgName: "",
    date: String(tf.signedAt ?? ""),
    firstName: String(tf.firstName ?? ""),
    lastName: String(tf.lastName ?? ""),
    employeeId: String(tf.employeeId ?? ""),
    documentId: String(tf.documentId ?? ""),
    vacationDays: tf.vacationDays !== undefined ? Number(tf.vacationDays) : undefined,
    vacationTypes,
    location: String(tf.location ?? ""),
    signedAt: String(tf.signedAt ?? ""),
    employeeSignatureBase64: tf.employeeSignature as string | undefined,
    approverLocation: extra?.approverLocation,
    approverDate: extra?.approverDate,
  };
}

/**
 * Lädt die erste verfügbare Vorlage einer Organisation und gibt deren Bytes zurück.
 * Gibt null zurück wenn keine Vorlage vorhanden.
 */
async function loadOrgTemplateBytes(orgId: string): Promise<ArrayBuffer | null> {
  try {
    const templates = await getTemplatesForOrg(orgId);
    if (!templates || templates.length === 0) return null;
    const first = templates[0] as DocumentTemplate;
    return await getTemplateBytes(first.storage_path);
  } catch (err) {
    console.warn("[Notifications] Template konnte nicht geladen werden:", err);
    return null;
  }
}

/**
 * Reicht den Urlaubsantrag per E-Mail beim zugeordneten Genehmiger ein.
 * Hängt das ausgefüllte PDF an.
 */
export async function submitVacationRequestByEmail(
  request: VacationRequest,
  applicantName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = request.organization_id;

    // 1. Genehmiger ermitteln
    let approver = await getAssignedApprover(request.user_id, orgId);
    if (!approver) {
      const allApprovers = await getApproverEmails(orgId);
      if (allApprovers.length > 0) approver = allApprovers[0];
    }
    if (!approver?.email) {
      return { success: false, error: "Kein Genehmiger hinterlegt. Bitte in den Organisationseinstellungen ergänzen." };
    }

    // 2. PDF generieren
    const templateBytes = await loadOrgTemplateBytes(orgId);
    const docData = buildDocumentData(request);
    const pdfBlob = await generatePDF(docData, templateBytes ?? undefined);
    const pdfBase64 = await blobToBase64(pdfBlob);

    // 3. E-Mail-Text zusammenbauen
    const baseUrl = getAppBaseUrl();
    const approverSalutation = approver.name ? `Hallo Herr ${approver.name}` : "Hallo";
    const subject = `Urlaubsantrag: ${request.from} bis ${request.to} – ${applicantName}`;
    const text = [
      `${approverSalutation},`,
      "",
      `hiermit stelle ich einen Antrag auf Urlaub in dem Zeitraum ${request.from} bis ${request.to}, mit der Bitte um Prüfung und der Freigabe.`,
      "",
      "Hier geht es zum Antrag in AWAY:",
      `${baseUrl}/dashboard/requests/${request.id}`,
      "",
      "Im Anhang ist auch der ausgefüllte Urlaubsantrag angehängt.",
      "",
      "Viele Grüße,",
      applicantName,
    ].join("\n");

    // 4. E-Mail versenden
    const result = await sendEmail({
      fromUserId: request.user_id,
      orgId,
      toEmail: approver.email,
      subject,
      text,
      attachment: {
        filename: (() => {
          try {
            const { format, parseISO } = require("date-fns");
            const { de } = require("date-fns/locale");
            const tf = (request.template_fields ?? {}) as Record<string, string>;
            const monatJahr = format(parseISO(request.from), "MMMMyyyy", { locale: de });
            const antragsteller = [tf.firstName, tf.lastName].filter(Boolean).join("_") || "Unbekannt";
            return `${monatJahr}_Urlaubsantrag_${antragsteller}_${request.from}_${request.to}.pdf`;
          } catch {
            return `Urlaubsantrag_${request.from}_${request.to}.pdf`;
          }
        })(),
        content: pdfBase64,
        mimeType: "application/pdf",
      },
    });

    return result.success
      ? { success: true }
      : { success: false, error: String(result.error ?? "E-Mail konnte nicht gesendet werden.") };
  } catch (err) {
    console.error("[Notifications] Fehler in submitVacationRequestByEmail:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Benachrichtigt den Antragsteller nach Genehmigung mit dem unterschriebenen PDF.
 */
export async function notifyApplicantWithSignedDocument(
  request: VacationRequest,
  approverUserId: string,
  approverName: string,
): Promise<void> {
  try {
    const orgId = request.organization_id;

    const applicantEmail = await getEmailForUser(request.user_id, orgId);
    if (!applicantEmail) {
      console.warn("[Notifications] Keine E-Mail für Antragsteller gefunden.");
      return;
    }

    const tf = (request.template_fields ?? {}) as Record<string, unknown>;
    const applicantName =
      tf.firstName || tf.lastName
        ? `${tf.firstName ?? ""} ${tf.lastName ?? ""}`.trim()
        : "Mitarbeiter";

    // PDF mit Genehmiger-Datum befüllen
    const today = new Date().toLocaleDateString("de-DE");
    const templateBytes = await loadOrgTemplateBytes(orgId);
    const docData = buildDocumentData(request, {
      approverDate: today,
    });
    const pdfBlob = await generatePDF(docData, templateBytes ?? undefined);
    const pdfBase64 = await blobToBase64(pdfBlob);

    const baseUrl = getAppBaseUrl();
    const subject = `Urlaubsantrag genehmigt: ${request.from} bis ${request.to}`;
    const text = [
      `Hallo ${applicantName},`,
      "",
      `dein Urlaubsantrag für den Zeitraum ${request.from} bis ${request.to} wurde genehmigt.`,
      "",
      "Hier geht es zum Antrag in AWAY:",
      `${baseUrl}/dashboard/requests/${request.id}`,
      "",
      "Im Anhang ist der unterschriebene Urlaubsantrag, bitte legen Sie ihn in OneDrive noch ab, vielen Dank.",
      "",
      "Viele Grüße,",
      approverName || "Dein Genehmiger",
    ].join("\n");

    const result = await sendEmail({
      fromUserId: approverUserId,
      orgId,
      toEmail: applicantEmail,
      subject,
      text,
      attachment: {
        filename: `Urlaubsantrag_genehmigt_${request.from}_${request.to}.pdf`,
        content: pdfBase64,
        mimeType: "application/pdf",
      },
    });

    if (!result.success) {
      console.warn("[Notifications] notifyApplicantWithSignedDocument fehlgeschlagen:", result.error);
    }
  } catch (err) {
    console.error("[Notifications] Fehler in notifyApplicantWithSignedDocument:", err);
  }
}
