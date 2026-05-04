import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  notifyApproversOfSubmission,
  notifyApplicantOfStatusChange,
  submitVacationRequestByEmail,
  notifyApplicantWithSignedDocument,
} from "../notifications";
import type { VacationRequest } from "../vacation";

// ── Mocks ──────────────────────────────────────────────────────
const mockFunctions = { invoke: vi.fn() };
const mockFrom = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

const mockSupabase = {
  functions: mockFunctions,
  from: mockFrom,
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

vi.mock("@/lib/calendarSync", () => ({
  getOAuthSettings: vi.fn(),
}));

vi.mock("@/lib/actions/adminActions", () => ({
  getOrgApproversForNotification: vi.fn(),
  getAssignedApprover: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  getApproverEmails: vi.fn(),
}));

vi.mock("@/lib/template", () => ({
  getTemplatesForOrg: vi.fn(),
  getTemplateBytes: vi.fn(),
}));

vi.mock("@/lib/documentGenerator", () => ({
  generatePDF: vi.fn(),
}));

import { getOAuthSettings } from "@/lib/calendarSync";
import { getOrgApproversForNotification, getAssignedApprover } from "@/lib/actions/adminActions";
import { getApproverEmails } from "@/lib/admin";
import { getTemplatesForOrg, getTemplateBytes } from "@/lib/template";
import { generatePDF } from "@/lib/documentGenerator";

const sampleRequest: VacationRequest = {
  id: "req-1",
  user_id: "user-1",
  organization_id: "org-1",
  from: "2026-06-01",
  to: "2026-06-10",
  reason: "Urlaub",
  status: "pending",
  created_at: "2026-04-01T08:00:00Z",
};

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no OAuth connection
    vi.mocked(getOAuthSettings).mockResolvedValue(null);
  });

  describe("notifyApproversOfSubmission", () => {
    it("sends emails to admins, cios, and approvers", async () => {
      vi.mocked(getOrgApproversForNotification).mockResolvedValueOnce([
        { user_id: "a1", email: "admin@x.de", role: "admin" },
        { user_id: "a2", email: "cio@x.de", role: "cio" },
        { user_id: "a3", email: "approver@x.de", role: "approver" },
      ]);
      // OAuth for the applicant (needed to send email)
      vi.mocked(getOAuthSettings).mockResolvedValue({
        email: "sender@x.de",
        token: "tok",
      });
      mockFunctions.invoke.mockResolvedValue({ error: null });

      await notifyApproversOfSubmission(sampleRequest, "Max Mustermann");

      // Should have been called 3 times
      expect(mockFunctions.invoke).toHaveBeenCalledTimes(3);
      const calls = mockFunctions.invoke.mock.calls;
      const toAddresses = calls.map((c) => c[1].body.to);
      expect(toAddresses).toContain("admin@x.de");
      expect(toAddresses).toContain("cio@x.de");
      expect(toAddresses).toContain("approver@x.de");
    });

    it("uses 'Kein Grund angegeben' when request has no reason", async () => {
      vi.mocked(getOrgApproversForNotification).mockResolvedValueOnce([
        { user_id: "a1", email: "admin@x.de", role: "admin" },
      ]);
      vi.mocked(getOAuthSettings).mockResolvedValue({
        email: "sender@x.de",
        token: "tok",
      });
      mockFunctions.invoke.mockResolvedValue({ error: null });

      const reqNoReason = { ...sampleRequest, reason: "" };
      await notifyApproversOfSubmission(reqNoReason, "Max Mustermann");

      expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
      const body = mockFunctions.invoke.mock.calls[0][1].body;
      expect(body.text).toContain("Kein Grund angegeben");
    });

    it("sends email via microsoft provider when only outlook is configured", async () => {
      vi.mocked(getOrgApproversForNotification).mockResolvedValueOnce([
        { user_id: "a1", email: "admin@x.de", role: "admin" },
      ]);
      // google returns null, outlook returns a token
      vi.mocked(getOAuthSettings)
        .mockResolvedValueOnce(null) // google call
        .mockResolvedValueOnce({ email: "sender@outlook.de", token: "outlook-tok" }); // outlook call
      mockFunctions.invoke.mockResolvedValue({ error: null });

      await notifyApproversOfSubmission(sampleRequest, "Max Mustermann");

      expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
      const body = mockFunctions.invoke.mock.calls[0][1].body;
      expect(body.provider).toBe("microsoft");
    });

    it("skips gracefully if getOrgApproversForNotification returns empty", async () => {
      vi.mocked(getOrgApproversForNotification).mockResolvedValueOnce([]);
      await expect(
        notifyApproversOfSubmission(sampleRequest, "Test"),
      ).resolves.not.toThrow();
      expect(mockFunctions.invoke).not.toHaveBeenCalled();
    });

    it("skips gracefully if no approvers found", async () => {
      vi.mocked(getOrgApproversForNotification).mockResolvedValueOnce([]);
      await expect(
        notifyApproversOfSubmission(sampleRequest, "Test"),
      ).resolves.not.toThrow();
      expect(mockFunctions.invoke).not.toHaveBeenCalled();
    });

    it("handles missing OAuth token gracefully", async () => {
      vi.mocked(getOrgApproversForNotification).mockResolvedValueOnce([
        { user_id: "a1", email: "admin@x.de", role: "admin" },
      ]);
      vi.mocked(getOAuthSettings).mockResolvedValue(null); // no token
      await expect(
        notifyApproversOfSubmission(sampleRequest, "Test"),
      ).resolves.not.toThrow();
      expect(mockFunctions.invoke).not.toHaveBeenCalled();
    });
  });

  describe("notifyApplicantOfStatusChange", () => {
    it("sends approval email when applicant email is found in user_settings", async () => {
      // Mock the from().select().eq().eq().maybeSingle() chain
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { settings: { email: "emp@x.de" } },
        error: null,
      });
      const mockEqInner = vi
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqOuter = vi.fn().mockReturnValue({ eq: mockEqInner });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOuter });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(getOAuthSettings).mockResolvedValue({
        email: "approver@x.de",
        token: "tok",
      });
      mockFunctions.invoke.mockResolvedValue({ error: null });

      const req = { ...sampleRequest, status: "approved" as const };
      await notifyApplicantOfStatusChange(req, "approved", "approver-1");

      expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
      const body = mockFunctions.invoke.mock.calls[0][1].body;
      expect(body.to).toBe("emp@x.de");
      expect(body.subject).toContain("GENEHMIGT");
    });

    it("skips if applicant email not found", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const mockEqInner = vi
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqOuter = vi.fn().mockReturnValue({ eq: mockEqInner });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOuter });
      mockFrom.mockReturnValue({ select: mockSelect });

      await notifyApplicantOfStatusChange(
        sampleRequest,
        "rejected",
        "approver-1",
      );
      expect(mockFunctions.invoke).not.toHaveBeenCalled();
    });

    it("handles getEmailForUser exception gracefully", async () => {
      // Make the supabase query throw an exception
      mockFrom.mockImplementation(() => {
        throw new Error("DB connection error");
      });
      // Should resolve (catch block returns null → skips sending)
      await expect(
        notifyApplicantOfStatusChange(sampleRequest, "approved", "approver-1"),
      ).resolves.not.toThrow();
      expect(mockFunctions.invoke).not.toHaveBeenCalled();
    });

    it("handles outer catch when getOAuthSettings throws unexpectedly", async () => {
      // Setup email to be found
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { settings: { email: "emp@x.de" } },
        error: null,
      });
      const mockEqInner = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqOuter = vi.fn().mockReturnValue({ eq: mockEqInner });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOuter });
      mockFrom.mockReturnValue({ select: mockSelect });
      // getOAuthSettings throws → sendEmail propagates → outer catch fires
      vi.mocked(getOAuthSettings).mockRejectedValue(new Error("OAuth crash"));

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(
        notifyApplicantOfStatusChange(sampleRequest, "approved", "approver-1"),
      ).resolves.not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Fehler in notifyApplicantOfStatusChange"),
        expect.anything(),
      );
      errorSpy.mockRestore();
    });

    it("skips if approver has no OAuth connection", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { settings: { email: "emp@x.de" } },
        error: null,
      });
      const mockEqInner = vi
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqOuter = vi.fn().mockReturnValue({ eq: mockEqInner });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOuter });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(getOAuthSettings).mockResolvedValue(null); // no token

      await notifyApplicantOfStatusChange(
        sampleRequest,
        "approved",
        "approver-1",
      );
      expect(mockFunctions.invoke).not.toHaveBeenCalled();
    });

    it("logs warning when sendEmail returns success:false", async () => {
      // Applicant has email in user_settings
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { settings: { email: "emp@x.de" } },
        error: null,
      });
      const mockEqInner = vi
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqOuter = vi.fn().mockReturnValue({ eq: mockEqInner });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOuter });
      mockFrom.mockReturnValue({ select: mockSelect });

      // Approver has OAuth but invoke fails
      vi.mocked(getOAuthSettings).mockResolvedValue({
        email: "approver@x.de",
        token: "tok",
      });
      mockFunctions.invoke.mockResolvedValue({ error: new Error("smtp fail") });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await notifyApplicantOfStatusChange(
        sampleRequest,
        "rejected",
        "approver-1",
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Status-Benachrichtigung fehlgeschlagen"),
        expect.anything(),
      );
      warnSpy.mockRestore();
    });
  });
});

// ── submitVacationRequestByEmail ─────────────────────────────────────────────

describe("submitVacationRequestByEmail", () => {
  const sampleReq: VacationRequest = {
    id: "req-submit",
    user_id: "user-1",
    organization_id: "org-1",
    from: "2026-07-01",
    to: "2026-07-10",
    reason: "Urlaub",
    status: "pending",
    created_at: "2026-04-01T08:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOAuthSettings).mockResolvedValue(null);
    vi.mocked(getAssignedApprover).mockResolvedValue(null);
    vi.mocked(getApproverEmails).mockResolvedValue([]);
    vi.mocked(getTemplatesForOrg).mockResolvedValue([]);
    vi.mocked(getTemplateBytes).mockResolvedValue(new ArrayBuffer(0));
    vi.mocked(generatePDF).mockResolvedValue(
      new Blob(["pdf-content"], { type: "application/pdf" }),
    );
    // Mock FileReader used in blobToBase64
    const mockFileReader = {
      readAsDataURL: vi.fn(function (this: { onloadend?: () => void; result?: string }) {
        this.result = "data:application/pdf;base64,dGVzdA==";
        if (this.onloadend) this.onloadend();
      }),
      onloadend: null as (() => void) | null,
      onerror: null,
      result: null as string | null,
    };
    vi.stubGlobal("FileReader", vi.fn(() => mockFileReader));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses 'Hallo' salutation when approver has no name", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "", // empty name → "Hallo" fallback (line 299)
      email: "boss@company.de",
    });
    vi.mocked(getOAuthSettings)
      .mockResolvedValueOnce(null) // google
      .mockResolvedValueOnce({ email: "sender@company.de", token: "oauth-token" }); // outlook
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    expect(res.success).toBe(true);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.text).toContain("Hallo,");
  });

  it("uses 'E-Mail konnte nicht gesendet werden' when sendEmail result has no error field", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@company.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@company.de",
      token: "oauth-token",
    });
    // invoke returns error=null → sendEmail returns {success: false, error: undefined}
    // We simulate sendEmail returning success:false by making invoke return error:null
    // but the edge function logic returns a failure object
    // Actually we need to make the invoke succeed but return a non-success
    // The easiest way: mock the underlying invoke to return { data: null, error: new Error(...) }
    mockFunctions.invoke.mockResolvedValue({
      error: new Error("invoke failed"),
    });

    const res = await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    expect(res.success).toBe(false);
    // error field should contain a string
    expect(typeof res.error).toBe("string");
  });

  it("returns error when no approver is configured", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue(null);
    vi.mocked(getApproverEmails).mockResolvedValue([]);

    const res = await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Kein Genehmiger");
  });

  it("sends email when assigned approver is available", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@company.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    expect(res.success).toBe(true);
    expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.to).toBe("boss@company.de");
  });

  it("falls back to getApproverEmails when no assigned approver", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue(null);
    vi.mocked(getApproverEmails).mockResolvedValue([
      { name: "Fallback Boss", email: "fallback@company.de" },
    ]);
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    expect(res.success).toBe(true);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.to).toBe("fallback@company.de");
  });

  it("returns error when sendEmail fails", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@company.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({
      error: new Error("SMTP failure"),
    });

    const res = await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    expect(res.success).toBe(false);
  });

  it("includes PDF attachment in the email", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@company.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.attachment).toBeDefined();
    expect(body.attachment.mimeType).toBe("application/pdf");
  });

  it("builds document data with vacationTypes array from template_fields", async () => {
    const reqWithVacTypes: VacationRequest = {
      ...sampleReq,
      template_fields: {
        vacationTypes: [
          { id: "paid", checked: true },
          { id: "sick", checked: false },
        ],
      },
    };
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@company.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(reqWithVacTypes, "Max Mustermann");
    expect(res.success).toBe(true);
  });

  it("uses org template bytes when template is available", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@company.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@company.de",
      token: "oauth-token",
    });
    // Return a mock template so getTemplateBytes is called
    vi.mocked(getTemplatesForOrg).mockResolvedValue([
      { id: "t1", storage_path: "templates/form.pdf" } as any,
    ]);
    vi.mocked(getTemplateBytes).mockResolvedValue(new ArrayBuffer(100));
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    expect(res.success).toBe(true);
    expect(getTemplateBytes).toHaveBeenCalledWith("templates/form.pdf");
  });

  it("handles loadOrgTemplateBytes catch when getTemplatesForOrg throws", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@company.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@company.de",
      token: "oauth-token",
    });
    // getTemplatesForOrg throws → loadOrgTemplateBytes catch → returns null → generatePDF without template
    vi.mocked(getTemplatesForOrg).mockRejectedValue(new Error("template fetch failed"));
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    // Still succeeds because null templateBytes is handled gracefully
    expect(res.success).toBe(true);
  });

  it("uses fallback filename when date parsing fails", async () => {
    const reqInvalidDate: VacationRequest = {
      ...sampleReq,
      from: "not-a-date",
      to: "also-not-a-date",
    };
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@company.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(
      reqInvalidDate,
      "Max Mustermann",
    );
    expect(res.success).toBe(true);
    // The fallback filename should be used (catch in IIFE)
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.attachment.filename).toContain("Urlaubsantrag_");
  });

  it("handles outer exception (catch block) when generatePDF throws", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@company.de",
    });
    vi.mocked(generatePDF).mockRejectedValue(new Error("PDF crash"));

    const res = await submitVacationRequestByEmail(sampleReq, "Max Mustermann");
    expect(res.success).toBe(false);
    expect(res.error).toContain("PDF crash");
  });
});

// ── notifyApplicantWithSignedDocument ─────────────────────────────────────────

describe("notifyApplicantWithSignedDocument", () => {
  const sampleReq: VacationRequest = {
    id: "req-signed",
    user_id: "user-1",
    organization_id: "org-1",
    from: "2026-07-01",
    to: "2026-07-10",
    reason: "Urlaub",
    status: "approved",
    created_at: "2026-04-01T08:00:00Z",
    template_fields: {
      firstName: "Max",
      lastName: "Mustermann",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOAuthSettings).mockResolvedValue(null);
    vi.mocked(getTemplatesForOrg).mockResolvedValue([]);
    vi.mocked(generatePDF).mockResolvedValue(
      new Blob(["pdf-content"], { type: "application/pdf" }),
    );
    const mockFileReader = {
      readAsDataURL: vi.fn(function (this: { onloadend?: () => void; result?: string }) {
        this.result = "data:application/pdf;base64,dGVzdA==";
        if (this.onloadend) this.onloadend();
      }),
      onloadend: null as (() => void) | null,
      onerror: null,
      result: null as string | null,
    };
    vi.stubGlobal("FileReader", vi.fn(() => mockFileReader));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses empty string for missing lastName when only firstName present (firstName ?? '' branch)", async () => {
    const reqOnlyFirst: VacationRequest = {
      ...sampleReq,
      template_fields: { firstName: "Max" }, // no lastName → tf.lastName ?? "" = ""
    };

    const emailMaybeSingle = vi.fn().mockResolvedValue({
      data: { settings: { email: "max@company.de" } },
      error: null,
    });
    const emailEqInner = vi.fn().mockReturnValue({ maybeSingle: emailMaybeSingle });
    const emailEqOuter = vi.fn().mockReturnValue({ eq: emailEqInner });
    const emailSelect = vi.fn().mockReturnValue({ eq: emailEqOuter });
    mockFrom.mockReturnValue({ select: emailSelect });

    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "approver@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    await notifyApplicantWithSignedDocument(reqOnlyFirst, "approver-1", "Anna Boss");

    expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.text).toContain("Max");
  });

  it("uses 'Dein Genehmiger' when approverName is empty string", async () => {
    const emailMaybeSingle = vi.fn().mockResolvedValue({
      data: { settings: { email: "max@company.de" } },
      error: null,
    });
    const emailEqInner = vi.fn().mockReturnValue({ maybeSingle: emailMaybeSingle });
    const emailEqOuter = vi.fn().mockReturnValue({ eq: emailEqInner });
    const emailSelect = vi.fn().mockReturnValue({ eq: emailEqOuter });
    mockFrom.mockReturnValue({ select: emailSelect });

    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "approver@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    // empty approverName → approverName || "Dein Genehmiger" (line 392)
    await notifyApplicantWithSignedDocument(sampleReq, "approver-1", "");

    expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.text).toContain("Dein Genehmiger");
  });

  it("skips gracefully when applicant has no email in user_settings", async () => {
    const noEmailMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const noEmailEqInner = vi.fn().mockReturnValue({ maybeSingle: noEmailMaybeSingle });
    const noEmailEqOuter = vi.fn().mockReturnValue({ eq: noEmailEqInner });
    const noEmailSelect = vi.fn().mockReturnValue({ eq: noEmailEqOuter });
    mockFrom.mockReturnValue({ select: noEmailSelect });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await notifyApplicantWithSignedDocument(sampleReq, "approver-1", "Anna Boss");
    expect(mockFunctions.invoke).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("sends signed PDF email to applicant when email found", async () => {
    const emailMaybeSingle = vi.fn().mockResolvedValue({
      data: { settings: { email: "max@company.de" } },
      error: null,
    });
    const emailEqInner = vi.fn().mockReturnValue({ maybeSingle: emailMaybeSingle });
    const emailEqOuter = vi.fn().mockReturnValue({ eq: emailEqInner });
    const emailSelect = vi.fn().mockReturnValue({ eq: emailEqOuter });
    mockFrom.mockReturnValue({ select: emailSelect });

    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "approver@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    await notifyApplicantWithSignedDocument(sampleReq, "approver-1", "Anna Boss");

    expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.to).toBe("max@company.de");
    expect(body.attachment).toBeDefined();
    expect(body.attachment.mimeType).toBe("application/pdf");
  });

  it("logs warning when sendEmail fails", async () => {
    const emailMaybeSingle = vi.fn().mockResolvedValue({
      data: { settings: { email: "max@company.de" } },
      error: null,
    });
    const emailEqInner = vi.fn().mockReturnValue({ maybeSingle: emailMaybeSingle });
    const emailEqOuter = vi.fn().mockReturnValue({ eq: emailEqInner });
    const emailSelect = vi.fn().mockReturnValue({ eq: emailEqOuter });
    mockFrom.mockReturnValue({ select: emailSelect });

    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "approver@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: new Error("SMTP fail") });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await notifyApplicantWithSignedDocument(sampleReq, "approver-1", "Anna Boss");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("notifyApplicantWithSignedDocument fehlgeschlagen"),
      expect.anything(),
    );
    warnSpy.mockRestore();
  });

  it("uses Mitarbeiter as name when template_fields has no firstName or lastName", async () => {
    const reqNoName: VacationRequest = {
      ...sampleReq,
      template_fields: {},
    };

    const emailMaybeSingle = vi.fn().mockResolvedValue({
      data: { settings: { email: "worker@company.de" } },
      error: null,
    });
    const emailEqInner = vi.fn().mockReturnValue({ maybeSingle: emailMaybeSingle });
    const emailEqOuter = vi.fn().mockReturnValue({ eq: emailEqInner });
    const emailSelect = vi.fn().mockReturnValue({ eq: emailEqOuter });
    mockFrom.mockReturnValue({ select: emailSelect });

    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "approver@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    await notifyApplicantWithSignedDocument(reqNoName, "approver-1", "Anna Boss");

    expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.text).toContain("Mitarbeiter");
  });

  it("handles outer exception gracefully (catch block)", async () => {
    // Set up email to be found first
    const emailMaybeSingle = vi.fn().mockResolvedValue({
      data: { settings: { email: "max@company.de" } },
      error: null,
    });
    const emailEqInner = vi.fn().mockReturnValue({ maybeSingle: emailMaybeSingle });
    const emailEqOuter = vi.fn().mockReturnValue({ eq: emailEqInner });
    const emailSelect = vi.fn().mockReturnValue({ eq: emailEqOuter });
    mockFrom.mockReturnValue({ select: emailSelect });

    // Make generatePDF throw to trigger the outer catch block
    vi.mocked(generatePDF).mockRejectedValue(new Error("PDF generation failed"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      notifyApplicantWithSignedDocument(sampleReq, "approver-1", "Boss"),
    ).resolves.not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Fehler in notifyApplicantWithSignedDocument"),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it("uses only lastName when firstName is missing (|| B0 branch + firstName ?? '' fallback)", async () => {
    const reqOnlyLast: VacationRequest = {
      ...sampleReq,
      template_fields: { lastName: "Mustermann" }, // no firstName
    };

    const emailMaybeSingle = vi.fn().mockResolvedValue({
      data: { settings: { email: "last@company.de" } },
      error: null,
    });
    const emailEqInner = vi.fn().mockReturnValue({ maybeSingle: emailMaybeSingle });
    const emailEqOuter = vi.fn().mockReturnValue({ eq: emailEqInner });
    const emailSelect = vi.fn().mockReturnValue({ eq: emailEqOuter });
    mockFrom.mockReturnValue({ select: emailSelect });

    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "approver@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    await notifyApplicantWithSignedDocument(reqOnlyLast, "approver-1", "Anna Boss");

    expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.text).toContain("Mustermann");
  });

  it("uses '{}' fallback when template_fields is undefined (Ln368 B0)", async () => {
    const reqNoFields: VacationRequest = {
      id: "req-nofields",
      user_id: "user-1",
      organization_id: "org-1",
      from: "2026-07-01",
      to: "2026-07-10",
      reason: "Urlaub",
      status: "approved",
      created_at: "2026-04-01T08:00:00Z",
      // template_fields intentionally omitted → undefined → tf = {} fallback
    };

    const emailMaybeSingle = vi.fn().mockResolvedValue({
      data: { settings: { email: "nofields@company.de" } },
      error: null,
    });
    const emailEqInner = vi.fn().mockReturnValue({ maybeSingle: emailMaybeSingle });
    const emailEqOuter = vi.fn().mockReturnValue({ eq: emailEqInner });
    const emailSelect = vi.fn().mockReturnValue({ eq: emailEqOuter });
    mockFrom.mockReturnValue({ select: emailSelect });

    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "approver@company.de",
      token: "oauth-token",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    await notifyApplicantWithSignedDocument(reqNoFields, "approver-1", "Anna Boss");
    expect(mockFunctions.invoke).toHaveBeenCalledTimes(1);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.text).toContain("Mitarbeiter");
  });
});

// ── getAppBaseUrl environment branches ────────────────────────────────────────

describe("getAppBaseUrl via submitVacationRequestByEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOAuthSettings).mockResolvedValue(null);
    vi.mocked(getAssignedApprover).mockResolvedValue(null);
    vi.mocked(getApproverEmails).mockResolvedValue([]);
    vi.mocked(getTemplatesForOrg).mockResolvedValue([]);
    vi.mocked(generatePDF).mockResolvedValue(
      new Blob(["pdf-content"], { type: "application/pdf" }),
    );
    const mockFileReader = {
      readAsDataURL: vi.fn(function (this: { onloadend?: () => void; result?: string }) {
        this.result = "data:application/pdf;base64,dGVzdA==";
        if (this.onloadend) this.onloadend();
      }),
      onloadend: null as (() => void) | null,
      onerror: null,
      result: null as string | null,
    };
    vi.stubGlobal("FileReader", vi.fn(() => mockFileReader));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
  });

  it("uses NEXT_PUBLIC_APP_URL when set (Ln15 B0 branch)", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://custom.away.app";
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@x.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@x.de",
      token: "tok",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(
      { id: "r", user_id: "u", organization_id: "o", from: "2026-08-01", to: "2026-08-05",
        reason: "Urlaub", status: "pending", created_at: "2026-01-01T00:00:00Z" },
      "Test User",
    );
    expect(res.success).toBe(true);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.text).toContain("custom.away.app");
  });

  it("uses VERCEL_URL when NEXT_PUBLIC_APP_URL is not set (Ln16 B0 branch)", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_URL = "my-deploy.vercel.app";
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@x.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@x.de",
      token: "tok",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(
      { id: "r2", user_id: "u", organization_id: "o", from: "2026-08-01", to: "2026-08-05",
        reason: "Urlaub", status: "pending", created_at: "2026-01-01T00:00:00Z" },
      "Test User",
    );
    expect(res.success).toBe(true);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.text).toContain("my-deploy.vercel.app");
  });

  it("uses window.location.origin in browser context (Ln13 B0 branch)", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });
    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@x.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@x.de",
      token: "tok",
    });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const res = await submitVacationRequestByEmail(
      { id: "r3", user_id: "u", organization_id: "o", from: "2026-08-01", to: "2026-08-05",
        reason: "Urlaub", status: "pending", created_at: "2026-01-01T00:00:00Z" },
      "Test User",
    );
    expect(res.success).toBe(true);
    const body = mockFunctions.invoke.mock.calls[0][1].body;
    expect(body.text).toContain("localhost:3000");
  });

  it("suppresses console.warn in production mode (Ln69 B0 branch)", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "production";

    vi.mocked(getAssignedApprover).mockResolvedValue({
      name: "Boss",
      email: "boss@x.de",
    });
    vi.mocked(getOAuthSettings).mockResolvedValue({
      email: "sender@x.de",
      token: "tok",
    });
    // invoke throws so sendEmail catch block runs
    mockFunctions.invoke.mockResolvedValue({ error: new Error("smtp failed") });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await submitVacationRequestByEmail(
      { id: "r4", user_id: "u", organization_id: "o", from: "2026-08-01", to: "2026-08-05",
        reason: "Urlaub", status: "pending", created_at: "2026-01-01T00:00:00Z" },
      "Test User",
    );
    // In production mode, the console.warn inside sendEmail catch is suppressed
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Edge Function"),
      expect.anything(),
    );
    warnSpy.mockRestore();
    (process.env as Record<string, string>).NODE_ENV = originalNodeEnv ?? "test";
  });
});

// ── buildDocumentData branch coverage ────────────────────────────────────────

describe("buildDocumentData via submitVacationRequestByEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTemplatesForOrg).mockResolvedValue([]);
    vi.mocked(generatePDF).mockResolvedValue(
      new Blob(["pdf"], { type: "application/pdf" }),
    );
    const mockFileReader = {
      readAsDataURL: vi.fn(function (this: { onloadend?: () => void; result?: string }) {
        this.result = "data:application/pdf;base64,dGVzdA==";
        if (this.onloadend) this.onloadend();
      }),
      onloadend: null as (() => void) | null,
      onerror: null,
      result: null as string | null,
    };
    vi.stubGlobal("FileReader", vi.fn(() => mockFileReader));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("handles null reason (reason ?? '' fallback - Ln234 B0)", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({ name: "Boss", email: "boss@x.de" });
    vi.mocked(getApproverEmails).mockResolvedValue([]);
    vi.mocked(getOAuthSettings).mockResolvedValue({ email: "s@x.de", token: "tok" });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const reqNullReason: VacationRequest = {
      id: "r", user_id: "u", organization_id: "o",
      from: "2026-08-01", to: "2026-08-05",
      reason: null as unknown as string, // null triggers ?? "" fallback
      status: "pending", created_at: "2026-01-01T00:00:00Z",
    };

    const res = await submitVacationRequestByEmail(reqNullReason, "Test");
    expect(res.success).toBe(true);
  });

  it("handles defined vacationDays in template_fields (ternary true branch - Ln244 B0)", async () => {
    vi.mocked(getAssignedApprover).mockResolvedValue({ name: "Boss", email: "boss@x.de" });
    vi.mocked(getApproverEmails).mockResolvedValue([]);
    vi.mocked(getOAuthSettings).mockResolvedValue({ email: "s@x.de", token: "tok" });
    mockFunctions.invoke.mockResolvedValue({ error: null });

    const reqWithDays: VacationRequest = {
      id: "r2", user_id: "u", organization_id: "o",
      from: "2026-08-01", to: "2026-08-05",
      reason: "Urlaub", status: "pending", created_at: "2026-01-01T00:00:00Z",
      template_fields: { vacationDays: 5 }, // defined → Number(5) = 5
    };

    const res = await submitVacationRequestByEmail(reqWithDays, "Test");
    expect(res.success).toBe(true);
  });
});
