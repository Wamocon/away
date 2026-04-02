import { createClient as createClientComponent } from '@/lib/supabase/client';
import { getOAuthSettings } from '@/lib/calendarSync';
import { getOrgApproversForNotification } from '@/lib/actions/adminActions';
import { VacationRequest } from '@/lib/vacation';

/** Safe base URL – works on both client and server */
function getAppBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  const vercelUrl = process.env.VERCEL_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return 'https://away.wamocon.de';
}

/**
 * Sends an email via the Supabase Edge Function 'send-vacation-mail'.
 * Uses the sender's connected Google / Microsoft OAuth token.
 */
async function sendEmail({
  fromUserId, orgId, toEmail, subject, text,
}: {
  fromUserId: string; orgId: string; toEmail: string; subject: string; text: string;
}): Promise<{ success: boolean; error?: unknown }> {
  const supabase = createClientComponent();
  const [google, outlook] = await Promise.all([
    getOAuthSettings(fromUserId, orgId, 'google'),
    getOAuthSettings(fromUserId, orgId, 'outlook'),
  ]);
  const provider = google ? 'google' : outlook ? 'microsoft' : null;
  const token = google?.token ?? outlook?.token;
  if (!provider || !token) {
    console.warn(`[Notifications] Keine E-Mail-Verbindung fuer Nutzer ${fromUserId}.`);
    return { success: false, error: 'No email connection' };
  }
  try {
    const { error } = await supabase.functions.invoke('send-vacation-mail', {
      body: { provider, to: toEmail, subject, text, accessToken: token },
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    // In dev mode, Edge Functions are often unavailable – suppress to avoid overlay noise
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Notifications] Edge Function nicht verfügbar (dev):', (err as Error)?.message ?? err);
    }
    return { success: false, error: err };
  }
}

/**
 * Fetches the email address of a user from user_settings.
 */
async function getEmailForUser(userId: string, orgId: string): Promise<string | null> {
  try {
    const supabase = createClientComponent();
    const { data } = await supabase
      .from('user_settings').select('settings')
      .eq('user_id', userId).eq('organization_id', orgId).maybeSingle();
    const settings = data?.settings as Record<string, string> | undefined;
    return settings?.email ?? null;
  } catch { return null; }
}

/**
 * Notifies all approvers, CIOs and admins about a new vacation request.
 */
export async function notifyApproversOfSubmission(
  request: VacationRequest, applicantName: string,
): Promise<void> {
  const members = await getOrgApproversForNotification(request.organization_id);
  const recipients = members.filter(m => m.email);
  if (recipients.length === 0) { console.warn('[Notifications] Keine Genehmiger mit E-Mail gefunden.'); return; }
  const baseUrl = getAppBaseUrl();
  const subject = `Neuer Urlaubsantrag: ${applicantName}`;
  const text = [
    'Hallo,', '',
    `${applicantName} hat einen neuen Urlaubsantrag eingereicht.`, '',
    `Zeitraum: ${request.from} bis ${request.to}`,
    `Grund: ${request.reason || 'Kein Grund angegeben'}`, '',
    'Antrag pruefen:', `${baseUrl}/dashboard/requests/${request.id}`, '',
    'Viele Gruesse,', 'Deine Away App',
  ].join('\n');
  console.log(`[Notifications] Benachrichtige ${recipients.length} Genehmiger.`);
  await Promise.allSettled(
    recipients.filter(r => r.email).map(r =>
      sendEmail({ fromUserId: request.user_id, orgId: request.organization_id, toEmail: r.email!, subject, text }),
    ),
  );
}

/**
 * Notifies the applicant about a status change (approved / rejected).
 */
export async function notifyApplicantOfStatusChange(
  request: VacationRequest, newStatus: 'approved' | 'rejected', approverUserId: string,
): Promise<void> {
  try {
    const applicantEmail = await getEmailForUser(request.user_id, request.organization_id);
    if (!applicantEmail) {
      console.warn(`[Notifications] Keine E-Mail fuer Antragsteller ${request.user_id}.`);
      return;
    }
    const statusGer = newStatus === 'approved' ? 'GENEHMIGT' : 'ABGELEHNT';
    const baseUrl = getAppBaseUrl();
    const subject = `Urlaubsantrag ${statusGer}: ${request.from} - ${request.to}`;
    const text = [
      'Hallo,', '',
      `dein Urlaubsantrag fuer den Zeitraum ${request.from} bis ${request.to} wurde ${statusGer.toLowerCase()}.`, '',
      'Details zum Antrag:', `${baseUrl}/dashboard/requests/${request.id}`, '',
      'Viele Gruesse,', 'Deine Away App',
    ].join('\n');
    console.log(`[Notifications] Benachrichtige Antragsteller (${applicantEmail}) ueber Status: ${newStatus}`);
    const result = await sendEmail({
      fromUserId: approverUserId, orgId: request.organization_id,
      toEmail: applicantEmail, subject, text,
    });
    if (!result.success) console.warn('[Notifications] Status-Benachrichtigung fehlgeschlagen:', result.error);
  } catch (err) {
    console.error('[Notifications] Fehler in notifyApplicantOfStatusChange:', err);
  }
}
