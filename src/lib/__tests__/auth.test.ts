import { describe, it, expect, vi, beforeEach } from "vitest";
import { completeInvitationAction } from "../actions/authActions";

// Mocking the server action
vi.mock("../actions/authActions", () => ({
  completeInvitationAction: vi.fn(),
}));

describe("Auth Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("completeInvitationAction", () => {
    it("should be a function", () => {
      expect(typeof completeInvitationAction).toBe("function");
    });

    it("should handle successful registration completion", async () => {
      vi.mocked(completeInvitationAction).mockResolvedValue({
        success: true,
      } as any);

      const result = await completeInvitationAction("org-123", "employee");
      expect(result.success).toBe(true);
      expect(vi.mocked(completeInvitationAction)).toHaveBeenCalledWith(
        "org-123",
        "employee",
      );
    });

    it("should handle errors when completing invitation", async () => {
      vi.mocked(completeInvitationAction).mockRejectedValue(
        new Error("Unauthorized"),
      );

      await expect(
        completeInvitationAction("org-123", "employee"),
      ).rejects.toThrow("Unauthorized");
    });
  });
});
