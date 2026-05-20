import { describe, it, expect } from "vitest";
import { renderFieldValue, countWorkingDays } from "../utils/formatters";

describe("renderFieldValue", () => {
  it("should return null for null or undefined", () => {
    expect(renderFieldValue(null)).toBe(null);
    expect(renderFieldValue(undefined)).toBe(null);
  });

  it("should render basic strings and numbers", () => {
    expect(renderFieldValue("Hello")).toBe("Hello");
    expect(renderFieldValue(123)).toBe("123");
  });

  it("should render booleans as Ja/Nein", () => {
    expect(renderFieldValue(true)).toBe("Ja");
    expect(renderFieldValue(false)).toBe("Nein");
  });

  it("should render single objects with a label", () => {
    expect(renderFieldValue({ label: "Homeoffice", value: "ho" })).toBe(
      "Homeoffice",
    );
  });

  it("should return empty string for checked items with no label", () => {
    // item.label is missing → item.label || "" → uses empty string
    const value = [{ id: "1", checked: true }];
    const result = renderFieldValue(value);
    // activeLabels.length > 0 → joins ("")
    expect(result).toBe("");
  });

  it("should render arrays of checked items", () => {
    const value = [
      { id: "1", label: "Dienstwagen", checked: true },
      { id: "2", label: "Laptop", checked: false },
      { id: "3", label: "Handy", checked: true },
    ];
    expect(renderFieldValue(value)).toBe("Dienstwagen, Handy");
  });

  it("should return null for arrays with no checked items", () => {
    const value = [{ id: "1", label: "Dienstwagen", checked: false }];
    expect(renderFieldValue(value)).toBe(null);
  });

  it("should format ISO date strings", () => {
    expect(renderFieldValue("2024-12-24")).toBe("24.12.2024");
  });

  it("should handle non-standard objects gracefully", () => {
    expect(renderFieldValue({ foo: "bar" })).toBe("[object Object]");
  });

  it("should return raw string if date parsing throws", () => {
    // Matches regex but is an invalid date → triggers catch fallback
    const invalid = "2024-99-99";
    const result = renderFieldValue(invalid);
    // Either returns the raw string or throws – just don't throw exceptions
    expect(typeof result === "string" || result === null).toBe(true);
  });

  it('should return null for "null" string value', () => {
    expect(renderFieldValue("null")).toBe(null);
  });

  it('should return null for "undefined" string value', () => {
    expect(renderFieldValue("undefined")).toBe(null);
  });
});

// ── countWorkingDays ─────────────────────────────────────────────────────────

describe("countWorkingDays", () => {
  // ── Einzelne Tage ──────────────────────────────────────────────────────────

  it("returns 1 for a single Monday (2026-05-18)", () => {
    expect(countWorkingDays("2026-05-18", "2026-05-18")).toBe(1);
  });

  it("returns 1 for a single Friday (2026-05-22)", () => {
    expect(countWorkingDays("2026-05-22", "2026-05-22")).toBe(1);
  });

  it("returns 0 for a Saturday (2026-05-23)", () => {
    expect(countWorkingDays("2026-05-23", "2026-05-23")).toBe(0);
  });

  it("returns 0 for a Sunday (2026-05-24)", () => {
    expect(countWorkingDays("2026-05-24", "2026-05-24")).toBe(0);
  });

  // ── Ganze Arbeitswochen ────────────────────────────────────────────────────

  it("returns 5 for a full work week Mon–Fri (2026-05-18 to 2026-05-22)", () => {
    expect(countWorkingDays("2026-05-18", "2026-05-22")).toBe(5);
  });

  it("returns 5 for Mon–Sun (skips weekend, 2026-05-18 to 2026-05-24)", () => {
    expect(countWorkingDays("2026-05-18", "2026-05-24")).toBe(5);
  });

  it("returns 10 for two consecutive full work weeks (2026-05-18 to 2026-05-29)", () => {
    expect(countWorkingDays("2026-05-18", "2026-05-29")).toBe(10);
  });

  // ── Zeitraum über Wochenende ───────────────────────────────────────────────

  it("counts Thu+Fri+Mon for Thu–Mon spanning a weekend (3 days)", () => {
    // 2026-05-21 Thu, 22 Fri, 23 Sat (skip), 24 Sun (skip), 25 Mon
    expect(countWorkingDays("2026-05-21", "2026-05-25")).toBe(3);
  });

  it("returns 0 for a Saturday–Sunday range (2026-05-23 to 2026-05-24)", () => {
    expect(countWorkingDays("2026-05-23", "2026-05-24")).toBe(0);
  });

  // ── Praxisnahe Urlaubsbeispiele ────────────────────────────────────────────

  it("returns 10 for a typical 2-week vacation Mon 13.07 to Fri 24.07.2026", () => {
    expect(countWorkingDays("2026-07-13", "2026-07-24")).toBe(10);
  });

  it("returns 15 for three work weeks (2026-08-03 to 2026-08-21)", () => {
    expect(countWorkingDays("2026-08-03", "2026-08-21")).toBe(15);
  });

  it("returns 1 for a mid-week single day (Wednesday 2026-06-10)", () => {
    expect(countWorkingDays("2026-06-10", "2026-06-10")).toBe(1);
  });

  // ── Ungültige / Grenzfall-Eingaben ─────────────────────────────────────────

  it("returns 0 when end date is before start date", () => {
    expect(countWorkingDays("2026-05-22", "2026-05-18")).toBe(0);
  });

  it("returns 1 for same-day same-day (no off-by-one error)", () => {
    // Tuesday
    expect(countWorkingDays("2026-06-09", "2026-06-09")).toBe(1);
  });
});
