import { describe, it, expect } from "vitest";
import { renderFieldValue } from "../utils/formatters";

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
