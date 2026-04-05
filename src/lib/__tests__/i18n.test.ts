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

  // ─── v4.5 – neue Sektionen (wizard, requestDetail, requests, table, form) ──

  it("de and en translations have identical top-level key sets", () => {
    const deKeys = Object.keys(translations.de).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it("all nested keys in de have a counterpart in en (deep parity)", () => {
    function flatKeys(obj: unknown, prefix = ""): string[] {
      if (typeof obj !== "object" || obj === null) return [prefix];
      return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
        flatKeys(v, prefix ? `${prefix}.${k}` : k),
      );
    }
    const deKeys = new Set(flatKeys(translations.de));
    const enKeys = new Set(flatKeys(translations.en));
    const missingInEn = [...deKeys].filter((k) => !enKeys.has(k));
    expect(missingInEn).toEqual([]);
  });

  it("wizard section is fully translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    // Wizard titles
    expect(de.wizard.title).toBe("Neuer Urlaubsantrag");
    expect(en.wizard.title).toBe("New Vacation Request");
    // Vacation types
    expect(de.wizard.vacationType.paid).toBe("Bezahlter Urlaub");
    expect(en.wizard.vacationType.paid).toBe("Paid vacation");
    expect(de.wizard.vacationType.unpaid).toBe("Unbezahlter Urlaub");
    expect(en.wizard.vacationType.unpaid).toBe("Unpaid vacation");
    // Wizard steps
    expect(de.wizard.steps.template).toBe("Vorlage");
    expect(en.wizard.steps.template).toBe("Template");
    // Success
    expect(de.wizard.success.title).toBe("Antrag eingereicht!");
    expect(en.wizard.success.title).toBe("Request submitted!");
    // Confirm
    expect(de.wizard.confirm.confirmText).toBe("Ja, Absenden");
    expect(en.wizard.confirm.confirmText).toBe("Yes, submit");
  });

  it("requestDetail section is fully translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.requestDetail.title).toBe("Urlaubsantrag");
    expect(en.requestDetail.title).toBe("Vacation Request");
    expect(de.requestDetail.exportPdf).toBe("PDF exportieren");
    expect(en.requestDetail.exportPdf).toBe("Export PDF");
    expect(de.requestDetail.statusFlow.submitted).toBe("Eingereicht");
    expect(en.requestDetail.statusFlow.submitted).toBe("Submitted");
    expect(de.requestDetail.breadcrumb.requests).toBe("Anträge");
    expect(en.requestDetail.breadcrumb.requests).toBe("Requests");
  });

  it("requests section is fully translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.requests.allRequests).toBe("Alle Urlaubsanträge");
    expect(en.requests.allRequests).toBe("All vacation requests");
    expect(de.requests.noOrg.heading).toBe("Keine Organisation");
    expect(en.requests.noOrg.heading).toBe("No organization");
    expect(de.requests.emptyAll).toBe("Noch keine Anträge vorhanden");
    expect(en.requests.emptyAll).toBe("No requests yet");
  });

  it("table section is translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.table.period).toBe("Zeitraum");
    expect(en.table.period).toBe("Period");
    expect(de.table.duration).toBe("Dauer");
    expect(en.table.duration).toBe("Duration");
    expect(de.table.actions).toBe("Aktionen");
    expect(en.table.actions).toBe("Actions");
  });

  it("form section is translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.form.firstName).toBe("Vorname");
    expect(en.form.firstName).toBe("First name");
    expect(de.form.password).toBe("Passwort");
    expect(en.form.password).toBe("Password");
  });

  it("view section labels are translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.view.listView).toBe("Listenansicht");
    expect(en.view.listView).toBe("List view");
    expect(de.view.gridView).toBe("Rasteransicht");
    expect(en.view.gridView).toBe("Grid view");
  });

  it("admin approversSection is translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.admin.approversSection.title).toBe("Genehmiger-E-Mails");
    expect(en.admin.approversSection.title).toBe("Approver emails");
    expect(de.admin.approversSection.save).toBe("Genehmiger speichern");
    expect(en.admin.approversSection.save).toBe("Save approvers");
  });

  it("admin usersSection is translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.admin.usersSection.teamMembers).toBe("Teammitglieder");
    expect(en.admin.usersSection.teamMembers).toBe("Team members");
  });

  it("common new keys are translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.common.add).toBe("Hinzufügen");
    expect(en.common.add).toBe("Add");
    expect(de.common.showAll).toBe("Alle anzeigen");
    expect(en.common.showAll).toBe("Show all");
    expect(de.common.searchPlaceholder).toBe("Suchen...");
    expect(en.common.searchPlaceholder).toBe("Search...");
  });

  it("dashboard KPI section is translated in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.dashboard.kpi.pendingRequests).toBe("Ausstehende Anträge");
    expect(en.dashboard.kpi.pendingRequests).toBe("Pending requests");
    expect(de.dashboard.quickActions).toBe("Schnellzugriff");
    expect(en.dashboard.quickActions).toBe("Quick actions");
  });

  it("errors section has pdfExportFailed and signatureRequired in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.errors.pdfExportFailed).toBe("PDF-Export fehlgeschlagen");
    expect(en.errors.pdfExportFailed).toBe("PDF export failed");
    expect(de.errors.signatureRequired).toBeTruthy();
    expect(en.errors.signatureRequired).toBeTruthy();
  });

  it("nav section has new keys (openCalendar, connectEmail, etc.) in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.nav.openCalendar).toBe("Kalender öffnen");
    expect(en.nav.openCalendar).toBe("Open calendar");
    expect(de.nav.toSettings).toBe("Zu den Einstellungen");
    expect(en.nav.toSettings).toBe("Go to settings");
  });

  it("settings sub-sections (region, workWeek, deputy, etc.) are present in both languages", () => {
    const de = getTranslations("de");
    const en = getTranslations("en");
    expect(de.settings.region.title).toBe("Sprache & Region");
    expect(en.settings.region.title).toBe("Language & Region");
    expect(de.settings.deputy.title).toBe("Stellvertretung");
    expect(en.settings.deputy.title).toBe("Deputy");
    expect(de.settings.signatureSection.upload).toBe("Unterschrift hochladen");
    expect(en.settings.signatureSection.upload).toBe("Upload signature");
  });
});

