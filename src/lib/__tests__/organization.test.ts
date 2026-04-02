import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrganizationsForUser,
  getCurrentOrganization,
  createOrganization,
  joinOrganization,
  updateOrganizationName,
} from "../organization";

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

describe("organization lib", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain - all methods return mockSupabase for chaining
    Object.values(mockSupabase).forEach((fn) => {
      if (typeof fn === "function" && fn !== mockSupabase.rpc) {
        (fn as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
      }
    });
  });

  describe("getOrganizationsForUser", () => {
    it("returns empty array when data is null", async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: null });
      const res = await getOrganizationsForUser("user-1");
      expect(res).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith("user_roles");
      expect(mockSupabase.order).toHaveBeenCalledWith("organization_id", {
        ascending: true,
      });
    });

    it("maps organization objects", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [{ organizations: { id: "org-1", name: "Acme" } }],
        error: null,
      });
      const res = await getOrganizationsForUser("user-1");
      expect(res).toEqual([{ id: "org-1", name: "Acme" }]);
    });

    it("flattens array organizations field", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          {
            organizations: [
              { id: "o1", name: "A" },
              { id: "o2", name: "B" },
            ],
          },
        ],
        error: null,
      });
      const res = await getOrganizationsForUser("user-1");
      expect(res).toHaveLength(2);
    });

    it("throws on error", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: "fail" },
      });
      await expect(getOrganizationsForUser("u")).rejects.toEqual({
        message: "fail",
      });
    });
  });

  describe("getCurrentOrganization", () => {
    it("returns org data", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "org-1", name: "Org 1" },
        error: null,
      });
      const res = await getCurrentOrganization("org-1");
      expect(res.name).toBe("Org 1");
    });

    it("throws on error", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "not found" },
      });
      await expect(getCurrentOrganization("x")).rejects.toEqual({
        message: "not found",
      });
    });
  });

  describe("createOrganization", () => {
    it("calls RPC and returns new org", async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: "new-org-id",
        error: null,
      });
      const res = await createOrganization("user-1", "New Org");
      expect(res.id).toBe("new-org-id");
      expect(res.name).toBe("New Org");
      expect(mockSupabase.rpc).toHaveBeenCalledWith("create_new_organization", {
        org_name: "New Org",
        creator_id: "user-1",
      });
    });

    it("throws on RPC error", async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: "rpc error" },
      });
      await expect(createOrganization("u", "X")).rejects.toEqual({
        message: "rpc error",
      });
    });
  });

  describe("joinOrganization", () => {
    it("returns alreadyMember true if already in org", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: "existing" },
        error: null,
      });
      const res = await joinOrganization("user-1", "org-1");
      expect(res).toEqual({ success: true, alreadyMember: true });
    });

    it("inserts role when not already a member", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null });
      const res = await joinOrganization("user-1", "org-1");
      expect(res).toEqual({ success: true, alreadyMember: false });
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          user_id: "user-1",
          organization_id: "org-1",
          role: "employee",
        },
      ]);
    });

    it("throws on check error", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "check fail" },
      });
      await expect(joinOrganization("u", "o")).rejects.toEqual({
        message: "check fail",
      });
    });

    it("throws on insert error", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        error: { message: "join fail" },
      });
      await expect(joinOrganization("u", "o")).rejects.toEqual({
        message: "join fail",
      });
    });
  });

  describe("updateOrganizationName", () => {
    it("returns success on update", async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });
      const res = await updateOrganizationName("org-1", "New Name");
      expect(res).toEqual({ success: true });
      expect(mockSupabase.update).toHaveBeenCalledWith({ name: "New Name" });
    });

    it("throws on update error", async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: { message: "upd fail" } });
      await expect(updateOrganizationName("org-1", "x")).rejects.toEqual({
        message: "upd fail",
      });
    });
  });
});
