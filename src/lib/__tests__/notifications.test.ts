import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  notifyApproversOfSubmission,
  notifyApplicantOfStatusChange,
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
}));

import { getOAuthSettings } from "@/lib/calendarSync";
import { getOrgApproversForNotification } from "@/lib/actions/adminActions";

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
