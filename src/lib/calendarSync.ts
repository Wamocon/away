import { createClient } from '@/lib/supabase/client';

/**
 * Calendar Sync Utilities
 * 
 * OAuth tokens/credentials are stored in user_settings JSONB:
 * {
 *   outlook_email: string,
 *   outlook_token: string,
 *   google_email: string,
 *   google_token: string,
 * }
 */

export interface CalendarEventInput {
  userId: string;
  orgId: string;
  provider: 'outlook' | 'google';
  externalId: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  description?: string;
  isConfirmed?: boolean;
}

export interface ExternalCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}

/**
 * Save OAuth provider credentials to user_settings JSONB
 * These are used when you set up Azure App / Google Console later
 */
export async function saveOAuthSettings(
  userId: string,
  orgId: string,
  provider: 'outlook' | 'google',
  email: string,
  token: string
) {
  if (!userId || userId.length < 32) throw new Error('Benutzer-ID fehlt oder ist ungültig.');
  if (!orgId || orgId.length < 32) throw new Error('Organisations-ID fehlt oder ist ungültig.');
  
  const supabase = createClient();

  // Load current settings
  const { data: existing } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle();

  const currentSettings = (existing?.settings as Record<string, unknown>) || {};
  const updatedSettings = {
    ...currentSettings,
    [`${provider}_email`]: email,
    [`${provider}_token`]: token,
  };

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      organization_id: orgId,
      settings: updatedSettings,
    }, { onConflict: 'user_id,organization_id' });

  if (error) throw error;
}

/**
 * Get OAuth settings for a provider
 */
export async function getOAuthSettings(
  userId: string,
  orgId: string,
  provider: 'outlook' | 'google'
): Promise<{ email: string; token: string } | null> {
  if (!userId || userId.length < 32 || !orgId || orgId.length < 32) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!data?.settings) return null;
  const settings = data.settings as Record<string, string>;
  const email = settings[`${provider}_email`];
  const token = settings[`${provider}_token`];
  if (!token) return null;
  return { email, token };
}

/**
 * Import calendar events into the database
 */
export async function importCalendarEvents(events: CalendarEventInput[]) {
  const supabase = createClient();
  const rows = events.map(e => ({
    user_id: e.userId,
    organization_id: e.orgId,
    external_id: e.externalId,
    provider: e.provider,
    title: e.title,
    start_date: e.startDate,
    end_date: e.endDate,
    all_day: e.allDay ?? true,
    description: e.description,
  }));

  const { error } = await supabase
    .from('calendar_events')
    .upsert(rows, { onConflict: 'user_id,external_id,provider' });

  if (error) throw error;
}

/**
 * Get synced calendar events for an organization
 */
export async function getSyncedEvents(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('organization_id', orgId)
    .order('start_date');
  if (error) throw error;
  return data || [];
}

/**
 * Build the Microsoft OAuth URL (requires Azure App Registration)
 * Call this when redirecting to Microsoft login
 */
export function getMicrosoftOAuthUrl(clientId: string, redirectUri: string): string {
  const scope = encodeURIComponent('Calendars.Read offline_access');
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_mode=query`;
}

/**
 * Build the Google OAuth URL (requires Google Console App)
 */
export function getGoogleOAuthUrl(clientId: string, redirectUri: string): string {
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly');
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline`;
}
/**
 * Fetch calendar events from the real provider API using a valid OAuth access token.
 *
 * Microsoft Graph: token must be an access token with `Calendars.Read` scope.
 * Google Calendar: token must be an access token with `calendar.readonly` scope.
 *
 * These tokens are obtained via OAuth PKCE/redirect flow using Azure App Registration
 * or Google Cloud Console. Until the OAuth flow is wired up, users can paste
 * a short-lived access token obtained from https://developer.microsoft.com/en-us/graph/graph-explorer
 * or https://developers.google.com/oauthplayground/.
 */
export async function fetchExternalEvents(
  provider: 'outlook' | 'google',
  token: string,
): Promise<ExternalCalendarEvent[]> {
  if (!token || token.length < 10) {
    throw new Error(`Ungültiger Token für ${provider}. Bitte prüfen Sie Ihre Einstellungen.`);
  }

  const now = new Date().toISOString();
  const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  if (provider === 'outlook') {
    const url =
      `https://graph.microsoft.com/v1.0/me/calendarView` +
      `?startDateTime=${encodeURIComponent(now)}` +
      `&endDateTime=${encodeURIComponent(threeMonths)}` +
      `&$select=id,subject,start,end,isAllDay` +
      `&$orderby=start/dateTime` +
      `&$top=50`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    if (res.status === 401) throw new Error('Microsoft-Token abgelaufen oder ungültig. Bitte neu verbinden.');
    if (!res.ok) {
      const errBody = await res.text().catch(() => res.statusText);
      throw new Error(`Microsoft Graph Fehler (${res.status}): ${errBody}`);
    }

    const json: { value?: { id: string; subject?: string; start: { dateTime: string }; end: { dateTime: string }; isAllDay?: boolean }[] } = await res.json();
    return (json.value ?? []).map(ev => ({
      id: ev.id,
      title: ev.subject ?? '(Kein Titel)',
      start: ev.start.dateTime,
      end: ev.end.dateTime,
      allDay: ev.isAllDay ?? false,
    }));
  }

  // Google Calendar
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
    `?maxResults=50` +
    `&orderBy=startTime` +
    `&singleEvents=true` +
    `&timeMin=${encodeURIComponent(now)}` +
    `&timeMax=${encodeURIComponent(threeMonths)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) throw new Error('Google-Token abgelaufen oder ungültig. Bitte neu verbinden.');
  if (!res.ok) {
    const errBody = await res.text().catch(() => res.statusText);
    throw new Error(`Google Calendar Fehler (${res.status}): ${errBody}`);
  }

  const json: { items?: { id: string; summary?: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string } }[] } = await res.json();
  return (json.items ?? []).map(ev => ({
    id: ev.id,
    title: ev.summary ?? '(Kein Titel)',
    start: ev.start.dateTime ?? ev.start.date ?? '',
    end: ev.end.dateTime ?? ev.end.date ?? '',
    allDay: !ev.start.dateTime,
  }));
}
