import { describe, it, expect } from 'vitest';
import { getTranslations, translations } from '../i18n';
import type { Locale } from '../i18n';

describe('i18n – getTranslations', () => {
  it('returns German translations for "de"', () => {
    const t = getTranslations('de');
    expect(t.nav.dashboard).toBe('Dashboard');
    expect(t.status.pending).toBe('Ausstehend');
    expect(t.status.approved).toBe('Genehmigt');
    expect(t.status.rejected).toBe('Abgelehnt');
    expect(t.roles.admin).toBe('Administrator');
    expect(t.roles.employee).toBe('Mitarbeiter');
  });

  it('returns English translations for "en"', () => {
    const t = getTranslations('en');
    expect(t.nav.dashboard).toBe('Dashboard');
    expect(t.status.pending).toBe('Pending');
    expect(t.status.approved).toBe('Approved');
    expect(t.status.rejected).toBe('Rejected');
    expect(t.roles.admin).toBe('Administrator');
    expect(t.roles.employee).toBe('Employee');
  });

  it('falls back to German for an unknown locale', () => {
    const t = getTranslations('xx' as Locale);
    expect(t).toEqual(translations.de);
  });

  it('de translations have all required top-level keys', () => {
    const requiredKeys = ['nav', 'common', 'status', 'vacation', 'dashboard', 'settings', 'notifications', 'roles', 'errors'];
    const t = getTranslations('de');
    for (const key of requiredKeys) {
      expect(t).toHaveProperty(key);
    }
  });

  it('en translations have all required top-level keys', () => {
    const requiredKeys = ['nav', 'common', 'status', 'vacation', 'dashboard', 'settings', 'notifications', 'roles', 'errors'];
    const t = getTranslations('en');
    for (const key of requiredKeys) {
      expect(t).toHaveProperty(key);
    }
  });

  it('de and en have the same top-level keys', () => {
    const deKeys = Object.keys(translations.de).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it('vacation types are translated in German', () => {
    const t = getTranslations('de');
    expect(t.vacation.types.vacation).toBe('Urlaub');
    expect(t.vacation.types.sickLeave).toBe('Krankmeldung');
  });

  it('vacation types are translated in English', () => {
    const t = getTranslations('en');
    expect(t.vacation.types.vacation).toBe('Vacation');
    expect(t.vacation.types.sickLeave).toBe('Sick Leave');
  });

  it('common actions are available in both languages', () => {
    const de = getTranslations('de');
    const en = getTranslations('en');
    expect(de.common.save).toBe('Speichern');
    expect(en.common.save).toBe('Save');
    expect(de.common.cancel).toBe('Abbrechen');
    expect(en.common.cancel).toBe('Cancel');
  });

  it('settings options are available in both languages', () => {
    const de = getTranslations('de');
    const en = getTranslations('en');
    expect(de.settings.languageOptions.de).toBe('Deutsch');
    expect(en.settings.languageOptions.de).toBe('German');
  });

  // v4.1 – nav keys used in Sidebar
  it('nav keys used in Sidebar are present in both languages', () => {
    const de = getTranslations('de');
    const en = getTranslations('en');
    const sidebarKeys: Array<keyof typeof de.nav> = ['dashboard', 'calendar', 'approvals', 'reports', 'admin', 'settings'];
    for (const key of sidebarKeys) {
      expect(de.nav[key]).toBeTruthy();
      expect(en.nav[key]).toBeTruthy();
    }
  });

  it('dashboard.myRequests is translated in both languages', () => {
    const de = getTranslations('de');
    const en = getTranslations('en');
    expect(de.dashboard.myRequests).toBe('Meine Anträge');
    expect(en.dashboard.myRequests).toBe('My Requests');
  });

  it('dashboard.welcome is translated in both languages', () => {
    const de = getTranslations('de');
    const en = getTranslations('en');
    expect(de.dashboard.welcome).toBe('Willkommen zurück');
    expect(en.dashboard.welcome).toBe('Welcome back');
  });

  it('notifications keys used in NotificationCenter are present', () => {
    const de = getTranslations('de');
    const en = getTranslations('en');
    expect(de.notifications.title).toBe('Benachrichtigungen');
    expect(en.notifications.title).toBe('Notifications');
    expect(de.notifications.noNotifications).toBeTruthy();
    expect(en.notifications.noNotifications).toBeTruthy();
  });

  it('settings.themeOptions are present in both languages', () => {
    const de = getTranslations('de');
    const en = getTranslations('en');
    expect(de.settings.themeOptions.dark).toBe('Dunkel');
    expect(de.settings.themeOptions.light).toBe('Hell');
    expect(en.settings.themeOptions.dark).toBe('Dark');
    expect(en.settings.themeOptions.light).toBe('Light');
  });
});
