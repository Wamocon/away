import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hasEmailProvider,
  buildUpgradeMailtoLink,
  buildVacationSubmitMailtoLink,
} from "../email";

// ── Supabase mock ────────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockEqInner = vi.fn();
const mockEqOuter = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

function resetChain() {
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEqOuter });
  mockEqOuter.mockReturnValue({ eq: mockEqInner });
  mockEqInner.mockReturnValue({ maybeSingle: mockMaybeSingle });
}

// ── hasEmailProvider ─────────────────────────────────────────────────────────

describe("hasEmailProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
  });

  it("returns false when userId is empty", async () => {
    expect(await hasEmailProvider("", "org-1")).toBe(false);
  });

  it("returns false when orgId is empty", async () => {
    expect(await hasEmailProvider("user-1", "")).toBe(false);
  });

  it("returns true when outlook_token is long enough", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { settings: { outlook_token: "a".repeat(11) } },
    });
    expect(await hasEmailProvider("user-1", "org-1")).toBe(true);
  });

  it("returns true when google_token is long enough", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { settings: { google_token: "g".repeat(15) } },
    });
    expect(await hasEmailProvider("user-1", "org-1")).toBe(true);
  });

  it("returns false when settings is null", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    expect(await hasEmailProvider("user-1", "org-1")).toBe(false);
  });

  it("returns false when settings object has no token fields", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { settings: { theme: "dark" } },
    });
    expect(await hasEmailProvider("user-1", "org-1")).toBe(false);
  });

  it("returns false when tokens are too short (≤10 chars)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { settings: { outlook_token: "short" } },
    });
    expect(await hasEmailProvider("user-1", "org-1")).toBe(false);
  });

  it("returns false on supabase exception", async () => {
    mockMaybeSingle.mockRejectedValue(new Error("DB error"));
    expect(await hasEmailProvider("user-1", "org-1")).toBe(false);
  });
});

// ── buildUpgradeMailtoLink ───────────────────────────────────────────────────

describe("buildUpgradeMailtoLink", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_UPGRADE_NOTIFY_EMAIL;
  });

  it("uses NEXT_PUBLIC_UPGRADE_NOTIFY_EMAIL env var when set", () => {
    process.env.NEXT_PUBLIC_UPGRADE_NOTIFY_EMAIL = "custom@upgrade.de";
    const link = buildUpgradeMailtoLink({
      orgName: "ACME",
      planTier: "lite",
      userEmail: "u@x.de",
    });
    expect(link).toContain("mailto:custom@upgrade.de");
    delete process.env.NEXT_PUBLIC_UPGRADE_NOTIFY_EMAIL;
  });

  it("falls back to default email when env var not set", () => {
    const link = buildUpgradeMailtoLink({
      orgName: "ACME",
      planTier: "lite",
      userEmail: "u@x.de",
    });
    expect(link).toContain("mailto:upgrade@away-app.de");
  });

  it("contains encoded org name in body", () => {
    const link = buildUpgradeMailtoLink({
      orgName: "My Corp",
      planTier: "pro",
      userEmail: "u@x.de",
    });
    expect(link).toContain("My%20Corp");
  });

  it("contains subject and body query params", () => {
    const link = buildUpgradeMailtoLink({
      orgName: "XYZ",
      planTier: "lite",
      userEmail: "admin@xyz.de",
    });
    expect(link).toContain("subject=");
    expect(link).toContain("body=");
  });

  it("contains the contact email in the body", () => {
    const link = buildUpgradeMailtoLink({
      orgName: "ACME",
      planTier: "lite",
      userEmail: "contact@acme.de",
    });
    expect(link).toContain("contact%40acme.de");
  });
});

// ── buildVacationSubmitMailtoLink ────────────────────────────────────────────

describe("buildVacationSubmitMailtoLink", () => {
  const base = {
    approverEmail: "boss@company.de",
    applicantName: "Max Mustermann",
    fromDate: "2026-06-01",
    toDate: "2026-06-10",
  };

  it("builds a valid mailto link with required fields", () => {
    const link = buildVacationSubmitMailtoLink(base);
    expect(link).toContain("mailto:boss@company.de");
    expect(link).toContain("subject=");
    expect(link).toContain("body=");
  });

  it("includes applicant name in subject", () => {
    const link = buildVacationSubmitMailtoLink(base);
    expect(link).toContain("Max%20Mustermann");
  });

  it("uses Neuer Antrag as fallback when no requestNumber", () => {
    const link = buildVacationSubmitMailtoLink(base);
    expect(link).toContain("Neuer%20Antrag");
  });

  it("includes requestNumber when provided", () => {
    const link = buildVacationSubmitMailtoLink({
      ...base,
      requestNumber: "REQ-2026-001",
    });
    expect(link).toContain("REQ-2026-001");
  });

  it("includes days line when days provided", () => {
    const link = buildVacationSubmitMailtoLink({ ...base, days: 7 });
    expect(decodeURIComponent(link)).toContain("Arbeitstage");
    expect(link).toContain("7");
  });

  it("excludes days line when days not provided", () => {
    const link = buildVacationSubmitMailtoLink(base);
    expect(decodeURIComponent(link)).not.toContain("Arbeitstage");
  });

  it("includes reason when provided", () => {
    const link = buildVacationSubmitMailtoLink({
      ...base,
      reason: "Jahresurlaub",
    });
    expect(decodeURIComponent(link)).toContain("Jahresurlaub");
  });

  it("excludes reason line when not provided", () => {
    const link = buildVacationSubmitMailtoLink(base);
    expect(decodeURIComponent(link)).not.toContain("Grund:");
  });

  it("includes appLink when provided", () => {
    const link = buildVacationSubmitMailtoLink({
      ...base,
      appLink: "https://away.de/dashboard/requests/123",
    });
    expect(decodeURIComponent(link)).toContain(
      "https://away.de/dashboard/requests/123",
    );
  });

  it("excludes appLink line when not provided", () => {
    const link = buildVacationSubmitMailtoLink(base);
    expect(decodeURIComponent(link)).not.toContain("Link zum Antrag");
  });

  it("includes from and to dates in subject", () => {
    const link = buildVacationSubmitMailtoLink(base);
    expect(decodeURIComponent(link)).toContain("2026-06-01");
    expect(decodeURIComponent(link)).toContain("2026-06-10");
  });
});
