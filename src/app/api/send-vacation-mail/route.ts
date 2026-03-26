import { NextRequest, NextResponse } from 'next/server';

// Diese API-Route versendet E-Mails über Google (Gmail) oder Microsoft (Outlook) mit OAuth2-Token
export async function POST(req: NextRequest) {
  const { provider, to, subject, text, accessToken } = await req.json();

  if (!provider || !to || !subject || !text || !accessToken) {
    return NextResponse.json({ success: false, message: 'Fehlende Parameter' }, { status: 400 });
  }

  if (provider === 'google') {
    // Gmail API: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
    // Hier müsste eine MIME-Message base64url-codiert gesendet werden
    // (Demo: nur Struktur, kein echter Versand)
    // const rawMessage = ...
    // await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', ...)
    return NextResponse.json({ success: true, message: 'Gmail-Versand simuliert' });
  }

  if (provider === 'microsoft') {
    // Microsoft Graph API: https://learn.microsoft.com/en-us/graph/api/user-sendmail
    // (Demo: nur Struktur, kein echter Versand)
    // await fetch('https://graph.microsoft.com/v1.0/me/sendMail', ...)
    return NextResponse.json({ success: true, message: 'Outlook-Versand simuliert' });
  }

  return NextResponse.json({ success: false, message: 'Unbekannter Provider' }, { status: 400 });
}
