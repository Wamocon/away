/**
 * Server-only subscription helpers.
 * Import only from Server Components, Route Handlers, or middleware.
 * Do NOT import this file in Client Components.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Subscription } from "./subscription";

/**
 * Server-side subscription fetch using SSR cookie client.
 */
export async function getSubscriptionServer(
  orgId: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  schema: string,
): Promise<Subscription | null> {
  if (!orgId) return null;
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      db: { schema },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    });
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        `id, organization_id, plan_id, status,
         trial_start, trial_end, grace_end,
         activated_by, order_requested_at, created_at,
         plan:subscription_plans (id, name, max_users, features, price_monthly)`,
      )
      .eq("organization_id", orgId)
      .maybeSingle();
    if (error || !data) return null;
    return data as unknown as Subscription;
  } catch {
    return null;
  }
}

/**
 * Server-side super-admin check.
 */
export async function isSuperAdminServer(
  userId: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    });
    const { data } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return data !== null;
  } catch {
    return false;
  }
}
