import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const schema = process.env.NEXT_PUBLIC_DB_SCHEMA ?? "away-dev";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, orgName, userEmail } = await request.json();
  if (!orgId) {
    return NextResponse.json({ error: "orgId missing" }, { status: 400 });
  }

  const notifyEmail =
    process.env.UPGRADE_NOTIFY_EMAIL ??
    process.env.NEXT_PUBLIC_UPGRADE_NOTIFY_EMAIL ??
    "upgrade@away-app.de";

  // Invoke Supabase Edge Function for email sending
  const { error } = await supabase.functions.invoke("send-upgrade-request", {
    body: {
      to: notifyEmail,
      subject: `Upgrade-Anfrage: ${orgName} → Pro-Plan`,
      text:
        `Neue Upgrade-Anfrage eingegangen:\n\n` +
        `Organisation: ${orgName}\n` +
        `Org-ID: ${orgId}\n` +
        `Kontakt: ${userEmail}\n` +
        `Zeitpunkt: ${new Date().toISOString()}\n\n` +
        `Bitte Plan im Admin-Panel freischalten.`,
    },
  });

  if (error) {
    // Non-fatal: email sending failed, but status was already set
    console.error("[upgrade-api] email send error:", error);
    return NextResponse.json(
      { warning: "Status gesetzt, E-Mail-Versand fehlgeschlagen" },
      { status: 200 },
    );
  }

  return NextResponse.json({ success: true });
}
