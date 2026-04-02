// ─── AWAY Translation System ──────────────────────────────────
// Add keys here and reference them with useTranslation()

export type Locale = "de" | "en";

export const translations = {
  de: {
    // Navigation
    nav: {
      dashboard: "Dashboard",
      requests: "Antragstellung",
      calendar: "Kalender",
      reports: "Berichte",
      approvals: "Anträge",
      admin: "Administration",
      settings: "Einstellungen",
      organizations: "Organisationen",
      logout: "Abmelden",
    },
    // Common
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      edit: "Bearbeiten",
      loading: "Lade...",
      error: "Fehler",
      success: "Erfolgreich",
      confirm: "Bestätigen",
      back: "Zurück",
      close: "Schließen",
      search: "Suchen",
      filter: "Filtern",
      all: "Alle",
      none: "Keine",
      yes: "Ja",
      no: "Nein",
      noData: "Keine Daten vorhanden",
    },
    // Status
    status: {
      pending: "Ausstehend",
      approved: "Genehmigt",
      rejected: "Abgelehnt",
      cancelled: "Zurückgezogen",
    },
    // Vacation requests
    vacation: {
      title: "Urlaubsantrag",
      titlePlural: "Urlaubsanträge",
      newRequest: "Neuer Antrag",
      from: "Von",
      to: "Bis",
      duration: "Dauer",
      days: "Tage",
      reason: "Grund",
      type: "Art",
      submit: "Antrag stellen",
      approve: "Genehmigen",
      reject: "Ablehnen",
      withdraw: "Zurückziehen",
      noRequests: "Keine Anträge vorhanden",
      types: {
        vacation: "Urlaub",
        sickLeave: "Krankmeldung",
        overtime: "Überstundenausgleich",
        special: "Sonderurlaub",
        homeoffice: "Homeoffice",
      },
    },
    // Dashboard
    dashboard: {
      welcome: "Willkommen zurück",
      myRequests: "Meine Anträge",
      pendingApprovals: "Ausstehende Genehmigungen",
      upcomingVacations: "Kommende Urlaube",
      approvedDaysThisYear: "Genehmigte Tage (dieses Jahr)",
      recentActivity: "Letzte Aktivitäten",
    },
    // Settings
    settings: {
      title: "Einstellungen",
      profile: "Profil",
      language: "Sprache",
      theme: "Design",
      notifications: "Benachrichtigungen",
      emailConnections: "E-Mail-Verbindungen",
      workDays: "Arbeitstage",
      dateFormat: "Datumsformat",
      state: "Bundesland (Feiertage)",
      saveChanges: "Änderungen speichern",
      saved: "Gespeichert!",
      languageOptions: {
        de: "Deutsch",
        en: "Englisch",
      },
      themeOptions: {
        dark: "Dunkel",
        light: "Hell",
      },
    },
    // Notifications
    notifications: {
      title: "Benachrichtigungen",
      noNotifications: "Keine Benachrichtigungen",
      markAllRead: "Alle gelesen",
      newRequest: "Ausstehender Antrag",
      approved: "Antrag genehmigt ✓",
      rejected: "Antrag abgelehnt",
      viewAll: "Alle Anträge anzeigen →",
    },
    // Roles
    roles: {
      admin: "Administrator",
      cio: "CIO",
      approver: "Genehmiger",
      employee: "Mitarbeiter",
    },
    // Errors
    errors: {
      notFound: "Seite nicht gefunden",
      notFoundDesc:
        "Die gewünschte Seite existiert nicht oder wurde verschoben.",
      unexpected: "Ein unerwarteter Fehler ist aufgetreten",
      backToDashboard: "Zurück zum Dashboard",
      reload: "Seite neu laden",
    },
  },
  en: {
    nav: {
      dashboard: "Dashboard",
      requests: "New Request",
      calendar: "Calendar",
      reports: "Reports",
      approvals: "Approvals",
      admin: "Administration",
      settings: "Settings",
      organizations: "Organizations",
      logout: "Logout",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      back: "Back",
      close: "Close",
      search: "Search",
      filter: "Filter",
      all: "All",
      none: "None",
      yes: "Yes",
      no: "No",
      noData: "No data available",
    },
    status: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Withdrawn",
    },
    vacation: {
      title: "Vacation Request",
      titlePlural: "Vacation Requests",
      newRequest: "New Request",
      from: "From",
      to: "To",
      duration: "Duration",
      days: "days",
      reason: "Reason",
      type: "Type",
      submit: "Submit Request",
      approve: "Approve",
      reject: "Reject",
      withdraw: "Withdraw",
      noRequests: "No requests found",
      types: {
        vacation: "Vacation",
        sickLeave: "Sick Leave",
        overtime: "Overtime Compensation",
        special: "Special Leave",
        homeoffice: "Home Office",
      },
    },
    dashboard: {
      welcome: "Welcome back",
      myRequests: "My Requests",
      pendingApprovals: "Pending Approvals",
      upcomingVacations: "Upcoming Vacations",
      approvedDaysThisYear: "Approved days (this year)",
      recentActivity: "Recent Activity",
    },
    settings: {
      title: "Settings",
      profile: "Profile",
      language: "Language",
      theme: "Theme",
      notifications: "Notifications",
      emailConnections: "Email Connections",
      workDays: "Work Days",
      dateFormat: "Date Format",
      state: "Federal State (Holidays)",
      saveChanges: "Save Changes",
      saved: "Saved!",
      languageOptions: {
        de: "German",
        en: "English",
      },
      themeOptions: {
        dark: "Dark",
        light: "Light",
      },
    },
    notifications: {
      title: "Notifications",
      noNotifications: "No notifications",
      markAllRead: "Mark all read",
      newRequest: "Pending Request",
      approved: "Request approved ✓",
      rejected: "Request rejected",
      viewAll: "View all requests →",
    },
    roles: {
      admin: "Administrator",
      cio: "CIO",
      approver: "Approver",
      employee: "Employee",
    },
    errors: {
      notFound: "Page not found",
      notFoundDesc: "The requested page does not exist or has been moved.",
      unexpected: "An unexpected error occurred",
      backToDashboard: "Back to Dashboard",
      reload: "Reload page",
    },
  },
} as const;

export type TranslationKey = typeof translations.de;

export function getTranslations(locale: Locale): TranslationKey {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((translations as any)[locale] as TranslationKey) ?? translations.de;
}
