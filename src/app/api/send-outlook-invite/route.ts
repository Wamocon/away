import { NextRequest, NextResponse } from 'next/server';

// API-Route: Outlook-Termineinladung an Team versenden
export async function POST(req: NextRequest) {
  const { accessToken, subject, start, end, attendees } = await req.json();

  if (!accessToken || !subject || !start || !end || !attendees) {
    return NextResponse.json({ success: false, message: 'Fehlende Parameter' }, { status: 400 });
  }

  // Microsoft Graph API: https://learn.microsoft.com/en-us/graph/api/user-post-events
  // Demo: Struktur, kein echter Versand
  // await fetch('https://graph.microsoft.com/v1.0/me/events', ...)

  return NextResponse.json({ success: true, message: 'Termin-Einladung simuliert' });
}
