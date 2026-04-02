import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveOAuthSettings,
  getOAuthSettings,
  importCalendarEvents,
  getSyncedEvents,
  getMicrosoftOAuthUrl,
  getGoogleOAuthUrl,
  fetchExternalEvents,
  type CalendarEventInput,
} from "../calendarSync";

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  upsert: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

describe("calendarSync lib", () => {
  const VALID_ID = "00000000-0000-4000-a000-000000000000";

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply chain defaults after clearAllMocks
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
    mockSupabase.maybeSingle.mockReturnValue(mockSupabase);
  });

  // ── saveOAuthSettings ──────────────────────────────────────
  describe("saveOAuthSettings", () => {
    it("throws if userId is too short", async () => {
      await expect(
        saveOAuthSettings("", VALID_ID, "outlook", "test@test.com", "token"),
      ).rejects.toThrow("Benutzer-ID fehlt oder ist ungültig.");
    });

    it("throws if orgId is too short", async () => {
      await expect(
        saveOAuthSettings(VALID_ID, "short", "google", "a@b.com", "tok"),
      ).rejects.toThrow("Organisations-ID fehlt oder ist ungültig.");
    });

    it("merges with existing settings and calls upsert", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { settings: { some_key: "existing_value" } },
        error: null,
      });
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });

      await saveOAuthSettings(
        VALID_ID,
        VALID_ID,
        "outlook",
        "test@test.com",
        "tok123",
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("user_settings");
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            some_key: "existing_value",
            outlook_email: "test@test.com",
            outlook_token: "tok123",
          }),
        }),
        expect.any(Object),
      );
    });

    it("calls upsert with no existing settings", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });

      await saveOAuthSettings(
        VALID_ID,
        VALID_ID,
        "google",
        "g@g.com",
        "goog-tok",
      );

      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            google_email: "g@g.com",
            google_token: "goog-tok",
          }),
        }),
        expect.any(Object),
      );
    });

    it("throws on upsert error", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockSupabase.upsert.mockResolvedValueOnce({
        error: { message: "upsert fail" },
      });

      await expect(
        saveOAuthSettings(VALID_ID, VALID_ID, "outlook", "a@b.com", "tok"),
      ).rejects.toEqual({ message: "upsert fail" });
    });
  });

  // ── getOAuthSettings ──────────────────────────────────────
  describe("getOAuthSettings", () => {
    it("returns null if userId is too short", async () => {
      expect(await getOAuthSettings("", VALID_ID, "google")).toBeNull();
    });

    it("returns null if orgId is too short", async () => {
      expect(await getOAuthSettings(VALID_ID, "", "outlook")).toBeNull();
    });

    it("returns null if no data found", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      expect(await getOAuthSettings(VALID_ID, VALID_ID, "google")).toBeNull();
    });

    it("returns null if no token for provider", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { settings: { outlook_email: "a@b.com" } }, // no token for google
        error: null,
      });
      expect(await getOAuthSettings(VALID_ID, VALID_ID, "google")).toBeNull();
    });

    it("returns email and token when found", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { settings: { google_email: "g@g.com", google_token: "tok123" } },
        error: null,
      });
      const result = await getOAuthSettings(VALID_ID, VALID_ID, "google");
      expect(result).toEqual({ email: "g@g.com", token: "tok123" });
    });
  });

  // ── importCalendarEvents ──────────────────────────────────
  describe("importCalendarEvents", () => {
    it("upserts calendar events", async () => {
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });
      const events: CalendarEventInput[] = [
        {
          userId: "u1",
          orgId: "o1",
          provider: "outlook",
          externalId: "e1",
          title: "Meeting",
          startDate: "2025-06-01",
          endDate: "2025-06-01",
        },
      ];
      await importCalendarEvents(events);
      expect(mockSupabase.from).toHaveBeenCalledWith("calendar_events");
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it("throws on upsert error", async () => {
      mockSupabase.upsert.mockResolvedValueOnce({ error: { message: "err" } });
      await expect(importCalendarEvents([])).rejects.toEqual({
        message: "err",
      });
    });
  });

  // ── getSyncedEvents ───────────────────────────────────────
  describe("getSyncedEvents", () => {
    it("returns synced events", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [{ id: 1 }],
        error: null,
      });
      const res = await getSyncedEvents("org-1");
      expect(res).toEqual([{ id: 1 }]);
    });

    it("returns empty array when data is null", async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: null });
      expect(await getSyncedEvents("org-1")).toEqual([]);
    });

    it("throws on error", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: "db err" },
      });
      await expect(getSyncedEvents("org-1")).rejects.toEqual({
        message: "db err",
      });
    });
  });

  // ── getMicrosoftOAuthUrl / getGoogleOAuthUrl ──────────────
  describe("getMicrosoftOAuthUrl", () => {
    it("returns a URL containing the client_id", () => {
      const url = getMicrosoftOAuthUrl(
        "my-client-id",
        "https://myapp.com/callback",
      );
      expect(url).toContain("client_id=my-client-id");
      expect(url).toContain("login.microsoftonline.com");
    });
  });

  describe("getGoogleOAuthUrl", () => {
    it("returns a URL containing the client_id", () => {
      const url = getGoogleOAuthUrl("google-client", "https://myapp.com/cb");
      expect(url).toContain("client_id=google-client");
      expect(url).toContain("accounts.google.com");
    });
  });

  // ── fetchExternalEvents ───────────────────────────────────
  describe("fetchExternalEvents", () => {
    it("throws for short/empty token", async () => {
      await expect(fetchExternalEvents("outlook", "")).rejects.toThrow(
        "Ungültiger Token",
      );
      await expect(fetchExternalEvents("google", "short")).rejects.toThrow(
        "Ungültiger Token",
      );
    });

    it("throws 401 for outlook on expired token", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue({
            status: 401,
            ok: false,
            text: async () => "Unauthorized",
          }),
      );
      await expect(
        fetchExternalEvents("outlook", "a".repeat(20)),
      ).rejects.toThrow("Microsoft-Token abgelaufen");
      vi.unstubAllGlobals();
    });

    it("throws generic error for non-ok outlook response", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue({
            status: 500,
            ok: false,
            text: async () => "Server Error",
          }),
      );
      await expect(
        fetchExternalEvents("outlook", "a".repeat(20)),
      ).rejects.toThrow("Microsoft Graph Fehler (500)");
      vi.unstubAllGlobals();
    });

    it("returns mapped outlook events on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          ok: true,
          json: async () => ({
            value: [
              {
                id: "ev1",
                subject: "All Hands",
                start: { dateTime: "2025-06-01T10:00:00" },
                end: { dateTime: "2025-06-01T11:00:00" },
                isAllDay: false,
              },
            ],
          }),
        }),
      );
      const events = await fetchExternalEvents("outlook", "a".repeat(20));
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("All Hands");
      vi.unstubAllGlobals();
    });

    it("uses fallback title when outlook subject is missing", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          ok: true,
          json: async () => ({
            value: [
              {
                id: "ev1",
                start: { dateTime: "2025-06-01T10:00:00" },
                end: { dateTime: "2025-06-01T11:00:00" },
              },
            ],
          }),
        }),
      );
      const events = await fetchExternalEvents("outlook", "a".repeat(20));
      expect(events[0].title).toBe("(Kein Titel)");
      vi.unstubAllGlobals();
    });

    it("throws 401 for google on expired token", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue({
            status: 401,
            ok: false,
            text: async () => "Unauthorized",
          }),
      );
      await expect(
        fetchExternalEvents("google", "a".repeat(20)),
      ).rejects.toThrow("Google-Token abgelaufen");
      vi.unstubAllGlobals();
    });

    it("throws generic error for non-ok google response", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue({
            status: 403,
            ok: false,
            text: async () => "Forbidden",
          }),
      );
      await expect(
        fetchExternalEvents("google", "a".repeat(20)),
      ).rejects.toThrow("Google Calendar Fehler (403)");
      vi.unstubAllGlobals();
    });

    it("returns mapped google events", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          ok: true,
          json: async () => ({
            items: [
              {
                id: "g1",
                summary: "Google Meet",
                start: { dateTime: "2025-06-02T09:00:00" },
                end: { dateTime: "2025-06-02T10:00:00" },
              },
            ],
          }),
        }),
      );
      const events = await fetchExternalEvents("google", "a".repeat(20));
      expect(events[0].title).toBe("Google Meet");
      expect(events[0].allDay).toBe(false);
      vi.unstubAllGlobals();
    });

    it("sets allDay=true for google events with date-only start", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          ok: true,
          json: async () => ({
            items: [
              {
                id: "g2",
                summary: "Holiday",
                start: { date: "2025-12-25" },
                end: { date: "2025-12-26" },
              },
            ],
          }),
        }),
      );
      const events = await fetchExternalEvents("google", "a".repeat(20));
      expect(events[0].allDay).toBe(true);
      expect(events[0].start).toBe("2025-12-25");
      vi.unstubAllGlobals();
    });
  });
});
