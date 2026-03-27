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
 * Simulate fetching calendar events from an external provider (Outlook/Google)
 * In production, this would call Microsoft Graph or Google Calendar API
 */
export async function fetchExternalEvents(
  provider: 'outlook' | 'google',
  token: string
): Promise<ExternalCalendarEvent[]> {
  // Simulate API latency
  await new Promise(r => setTimeout(r, 1000));

  // If token is invalid/empty, simulate error
  if (!token || token.length < 5) {
    throw new Error(`Ungültiger Token für ${provider}. Bitte prüfen Sie Ihre Einstellungen.`);
  }

  // Generate some realistic mock data based on current date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: `ext_${provider}_1`,
      title: `Team Meeting (${provider})`,
      start: `${year}-${month}-02T10:00:00Z`,
      end: `${year}-${month}-02T11:00:00Z`,
      allDay: false
    },
    {
      id: `ext_${provider}_2`,
      title: `Projekt-Review`,
      start: `${year}-${month}-05T14:30:00Z`,
      end: `${year}-${month}-05T15:30:00Z`,
      allDay: false
    },
    {
      id: `ext_${provider}_3`,
      title: `Konferenz (${provider === 'google' ? 'Google' : 'MS'})`,
      start: `${year}-${month}-10T09:00:00Z`,
      end: `${year}-${month}-12T17:00:00Z`,
      allDay: true
    }
  ];
}
