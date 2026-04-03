import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// OAuth2-Startpunkt für Google
// req wird nicht benötigt
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri =
    process.env.NEXT_PUBLIC_BASE_URL + "/api/oauth/google/callback";
  const scope = "https://www.googleapis.com/auth/gmail.send";
  const state = Math.random().toString(36).substring(2);

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&state=${state}`;
  return NextResponse.redirect(url);
}
