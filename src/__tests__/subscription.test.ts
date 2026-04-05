import { describe, it, expect } from "vitest";
import {
  isPlanActive,
  hasFeature,
  getPlanTier,
  getTrialDaysLeft,
  LITE_FEATURES,
  PRO_FEATURES,
  type Subscription,
  type SubscriptionPlan,
} from "@/lib/subscription";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlan(name: "lite" | "pro"): SubscriptionPlan {
  return {
    id: "plan-id",
    name,
    max_users: name === "lite" ? 50 : null,
    features: name === "lite" ? LITE_FEATURES : PRO_FEATURES,
    price_monthly: 0,
  };
}

function makeSub(
  overrides: Partial<Subscription> = {},
  planName: "lite" | "pro" = "lite",
): Subscription {
  const now = new Date();
  const future = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  return {
    id: "sub-id",
    organization_id: "org-id",
    plan_id: "plan-id",
    status: "trial",
    trial_start: past.toISOString(),
    trial_end: future.toISOString(),
    grace_end: null,
    activated_by: null,
    order_requested_at: null,
    created_at: past.toISOString(),
    plan: makePlan(planName),
    ...overrides,
  };
}

// ── isPlanActive ──────────────────────────────────────────────────────────────

describe("isPlanActive", () => {
  it("returns false for null subscription", () => {
    expect(isPlanActive(null)).toBe(false);
  });

  it("returns true for active trial (trial_end in future)", () => {
    const sub = makeSub({ status: "trial" });
    expect(isPlanActive(sub)).toBe(true);
  });

  it("returns false for expired trial (trial_end in past)", () => {
    const pastEnd = new Date(Date.now() - 1000).toISOString();
    const sub = makeSub({ status: "trial", trial_end: pastEnd });
    expect(isPlanActive(sub)).toBe(false);
  });

  it("returns true for active status", () => {
    const sub = makeSub({ status: "active" });
    expect(isPlanActive(sub)).toBe(true);
  });

  it("returns false for expired status", () => {
    const sub = makeSub({ status: "expired" });
    expect(isPlanActive(sub)).toBe(false);
  });

  it("returns false for grace status", () => {
    const sub = makeSub({ status: "grace" });
    expect(isPlanActive(sub)).toBe(false);
  });

  it("returns true for pending_order within trial period", () => {
    const sub = makeSub({ status: "pending_order" });
    expect(isPlanActive(sub)).toBe(true);
  });

  it("returns false for pending_order with expired trial", () => {
    const pastEnd = new Date(Date.now() - 1000).toISOString();
    const sub = makeSub({ status: "pending_order", trial_end: pastEnd });
    expect(isPlanActive(sub)).toBe(false);
  });
});

// ── hasFeature ────────────────────────────────────────────────────────────────

describe("hasFeature", () => {
  it("returns LITE_FEATURES fallback for null subscription", () => {
    expect(hasFeature(null, "vacation_requests")).toBe(true);
    expect(hasFeature(null, "reports")).toBe(false);
  });

  it("lite plan: core features enabled", () => {
    const sub = makeSub({}, "lite");
    expect(hasFeature(sub, "vacation_requests")).toBe(true);
    expect(hasFeature(sub, "approval_workflow")).toBe(true);
    expect(hasFeature(sub, "in_app_calendar")).toBe(true);
  });

  it("lite plan: pro features disabled", () => {
    const sub = makeSub({}, "lite");
    expect(hasFeature(sub, "calendar_sync")).toBe(false);
    expect(hasFeature(sub, "email_integration")).toBe(false);
    expect(hasFeature(sub, "reports")).toBe(false);
    expect(hasFeature(sub, "multi_org")).toBe(false);
    expect(hasFeature(sub, "document_templates")).toBe(false);
    expect(hasFeature(sub, "admin_consents")).toBe(false);
    expect(hasFeature(sub, "calendar_invite")).toBe(false);
  });

  it("pro plan: all features enabled", () => {
    const sub = makeSub({}, "pro");
    expect(hasFeature(sub, "calendar_sync")).toBe(true);
    expect(hasFeature(sub, "email_integration")).toBe(true);
    expect(hasFeature(sub, "reports")).toBe(true);
    expect(hasFeature(sub, "multi_org")).toBe(true);
    expect(hasFeature(sub, "document_templates")).toBe(true);
    expect(hasFeature(sub, "admin_consents")).toBe(true);
    expect(hasFeature(sub, "calendar_invite")).toBe(true);
  });
});

// ── getPlanTier ───────────────────────────────────────────────────────────────

describe("getPlanTier", () => {
  it("returns lite for null subscription", () => {
    expect(getPlanTier(null)).toBe("lite");
  });

  it("returns lite for lite subscription", () => {
    expect(getPlanTier(makeSub({}, "lite"))).toBe("lite");
  });

  it("returns pro for pro subscription", () => {
    expect(getPlanTier(makeSub({}, "pro"))).toBe("pro");
  });
});

// ── getTrialDaysLeft ──────────────────────────────────────────────────────────

describe("getTrialDaysLeft", () => {
  it("returns 0 for null subscription", () => {
    expect(getTrialDaysLeft(null)).toBe(0);
  });

  it("returns 0 for non-trial status", () => {
    const sub = makeSub({ status: "active" });
    expect(getTrialDaysLeft(sub)).toBe(0);
  });

  it("returns positive days for active trial", () => {
    const sub = makeSub({ status: "trial" });
    expect(getTrialDaysLeft(sub)).toBeGreaterThan(0);
    expect(getTrialDaysLeft(sub)).toBeLessThanOrEqual(30);
  });

  it("returns 0 for expired trial", () => {
    const pastEnd = new Date(Date.now() - 1000).toISOString();
    const sub = makeSub({ status: "trial", trial_end: pastEnd });
    expect(getTrialDaysLeft(sub)).toBe(0);
  });
});
