import { createClient } from "@/lib/supabase/client";
import { createBrowserClient } from "@supabase/ssr";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "expired"
  | "grace"
  | "pending_order";

export type PlanTier = "lite" | "pro";

/**
 * Feature keys – correspond 1:1 to the JSONB keys in subscription_plans.features
 */
export type FeatureKey =
  | "vacation_requests"
  | "approval_workflow"
  | "in_app_calendar"
  | "user_settings"
  | "invite_link"
  | "legal_consent"
  | "calendar_sync"
  | "email_integration"
  | "document_templates"
  | "reports"
  | "multi_org"
  | "admin_consents"
  | "calendar_invite";

export interface SubscriptionPlan {
  id: string;
  name: PlanTier;
  max_users: number | null;
  features: Record<FeatureKey, boolean>;
  price_monthly: number;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  trial_start: string;
  trial_end: string;
  grace_end: string | null;
  activated_by: string | null;
  order_requested_at: string | null;
  created_at: string;
  plan: SubscriptionPlan;
}

// ── Feature flags per Plan (client-side fallback without DB) ──────────────────

export const LITE_FEATURES: Record<FeatureKey, boolean> = {
  vacation_requests: true,
  approval_workflow: true,
  in_app_calendar: true,
  user_settings: true,
  invite_link: true,
  legal_consent: true,
  calendar_sync: false,
  email_integration: false,
  document_templates: false,
  reports: false,
  multi_org: false,
  admin_consents: false,
  calendar_invite: false,
};

export const PRO_FEATURES: Record<FeatureKey, boolean> = {
  vacation_requests: true,
  approval_workflow: true,
  in_app_calendar: true,
  user_settings: true,
  invite_link: true,
  legal_consent: true,
  calendar_sync: true,
  email_integration: true,
  document_templates: true,
  reports: true,
  multi_org: true,
  admin_consents: true,
  calendar_invite: true,
};

// ── Client-side functions ─────────────────────────────────────────────────────

/**
 * Load the active subscription for an organisation (client-side).
 * Returns null if no subscription exists.
 */
export async function getSubscription(
  orgId: string,
): Promise<Subscription | null> {
  if (!orgId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
      id, organization_id, plan_id, status,
      trial_start, trial_end, grace_end,
      activated_by, order_requested_at, created_at,
      plan:subscription_plans (
        id, name, max_users, features, price_monthly
      )
    `,
    )
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as Subscription;
}

/**
 * Returns true when the subscription grants access (trial not expired OR active).
 */
export function isPlanActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  const now = new Date();
  if (sub.status === "active") return true;
  if (sub.status === "trial") {
    return new Date(sub.trial_end) > now;
  }
  if (sub.status === "pending_order") {
    // pending_order is still in trial period – keep access
    return new Date(sub.trial_end) > now;
  }
  // grace or expired → no access
  return false;
}

/**
 * Returns true when a given feature is enabled for the subscription.
 * Falls back to LITE_FEATURES when subscription is null.
 */
export function hasFeature(
  sub: Subscription | null,
  feature: FeatureKey,
): boolean {
  if (!sub) return LITE_FEATURES[feature];
  const features = sub.plan?.features ?? LITE_FEATURES;
  return features[feature] === true;
}

/**
 * Returns the plan tier ("lite" | "pro") or "lite" as fallback.
 */
export function getPlanTier(sub: Subscription | null): PlanTier {
  return sub?.plan?.name ?? "lite";
}

/**
 * Returns remaining trial days (0 if expired).
 */
export function getTrialDaysLeft(sub: Subscription | null): number {
  if (!sub || sub.status !== "trial") return 0;
  const diff = new Date(sub.trial_end).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ── Super-Admin check (client-side) ──────────────────────────────────────────

/**
 * Check if the current user is a Super-Admin (client-side).
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const supabase = createBrowserClient(url, key, { db: { schema: "public" } });
  const { data } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data !== null;
}

// ── Pro-only route list (used in middleware) ──────────────────────────────────

export const PRO_ONLY_ROUTES = [
  "/dashboard/organizations",
  "/dashboard/reports",
  "/dashboard/email",
  "/admin/consents",
];
