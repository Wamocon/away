/**
 * Email utilities
 *
 * Provides helper functions for checking email provider availability
 * and building mailto: fallback links when no OAuth provider is connected.
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Check if the user has an email provider (Outlook or Google) configured
 * for the given organisation.
 */
export async function hasEmailProvider(
  userId: string,
  orgId: string,
): Promise<boolean> {
  if (!userId || !orgId) return false;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!data?.settings) return false;
    const s = data.settings as Record<string, unknown>;
    return !!(
      (s.outlook_token && String(s.outlook_token).length > 10) ||
      (s.google_token && String(s.google_token).length > 10)
    );
  } catch {
    return false;
  }
}

/**
 * Build a pre-filled mailto: link for the upgrade request flow.
 * Opens the user's system mail client with recipient, subject, and body prefilled.
 */
export function buildUpgradeMailtoLink(params: {
  orgName: string;
  planTier: string;
  userEmail: string;
}): string {
  const to = process.env.NEXT_PUBLIC_UPGRADE_NOTIFY_EMAIL ?? "upgrade@away-app.de";
  const subject = encodeURIComponent(
    `Upgrade-Anfrage: ${params.orgName} → ${params.planTier === "pro" ? "Pro" : "Pro"}-Plan`,
  );
  const body = encodeURIComponent(
    `Hallo Away-Team,\n\n` +
      `wir möchten unseren Plan upgraden:\n\n` +
      `Organisation: ${params.orgName}\n` +
      `Aktueller Plan: ${params.planTier}\n` +
      `Gewünschter Plan: Pro\n` +
      `Kontakt-Email: ${params.userEmail}\n\n` +
      `Bitte nehmt Kontakt mit uns auf.\n\n` +
      `Mit freundlichen Grüßen\n` +
      `${params.orgName}`,
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

/**
 * Build a pre-filled mailto: link to submit a vacation request via email.
 * Opens the user's system mail client with the approver as recipient
 * and the request details prefilled.
 */
export function buildVacationSubmitMailtoLink(params: {
  approverEmail: string;
  requestNumber?: string;
  applicantName: string;
  fromDate: string;
  toDate: string;
  days?: number;
  reason?: string;
  appLink?: string;
}): string {
  const requestRef = params.requestNumber ?? "Neuer Antrag";
  const subject = encodeURIComponent(
    `Urlaubsantrag: ${params.applicantName} (${params.fromDate} – ${params.toDate})`,
  );
  const bodyLines = [
    `Hallo,`,
    ``,
    `ich möchte folgenden Urlaubsantrag zur Genehmigung einreichen:`,
    ``,
    `Antrag-Nr.:    ${requestRef}`,
    `Antragsteller: ${params.applicantName}`,
    `Zeitraum:      ${params.fromDate} – ${params.toDate}`,
    params.days !== undefined ? `Arbeitstage:   ${params.days}` : null,
    params.reason ? `Grund:         ${params.reason}` : null,
    params.appLink ? `\nLink zum Antrag: ${params.appLink}` : null,
    ``,
    `Bitte bestätigen oder ablehnen Sie den Antrag.`,
    ``,
    `Mit freundlichen Grüßen`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const body = encodeURIComponent(bodyLines);
  return `mailto:${params.approverEmail}?subject=${subject}&body=${body}`;
}
