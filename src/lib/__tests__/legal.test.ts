import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveLegalConsent,
  checkUserConsent,
  getOrganizationConsents,
} from "../legal";

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockIn = vi.fn();
const mockIs = vi.fn();

const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

// Chain helpers
function makeChain(result: unknown) {
  const chain = {
    insert: vi.fn().mockResolvedValue(result),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  return chain;
}

describe("legal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveLegalConsent", () => {
    it("inserts consent records without error", async () => {
      const chain = makeChain({ error: null });
      mockFrom.mockReturnValue(chain);

      await expect(
        saveLegalConsent("user-1", ["agb", "privacy"]),
      ).resolves.not.toThrow();
      expect(mockFrom).toHaveBeenCalledWith("legal_consents");
    });

    it("inserts with custom version", async () => {
      const chain = makeChain({ error: null });
      mockFrom.mockReturnValue(chain);

      await expect(
        saveLegalConsent("user-1", ["dsgvo"], "2.0"),
      ).resolves.not.toThrow();
    });

    it("throws if insert returns error", async () => {
      const chain = makeChain({ error: { message: "DB error" } });
      mockFrom.mockReturnValue(chain);

      await expect(saveLegalConsent("user-1", ["agb"])).rejects.toEqual({
        message: "DB error",
      });
    });
  });

  describe("checkUserConsent", () => {
    it("returns empty array on error", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: "fail" } }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await checkUserConsent("user-1");
      expect(result).toEqual([]);
    });

    it("returns data array on success", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi
          .fn()
          .mockResolvedValue({ data: [{ consent_type: "agb" }], error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await checkUserConsent("user-1");
      expect(result).toEqual([{ consent_type: "agb" }]);
    });
  });

  describe("getOrganizationConsents", () => {
    it("returns users and consents on success", async () => {
      const usersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ user_id: "u1", role: "admin" }],
          error: null,
        }),
      };
      const consentsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ user_id: "u1", consent_type: "agb" }],
          error: null,
        }),
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return usersChain;
        return consentsChain;
      });

      const result = await getOrganizationConsents("org-1");
      expect(result.users).toHaveLength(1);
      expect(result.consents).toHaveLength(1);
    });

    it("throws on users query error", async () => {
      const usersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: "fail" } }),
      };
      mockFrom.mockReturnValue(usersChain);

      await expect(getOrganizationConsents("org-1")).rejects.toEqual({
        message: "fail",
      });
    });

    it("throws on consents query error", async () => {
      const usersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ user_id: "u1", role: "admin" }],
          error: null,
        }),
      };
      const consentsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "consents fail" },
        }),
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return usersChain;
        return consentsChain;
      });

      await expect(getOrganizationConsents("org-1")).rejects.toEqual({
        message: "consents fail",
      });
    });
  });
});
