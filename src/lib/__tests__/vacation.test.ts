import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createVacationRequest,
  getVacationRequestsForOrg,
  getMyVacationRequests,
  updateVacationStatus,
} from "../vacation";

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

describe("vacation lib", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain - each method returns mockSupabase for chaining
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
  });

  describe("createVacationRequest", () => {
    it("creates a request and returns data", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "req-1" },
        error: null,
      });
      const res = await createVacationRequest({
        userId: "user-1",
        organizationId: "org-1",
        from: "2024-05-01",
        to: "2024-05-05",
        reason: "Urlaub",
        template_fields: { guest: "yes" },
      });
      expect(res.id).toBe("req-1");
      expect(mockSupabase.from).toHaveBeenCalledWith("vacation_requests");
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          user_id: "user-1",
          organization_id: "org-1",
          from: "2024-05-01",
          to: "2024-05-05",
          reason: "Urlaub",
          status: "pending",
          template_fields: { guest: "yes" },
        },
      ]);
    });

    it("uses empty object when no template_fields", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "req-2" },
        error: null,
      });
      await createVacationRequest({
        userId: "u2",
        organizationId: "o1",
        from: "2026-06-01",
        to: "2026-06-03",
        reason: "x",
      });
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({ template_fields: {} }),
      ]);
    });

    it("throws on DB error", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "insert error" },
      });
      await expect(
        createVacationRequest({
          userId: "u",
          organizationId: "o",
          from: "2026-06-01",
          to: "2026-06-05",
          reason: "x",
        }),
      ).rejects.toEqual({ message: "insert error" });
    });
  });

  describe("getVacationRequestsForOrg", () => {
    it("returns list of requests", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [{ id: "1" }],
        error: null,
      });
      const res = await getVacationRequestsForOrg("org-1");
      expect(res).toHaveLength(1);
      expect(mockSupabase.eq).toHaveBeenCalledWith("organization_id", "org-1");
    });

    it("returns empty array when data is null", async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: null });
      const res = await getVacationRequestsForOrg("org-1");
      expect(res).toEqual([]);
    });

    it("throws on error", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: "fail" },
      });
      await expect(getVacationRequestsForOrg("org-1")).rejects.toEqual({
        message: "fail",
      });
    });
  });

  describe("getMyVacationRequests", () => {
    it("returns empty array when data is null (no error)", async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: null });
      const res = await getMyVacationRequests("user-1");
      expect(res).toEqual([]);
    });

    it("returns requests for a user", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [{ id: "r1", user_id: "u1" }],
        error: null,
      });
      const res = await getMyVacationRequests("u1");
      expect(res[0].user_id).toBe("u1");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "u1");
    });

    it("throws on error", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: "err" },
      });
      await expect(getMyVacationRequests("u1")).rejects.toEqual({
        message: "err",
      });
    });
  });

  describe("updateVacationStatus", () => {
    it("updates status and returns updated request", async () => {
      const updated = { id: "req-1", status: "approved" };
      mockSupabase.single.mockResolvedValueOnce({ data: updated, error: null });
      const res = await updateVacationStatus("req-1", "approved");
      expect(res.status).toBe("approved");
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: "approved" });
    });

    it("throws on error", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "upd err" },
      });
      await expect(updateVacationStatus("req-1", "rejected")).rejects.toEqual({
        message: "upd err",
      });
    });
  });
});
