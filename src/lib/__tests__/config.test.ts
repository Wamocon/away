import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSchema } from "../supabase/config";

describe("Supabase Config - getSchema", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear relevant env vars for a clean state in each test
    delete process.env.NEXT_PUBLIC_DB_SCHEMA;
    delete process.env.NEXT_PUBLIC_SCHEMA;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  });

  it("should prioritize NEXT_PUBLIC_DB_SCHEMA (user explicit)", () => {
    process.env.NEXT_PUBLIC_DB_SCHEMA = "custom-db-schema";
    process.env.NEXT_PUBLIC_SCHEMA = "ignored-schema";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";

    expect(getSchema()).toBe("custom-db-schema");
  });

  it("should fallback to NEXT_PUBLIC_SCHEMA if DB_SCHEMA is missing", () => {
    process.env.NEXT_PUBLIC_SCHEMA = "local-schema";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";

    expect(getSchema()).toBe("local-schema");
  });

  it("should use automatic detection for production if vars are missing", () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";

    expect(getSchema()).toBe("away-prod");
  });

  it("should use automatic detection for preview if vars are missing", () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";

    expect(getSchema()).toBe("away-test");
  });

  it("should default to away-dev if no env vars are set", () => {
    expect(getSchema()).toBe("away-dev");
  });
});
