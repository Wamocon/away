import { describe, it, expect } from "vitest";
import { getTranslations, translations } from "../i18n";
import type { Locale } from "../i18n";

describe("i18n – getTranslations", () => {
  it('returns German translations for "de"', () => {
    const t = getTranslations("de");
    expect(t.nav.dashboard).toBe("Dashboard");
    expect(t.status.pending).toBe("Ausstehend");
    expect(t.status.approved).toBe("Genehmigt");
    expect(t.status.rejected).toBe("Abgelehnt");
    expect(t.roles.admin).toBe("Administrator");
    expect(t.roles.employee).toBe("Mitarbeiter");
  });

  it('returns English translations for "en"', () => {
    const t = getTranslations("en");
    expect(t.nav.dashboard).toBe("Dashboard");
    expect(t.status.pending).toBe("Pending");
    expect(t.status.approved).toBe("Approved");
    expect(t.status.rejected).toBe("Rejected");
    expect(t.roles.admin).toBe("Administrator");
    expect(t.roles.employee).toBe("Employee");
  });

  it("falls back to German for an unknown locale", () => {
    const t = getTranslations("xx" as Locale);
    expect(t).toEqual(translations.de);
  });

  it("de translations have all required top-level keys", () => {
    const requiredKeys = [
      "nav",
      "common",
      "status",
      "vacation",
      "dashboard",
      "settings",
      "notifications",
      "roles",
      "errors",
    ];
    const t = getTranslations("de");
    for (const key of requiredKeys) {
      expect(t).toHaveProperty(key);
    }
  });

  it("en translations have all required top-level keys", () => {
    const requiredKeys = [
      "nav",
      "common",
      "status",
      "vacation",
      "dashboard",
      "settings",
      "notifications",
      "roles",
      "errors",
    ];
    const t = getTranslations("en");
    for (const key of requiredKeys) {
      expect(t).toHaveProperty(key);
    }
  });

  it("de and en have the same top-level keys", () => {
    const deKeys = Object.keys(translations.de).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it("vacation types are translated in German", () => {
    const t = getTranslations("de");
    expect(t.vacation.types.vacation).toBe("Urlaub");
    expect(t.vacation.types.sickLeave).toBe("Krankmeldung");
  });

  it("vacation types are translated in English", () => {
    const t = getTranslations("en");
    expect(t.vacation.types.vacation).toBe("Vacation");
    expect(t.vacation.types.sickLeave).toBe("Sick Leave");
  });

  it("common actions are available in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.common.save).toBe("Speichern");
    expect(en.common.save).toBe("Save");
    expect(de.common.cancel).toBe("Abbrechen");
    expect(en.common.cancel).toBe("Cancel");
  });

  it("settings options are available in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.settings.languageOptions.de).toBe("Deutsch");
    expect(en.settings.languageOptions.de).toBe("German");
  });

  // v4.1 – nav keys used in Sidebar
  it("nav keys used in Sidebar are present in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    const sidebarKeys: Array<keyof typeof de.nav> = [
      "dashboard",
      "calendar",
      "approvals",
      "reports",
      "admin",
      "settings",
    ];
    for (const key of sidebarKeys) {
      expect(de.nav[key]).toBeTruthy();
      expect(en.nav[key]).toBeTruthy();
    }
  });

  it("dashboard.myRequests is translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.dashboard.myRequests).toBe("Meine Anträge");
    expect(en.dashboard.myRequests).toBe("My Requests");
  });

  it("dashboard.welcome is translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.dashboard.welcome).toBe("Willkommen zurück");
    expect(en.dashboard.welcome).toBe("Welcome back");
  });

  it("notifications keys used in NotificationCenter are present", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.notifications.title).toBe("Benachrichtigungen");
    expect(en.notifications.title).toBe("Notifications");
    expect(de.notifications.noNotifications).toBeTruthy();
    expect(en.notifications.noNotifications).toBeTruthy();
  });

  it("settings.themeOptions are present in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.settings.themeOptions.dark).toBe("Dunkel");
    expect(de.settings.themeOptions.light).toBe("Hell");
    expect(en.settings.themeOptions.dark).toBe("Dark");
    expect(en.settings.themeOptions.light).toBe("Light");
  });

  // ─── v4.2 Bug-fix keys ────────────────────────────────────────
  it("settings.savedMsg is translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.settings.savedMsg).toBe("Einstellungen erfolgreich gespeichert!");
    expect(en.settings.savedMsg).toBeTruthy();
  });

  it("admin section has all required keys in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    const requiredAdminKeys: Array<keyof typeof de.admin> = [
      "title",
      "general",
      "users",
      "templates",
      "organizations",
      "allUsers",
      "allUsersDesc",
      "loadAllUsers",
      "bulkAssign",
    ];
    for (const key of requiredAdminKeys) {
      expect(de.admin[key]).toBeTruthy();
      expect(en.admin[key]).toBeTruthy();
    }
  });

  it("admin.title is correct in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.admin.title).toBe("Administration");
    expect(en.admin.title).toBe("Administration");
  });

  it("calendar section has createRequest and clearSelection in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.calendar.createRequest).toBe("Urlaub beantragen");
    expect(en.calendar.createRequest).toBeTruthy();
    expect(de.calendar.clearSelection).toBeTruthy();
    expect(en.calendar.clearSelection).toBeTruthy();
  });

  it("approvals section has approve, reject, signatureRequired in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.approvals.approve).toBe("Genehmigen");
    expect(en.approvals.approve).toBeTruthy();
    expect(de.approvals.reject).toBe("Ablehnen");
    expect(en.approvals.reject).toBeTruthy();
    expect(de.approvals.signatureRequired).toBeTruthy();
    expect(en.approvals.signatureRequired).toBeTruthy();
  });

  it("de and en have the same second-level keys for admin, calendar, approvals", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    const sections: Array<"admin" | "calendar" | "approvals"> = ["admin", "calendar", "approvals"];
    for (const section of sections) {
      const deKeys = Object.keys(de[section]).sort();
      const enKeys = Object.keys(en[section]).sort();
      expect(deKeys).toEqual(enKeys);
    }
  });

  it("settings profile fields are translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    const profileKeys: Array<keyof typeof de.settings> = [
      "profileTitle",
      "profileDesc",
      "firstName",
      "lastName",
      "employeeId",
      "deputyName",
      "deputyEmail",
    ];
    for (const key of profileKeys) {
      expect(de.settings[key]).toBeTruthy();
      expect(en.settings[key]).toBeTruthy();
    }
  });
});
