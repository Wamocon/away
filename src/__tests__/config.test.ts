import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Next.js Configuration", () => {
  it("should have Content-Security-Policy with frame-ancestors", () => {
    const configPath = path.resolve(process.cwd(), "next.config.ts");
    const content = fs.readFileSync(configPath, "utf-8");

    expect(content).toContain("Content-Security-Policy");
    expect(content).toContain("frame-ancestors");
    expect(content).toContain("'self'");
    expect(content).toContain("http://localhost:3000");
    expect(content).toContain(
      "https://teamradar-walerimoretz-lang-walerimoretz-langs-projects.vercel.app",
    );
    expect(content).toContain("https://*.vercel.app");
  });

  it("should have CORS headers scoped to /api/ routes only", () => {
    const configPath = path.resolve(process.cwd(), "next.config.ts");
    const content = fs.readFileSync(configPath, "utf-8");

    expect(content).toContain("/api/");
    expect(content).toContain("Access-Control-Allow-Methods");
    expect(content).not.toMatch(
      /key\s*:\s*["']Access-Control-Allow-Origin["'][\s\S]*?value\s*:\s*["']\*["']/,
    );
  });
});
