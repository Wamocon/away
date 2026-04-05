"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSchema(): string {
  if (process.env.NEXT_PUBLIC_DB_SCHEMA) return process.env.NEXT_PUBLIC_DB_SCHEMA;
  if (process.env.NEXT_PUBLIC_SCHEMA) return process.env.NEXT_PUBLIC_SCHEMA;
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development";
  if (env === "production") return "away-prod";
  if (env === "preview") return "away-test";
  return "away-dev";
}

export type RegisterResult =
  | { success: true }
  | { success: false; error: string };

export async function registerAction(formData: FormData): Promise<RegisterResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const orgName = (formData.get("orgName") as string)?.trim();
  const plan = (formData.get("plan") as string) ?? "lite";
  const termsAccepted = formData.get("termsAccepted") === "true";
  const privacyAccepted = formData.get("privacyAccepted") === "true";
  const dsgvoAccepted = formData.get("dsgvoAccepted") === "true";

  // Input validation
  if (!email || !email.includes("@")) {
    return { success: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }
  if (!password || password.length < 8) {
    return { success: false, error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }
  if (!orgName || orgName.length < 2) {
    return { success: false, error: "Bitte einen Organisations-Namen eingeben (mind. 2 Zeichen)." };
  }
  if (plan !== "lite" && plan !== "pro") {
    return { success: false, error: "Ungültiger Plan ausgewählt." };
  }
  if (!termsAccepted || !privacyAccepted || !dsgvoAccepted) {
    return { success: false, error: "Bitte alle rechtlichen Bedingungen akzeptieren." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const schema = getSchema();

  if (!supabaseUrl || !supabaseServiceKey) {
    return { success: false, error: "Server-Konfiguration fehlt. Bitte Administrator kontaktieren." };
  }

  // Use service role key to bypass RLS for org + subscription creation
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
    db: { schema },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });

  // 1. Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm for trial flow
    user_metadata: {
      terms_accepted: true,
      privacy_accepted: true,
      dsgvo_accepted: true,
      consent_timestamp: new Date().toISOString(),
      consent_version: "1.0",
    },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? "Benutzer konnte nicht erstellt werden." };
  }

  const userId = authData.user.id;

  // 2. Create organisation
  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgError || !orgData) {
    // Clean up user on failure
    await supabase.auth.admin.deleteUser(userId);
    return { success: false, error: "Organisation konnte nicht erstellt werden." };
  }

  const orgId = orgData.id;

  // 3. Assign user as admin
  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userId,
    organization_id: orgId,
    role: "admin",
  });

  if (roleError) {
    await supabase.auth.admin.deleteUser(userId);
    return { success: false, error: "Rollenzuweisung fehlgeschlagen." };
  }

  // 4. Create default user_settings
  await supabase.from("user_settings").insert({
    user_id: userId,
    organization_id: orgId,
    settings: {
      email,
      tourCompleted: false,
      vacationQuota: 30,
      carryOver: 0,
      notifyOnApproval: true,
      notifyOnRejection: true,
      notifyOnReminder: false,
    },
  });

  // 5. Find the selected plan
  const { data: planData, error: planError } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("name", plan)
    .maybeSingle();

  if (planError || !planData) {
    await supabase.auth.admin.deleteUser(userId);
    return { success: false, error: "Plan nicht gefunden – bitte Administrator kontaktieren." };
  }

  // 6. Create trial subscription (30 days)
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  const { error: subError } = await supabase.from("subscriptions").insert({
    organization_id: orgId,
    plan_id: planData.id,
    status: "trial",
    trial_start: new Date().toISOString(),
    trial_end: trialEnd.toISOString(),
  });

  if (subError) {
    await supabase.auth.admin.deleteUser(userId);
    return { success: false, error: "Subscription konnte nicht erstellt werden." };
  }

  // 7. Sign in the newly created user
  const supabaseAnon = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  await supabaseAnon.auth.signInWithPassword({ email, password });

  return { success: true };
}
