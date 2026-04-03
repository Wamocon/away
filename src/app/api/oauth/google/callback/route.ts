import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Callback-Handler für Google OAuth2
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.json(
      { success: false, message: "Kein Code erhalten" },
      { status: 400 },
    );
  }

  // Validate state to prevent CSRF
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { success: false, message: "Ungültiger State-Parameter" },
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

  // Store token in a secure httpOnly cookie and redirect without secrets in URL
  const response = NextResponse.redirect(
    new URL("/dashboard", process.env.NEXT_PUBLIC_BASE_URL ?? req.url),
  );
  response.cookies.set("google_access_token", tokenData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600,
    path: "/",
  });
  // Clear the oauth_state cookie
  response.cookies.delete("oauth_state");
  return response;
}
