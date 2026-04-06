import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function getSchema(): string {
  if (process.env.NEXT_PUBLIC_DB_SCHEMA) return process.env.NEXT_PUBLIC_DB_SCHEMA;
  if (process.env.NEXT_PUBLIC_SCHEMA) return process.env.NEXT_PUBLIC_SCHEMA;
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development";
  if (env === "production") return "away-prod";
  if (env === "preview") return "away-test";
  return "away-dev";
}

/**
 * Cron job: check and update subscription statuses.
 *
 * Secured via CRON_SECRET header (configured in Vercel cron settings).
 * Schedule: daily at 02:00 UTC (see vercel.json)
 *
 * Logic:
 *  1. trial → expired  when trial_end < now()
 *  2. expired → grace  when grace_end is null (sets grace_end = now + 30d)
 *  3. grace period ended → soft-delete org data
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schema = getSchema();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema },
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );

  const now = new Date().toISOString();
  const results = { expired: 0, grace: 0, deleted: 0, errors: 0 };

  // ── Step 1: trial → expired ───────────────────────────────────────────────
  const { data: expiredTrials, error: expError } = await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("status", "trial")
    .lt("trial_end", now)
    .select("id, organization_id");

  if (expError) {
    console.error("[cron] expire trial error:", expError);
    results.errors++;
  } else {
    results.expired = expiredTrials?.length ?? 0;
  }

  // Also transition pending_order to expired if trial expired
  const { data: expiredPending } = await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("status", "pending_order")
    .lt("trial_end", now)
    .select("id, organization_id");
  results.expired += expiredPending?.length ?? 0;

  // ── Step 2: expired → grace (grace_end = now + 30d) ──────────────────────
  const graceEnd = new Date();
  graceEnd.setDate(graceEnd.getDate() + 30);

  const { data: graceRows, error: graceError } = await supabase
    .from("subscriptions")
    .update({ status: "grace", grace_end: graceEnd.toISOString() })
    .eq("status", "expired")
    .is("grace_end", null)
    .select("id, organization_id");

  if (graceError) {
    console.error("[cron] grace transition error:", graceError);
    results.errors++;
  } else {
    results.grace = graceRows?.length ?? 0;
  }

  // ── Step 3: grace period ended → soft-delete org data ─────────────────────
  const { data: overdueRows, error: overdueError } = await supabase
    .from("subscriptions")
    .select("id, organization_id")
    .eq("status", "grace")
    .lt("grace_end", now);

  if (overdueError) {
    console.error("[cron] overdue query error:", overdueError);
    results.errors++;
  } else if (overdueRows && overdueRows.length > 0) {
    for (const row of overdueRows) {
      try {
        const orgId = row.organization_id;

        // Delete vacation_requests
        await supabase
          .from("vacation_requests")
          .delete()
          .eq("organization_id", orgId);

        // Delete user_settings
        await supabase
          .from("user_settings")
          .delete()
          .eq("organization_id", orgId);

        // Delete user_roles
        await supabase
          .from("user_roles")
          .delete()
          .eq("organization_id", orgId);

        // Mark organization as deleted (soft-delete via name prefix)
        await supabase
          .from("organizations")
          .update({ name: `[DELETED] ${orgId}` })
          .eq("id", orgId);

        // Update subscription status
        await supabase
          .from("subscriptions")
          .update({ status: "expired" })
          .eq("id", row.id);

        results.deleted++;
      } catch (err) {
        console.error("[cron] delete error for org:", row.organization_id, err);
        results.errors++;
      }
    }
  }

  console.log("[cron] check-subscriptions result:", results);
  return NextResponse.json({ success: true, ...results });
}
