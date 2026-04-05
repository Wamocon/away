import { describe, it, expect } from "vitest";
import {
  getEasterSunday,
  getHolidays,
  calculateVacationDays,
  GERMAN_STATES,
} from "../holidays";

describe("holidays", () => {
  describe("getEasterSunday", () => {
    it("returns correct Easter Sunday for known years", () => {
      // Well-known Easter dates
      expect(getEasterSunday(2024)).toEqual(new Date(2024, 2, 31)); // 31 March 2024
      expect(getEasterSunday(2025)).toEqual(new Date(2025, 3, 20)); // 20 April 2025
      expect(getEasterSunday(2026)).toEqual(new Date(2026, 3, 5)); // 5 April 2026
    });

    it("returns a Date object", () => {
      const result = getEasterSunday(2024);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("getHolidays", () => {
    it("returns nationwide holidays without state", () => {
      const holidays = getHolidays(2024);
      const names = holidays.map((h) => h.name);
      expect(names).toContain("Neujahr");
      expect(names).toContain("Tag der Arbeit");
      expect(names).toContain("Tag der Deutschen Einheit");
      expect(names).toContain("1. Weihnachtstag");
      expect(names).toContain("2. Weihnachtstag");
      expect(names).toContain("Karfreitag");
      expect(names).toContain("Ostermontag");
      expect(names).toContain("Christi Himmelfahrt");
      expect(names).toContain("Pfingstmontag");
    });

    it("includes Bavaria (BY) specific holidays", () => {
      const holidays = getHolidays(2024, "BY");
      const names = holidays.map((h) => h.name);
      expect(names).toContain("Heilige Drei Könige");
      expect(names).toContain("Mariä Himmelfahrt");
    });

    it("includes Berlin (BE) specific holidays", () => {
      const holidays = getHolidays(2024, "BE");
      const names = holidays.map((h) => h.name);
      expect(names).toContain("Internationaler Frauentag");
    });

    it("includes Sachsen (SN) Buß- und Bettag", () => {
      const holidays = getHolidays(2024, "SN");
      const names = holidays.map((h) => h.name);
      expect(names).toContain("Buß- und Bettag");
    });

    it("includes Thüringen (TH) Weltkindertag", () => {
      const holidays = getHolidays(2024, "TH");
      const names = holidays.map((h) => h.name);
      expect(names).toContain("Weltkindertag");
    });

    it("includes Reformationstag for Brandenburg (BB)", () => {
      const holidays = getHolidays(2024, "BB");
      const names = holidays.map((h) => h.name);
      expect(names).toContain("Reformationstag");
    });

    it("includes Fronleichnam for NW", () => {
      const holidays = getHolidays(2024, "NW");
      const names = holidays.map((h) => h.name);
      expect(names).toContain("Fronleichnam");
    });

    it("includes Allerheiligen for BW", () => {
      const holidays = getHolidays(2024, "BW");
      const names = holidays.map((h) => h.name);
      expect(names).toContain("Allerheiligen");
    });

    it("ALL state includes all possible holidays", () => {
      const holidays = getHolidays(2024, "ALL");
      expect(holidays.length).toBeGreaterThan(10);
    });

    it("each holiday has date and name properties", () => {
      const holidays = getHolidays(2024, "BY");
      holidays.forEach((h) => {
        expect(h).toHaveProperty("date");
        expect(h).toHaveProperty("name");
        expect(h.date).toBeInstanceOf(Date);
        expect(typeof h.name).toBe("string");
      });
    });
  });

  describe("calculateVacationDays", () => {
    it("returns 0 if from > to", () => {
      expect(
        calculateVacationDays(
          new Date(2024, 5, 10),
          new Date(2024, 5, 1),
          "BY",
        ),
      ).toBe(0);
    });

    it("excludes weekends", () => {
      // Monday to Friday = 5 work days
      const days = calculateVacationDays(
        new Date(2024, 5, 3),
        new Date(2024, 5, 7),
        "BY",
      );
      expect(days).toBe(5);
    });

    it("excludes public holidays", () => {
      // Tag der Deutschen Einheit (Oct 3, 2024) is a Thursday
      const days = calculateVacationDays(
        new Date(2024, 9, 3),
        new Date(2024, 9, 3),
        "BY",
      );
      expect(days).toBe(0);
    });

    it("handles same-day request (working day)", () => {
      // June 5, 2024 is a Wednesday
      const days = calculateVacationDays(
        new Date(2024, 5, 5),
        new Date(2024, 5, 5),
        "BY",
      );
      expect(days).toBe(1);
    });

    it("handles multi-year ranges", () => {
      const days = calculateVacationDays(
        new Date(2024, 11, 30),
        new Date(2025, 0, 2),
        "BY",
      );
      // Dec 30 (Mon), Dec 31 (Tue), Jan 1 = holiday (Wed), Jan 2 (Thu): 3 working days
      expect(days).toBe(3);
    });
  });

  describe("GERMAN_STATES", () => {
    it("contains 17 entries", () => {
      expect(GERMAN_STATES.length).toBe(17);
    });

    it("first entry is ALL", () => {
      expect(GERMAN_STATES[0].code).toBe("ALL");
    });

    it("has code and name for each entry", () => {
      GERMAN_STATES.forEach((s) => {
        expect(s).toHaveProperty("code");
        expect(s).toHaveProperty("name");
      });
    });
  });
});
