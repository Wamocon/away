import { NextRequest, NextResponse } from "next/server";

// Callback-Handler für Google OAuth2
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { success: false, message: "Kein Code erhalten" },
      { status: 400 },
    );
  }
  // Token-Austausch
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri =
    process.env.NEXT_PUBLIC_BASE_URL + "/api/oauth/google/callback";
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.json(
      {
        success: false,
        message: "Token-Austausch fehlgeschlagen",
        details: tokenData,
      },
      { status: 400 },
    );
  }
  // Hier: Token speichern/weitergeben (z.B. als Cookie oder Weiterleitung mit Token)
  // Demo: Token als Query-Parameter weiterleiten
  return NextResponse.redirect(
    `/dashboard?google_token=${tokenData.access_token}`,
  );
}
