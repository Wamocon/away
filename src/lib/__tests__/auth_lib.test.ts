import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserProfile, signInWithEmail, signOut } from "../auth";

const mockAuth = {
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
};

const mockSupabase = {
  auth: mockAuth,
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

describe("auth lib", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserProfile", () => {
    it("returns user data on success", async () => {
      const user = { id: "u1", email: "test@example.com" };
      mockAuth.getUser.mockResolvedValueOnce({ data: { user }, error: null });
      const result = await getUserProfile();
      expect(result).toEqual(user);
    });

    it("throws on error", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Not authenticated"),
      });
      await expect(getUserProfile()).rejects.toThrow("Not authenticated");
    });
  });

  describe("signInWithEmail", () => {
    it("returns session data on success", async () => {
      const session = { user: { id: "u1" } };
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: session,
        error: null,
      });
      const result = await signInWithEmail("test@example.com", "password");
      expect(result).toEqual(session);
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password",
      });
    });

    it("throws on authentication failure", async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: new Error("Invalid credentials"),
      });
      await expect(signInWithEmail("x@x.com", "wrong")).rejects.toThrow(
        "Invalid credentials",
      );
    });
  });

  describe("signOut", () => {
    it("signs out successfully", async () => {
      mockAuth.signOut.mockResolvedValueOnce({ error: null });
      await expect(signOut()).resolves.not.toThrow();
    });

    it("throws on signOut error", async () => {
      mockAuth.signOut.mockResolvedValueOnce({
        error: new Error("Sign out failed"),
      });
      await expect(signOut()).rejects.toThrow("Sign out failed");
    });
  });
});
