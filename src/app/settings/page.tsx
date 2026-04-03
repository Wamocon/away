"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  User,
  Loader,
  CheckCircle,
  Calendar,
  Info,
  LayoutGrid,
  List,
  Bell,
  Shield,
  UserCheck,
  Upload,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveUserSettings, getUserSettings } from "@/lib/userSettings";
import { getOAuthSettings, saveOAuthSettings } from "@/lib/calendarSync";
import { getOrganizationsForUser } from "@/lib/organization";
import { useViewMode } from "@/components/ui/ViewModeProvider";
import { useLanguage } from "@/components/ui/LanguageProvider";
import { Locale } from "@/lib/i18n";

interface UserSettingsData {
  email?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  language?: string;
  dateFormat?: string;
  workDays?: number[];
  state?: string;
  vacationQuota?: number;
  carryOver?: number;
  deputyName?: string;
  deputyEmail?: string;
  notifyOnApproval?: boolean;
  notifyOnRejection?: boolean;
  notifyOnReminder?: boolean;
}

export default function SettingsPage() {
  const { viewMode, setViewMode } = useViewMode();
  const { locale, setLocale } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  // New settings states
  const [language, setLanguage] = useState<Locale>(locale);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [dateFormat, setDateFormat] = useState("DD.MM.YYYY");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]); // 1=Mo, 5=Fr
  const [state, setState] = useState("ALL");

  // OAuth states
  const [outlookEmail, setOutlookEmail] = useState("");
  const [outlookToken, setOutlookToken] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleToken, setGoogleToken] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  // Extended settings
  const [vacationQuota, setVacationQuota] = useState(30);
  const [carryOver, setCarryOver] = useState(0);
  const [deputyName, setDeputyName] = useState("");
  const [deputyEmail, setDeputyEmail] = useState("");
  const [notifyOnApproval, setNotifyOnApproval] = useState(true);
  const [notifyOnRejection, setNotifyOnRejection] = useState(true);
  const [notifyOnReminder, setNotifyOnReminder] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureUploading] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      // Find the first organization for the user to store personal settings
      const orgs = await getOrganizationsForUser(userId);
      if (orgs && orgs.length > 0 && orgs[0]) {
        const currentOrgId = orgs[0].id;
        setOrgId(currentOrgId);

        // General settings
        const data = await getUserSettings(userId, currentOrgId);
        // Einstellungen sind direkt im JSONB-Feld 'settings'
        const settings = (data?.settings as UserSettingsData) || {};

        if (settings.email) setEmailInput(settings.email);
        if (settings.firstName) setFirstName(settings.firstName);
        if (settings.lastName) setLastName(settings.lastName);
        if (settings.employeeId) setEmployeeId(settings.employeeId);
        if (settings.language) setLanguage(settings.language as Locale);
        if (settings.dateFormat) setDateFormat(settings.dateFormat);
        if (settings.workDays) setWorkDays(settings.workDays);
        if (settings.state) setState(settings.state);
        if (settings.vacationQuota !== undefined)
          setVacationQuota(settings.vacationQuota);
        if (settings.carryOver !== undefined) setCarryOver(settings.carryOver);
        if (settings.deputyName) setDeputyName(settings.deputyName);
        if (settings.deputyEmail) setDeputyEmail(settings.deputyEmail);
        if (settings.notifyOnApproval !== undefined)
          setNotifyOnApproval(settings.notifyOnApproval);
        if (settings.notifyOnRejection !== undefined)
          setNotifyOnRejection(settings.notifyOnRejection);
        if (settings.notifyOnReminder !== undefined)
          setNotifyOnReminder(settings.notifyOnReminder);

        // OAuth settings
        const outlook = await getOAuthSettings(userId, currentOrgId, "outlook");
        if (outlook) {
          setOutlookEmail(outlook.email);
          setOutlookToken(outlook.token);
        }

        const google = await getOAuthSettings(userId, currentOrgId, "google");
        if (google) {
          setGoogleEmail(google.email);
          setGoogleToken(google.token);
        }
      }
    } catch (err) {
      console.error("[Settings] loadData Fehler:", err);
      setSaveError("Einstellungen konnten nicht geladen werden: " + (err instanceof Error ? err.message : String(err)));
    }
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        const uid = data.user?.id;
        const email = data.user?.email;
        if (!uid) return;
        setUserId(uid);
        setUserEmail(email ?? "");
        // E-Mail vorbesetzen falls noch nicht gesetzt
        setEmailInput((prev) => prev || email || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (userId) loadData();
  }, [userId, loadData]);

  const toggleWorkDay = (day: number) => {
    setWorkDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  const dayLabels = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !orgId) return;
    setSaving(true);
    try {
      // Save all settings including the new ones
      await saveUserSettings(userId, orgId, emailInput, {
        firstName,
        lastName,
        employeeId,
        language,
        dateFormat,
        workDays,
        state,
        vacationQuota,
        carryOver,
        deputyName,
        deputyEmail,
        notifyOnApproval,
        notifyOnRejection,
        notifyOnReminder,
      });

      // Apply language change immediately
      setLocale(language as Locale);

      // Save OAuth credentials if entered
      if (outlookEmail || outlookToken) {
        await saveOAuthSettings(
          userId,
          orgId,
          "outlook",
          outlookEmail,
          outlookToken,
        );
      }
      if (googleEmail || googleToken) {
        await saveOAuthSettings(
          userId,
          orgId,
          "google",
          googleEmail,
          googleToken,
        );
      }

      setSaved(true);
      setSaveError(null);
      // Daten neu laden um Persistenz zu bestätigen
      await loadData();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveError(
        "Fehler beim Speichern: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 w-full animate-fade-in space-y-6 text-[var(--text-base)]">
      {/* Toast Notifications */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-300 bg-[var(--success)] text-white font-semibold text-sm">
          <CheckCircle size={16} />
          {locale === "en" ? "Settings saved successfully!" : "Einstellungen erfolgreich gespeichert!"}
        </div>
      )}
      {saveError && (
        <div className="rounded-xl p-4 bg-[var(--danger-light)] border border-[var(--danger)] text-[var(--danger)] text-sm font-medium flex items-start gap-2">
          <span className="shrink-0 font-black">⚠</span>
          {saveError}
          <button onClick={() => setSaveError(null)} className="ml-auto shrink-0 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <User size={22} className="text-[var(--primary)]" />{" "}
          {locale === "en" ? "Profile Settings" : "Profil-Einstellungen"}
        </h1>
        <p className="text-sm mt-1 text-[var(--text-muted)]">
          {locale === "en"
            ? "Your personal profile, notifications and regional settings"
            : "Dein persönliches Profil, Benachrichtigungen und Regionaleinstellungen"}
        </p>
      </div>

      {userId && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* User profile */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Info size={16} className="text-[var(--primary)]" /> Mein Profil
            </h2>

            <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] flex items-center justify-center text-white font-black text-lg uppercase shadow-inner">
                {userEmail.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{userEmail}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-black">
                  Persönliches AWAY-Konto
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Vorname
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Max"
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Nachname
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Mustermann"
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Personalnummer (HR-ID)
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="P-0000"
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Benachrichtigungs-E-Mail
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                Oberfläche (Listenmodus)
              </label>
              <div className="flex p-1 rounded-xl w-fit bg-[var(--bg-elevated)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "list"
                      ? "bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-base)]"
                  }`}
                >
                  <List size={14} /> Liste
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-base)]"
                  }`}
                >
                  <LayoutGrid size={14} /> Raster
                </button>
              </div>
            </div>
          </section>

          {/* Region & Language */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                🌐
              </div>
              Sprache & Region
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Bevorzugte Sprache
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Locale)}
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                >
                  <option value="de">Deutsch (Standard)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Datumsformat
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                >
                  <option value="DD.MM.YYYY">
                    DD.MM.YYYY (Vorschau: 28.03.2026)
                  </option>
                  <option value="YYYY-MM-DD">
                    YYYY-MM-DD (Vorschau: 2026-03-28)
                  </option>
                  <option value="MM/DD/YYYY">
                    MM/DD/YYYY (Vorschau: 03/28/2026)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Bundesland (für Feiertage)
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                >
                  <option value="ALL">Alle / Gesamtdeutschland</option>
                  <option value="BW">Baden-Württemberg</option>
                  <option value="BY">Bayern</option>
                  <option value="BE">Berlin</option>
                  <option value="BB">Brandenburg</option>
                  <option value="HB">Bremen</option>
                  <option value="HH">Hamburg</option>
                  <option value="HE">Hessen</option>
                  <option value="MV">Mecklenburg-Vorpommern</option>
                  <option value="NI">Niedersachsen</option>
                  <option value="NW">Nordrhein-Westfalen</option>
                  <option value="RP">Rheinland-Pfalz</option>
                  <option value="SL">Saarland</option>
                  <option value="SN">Sachsen</option>
                  <option value="ST">Sachsen-Anhalt</option>
                  <option value="SH">Schleswig-Holstein</option>
                  <option value="TH">Thüringen</option>
                </select>
              </div>
            </div>
          </section>

          {/* Individual Work Week */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Calendar size={16} className="text-[var(--primary)]" />{" "}
              Persönliche Arbeitswoche
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Wähle deine regulären Arbeitstage aus. Diese werden bei der
              Urlaubsberechnung berücksichtigt.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkDay(day)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                    workDays.includes(day)
                      ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-md"
                      : "bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-base)]"
                  }`}
                >
                  {dayLabels[day]}
                </button>
              ))}
            </div>
          </section>

          {/* Calendar Sync */}
          <section className="card p-5 space-y-4 shadow-sm opacity-90 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Calendar size={16} className="text-[var(--primary)]" /> Externe
                Kalender (Beta)
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Microsoft / Outlook */}
              <div className="space-y-4 p-5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-[#0078d4] text-white font-black text-xs">
                    O
                  </div>
                  Microsoft Outlook
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold mb-1 text-[var(--text-muted)] uppercase">
                      Konto-E-Mail
                    </label>
                    <input
                      type="email"
                      value={outlookEmail}
                      onChange={(e) => setOutlookEmail(e.target.value)}
                      placeholder="name@firma.de"
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[#0078d4] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1 text-[var(--text-muted)] uppercase">
                      OAuth Key
                    </label>
                    <input
                      type="password"
                      value={outlookToken}
                      onChange={(e) => setOutlookToken(e.target.value)}
                      placeholder="Secret Key"
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[#0078d4] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Google */}
              <div className="space-y-4 p-5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-white shadow-sm border border-[var(--border)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  </div>
                  Google Calendar
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold mb-1 text-[var(--text-muted)] uppercase">
                      Google-E-Mail
                    </label>
                    <input
                      type="email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[#4285F4] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1 text-[var(--text-muted)] uppercase">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={googleToken}
                      onChange={(e) => setGoogleToken(e.target.value)}
                      placeholder="GCP Token"
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-surface)] border-[var(--border)] focus:border-[#4285F4] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Vacation Quota */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Calendar size={16} className="text-[var(--primary)]" />{" "}
              Urlaubskontingent
            </h2>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Dein persönliches Jahres-Urlaubskontingent. Individuelle
              Regelungen gelten laut Arbeitsvertrag.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Jahresurlaub (Tage)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={15}
                    max={45}
                    step={1}
                    value={vacationQuota}
                    onChange={(e) => setVacationQuota(Number(e.target.value))}
                    className="flex-1 accent-[var(--primary)]"
                  />
                  <span
                    className="text-sm font-black w-8 text-center"
                    style={{ color: "var(--primary)" }}
                  >
                    {vacationQuota}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Übertrag Vorjahr (Tage)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={carryOver}
                  onChange={(e) => setCarryOver(Number(e.target.value))}
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
            </div>
            <div
              className="flex items-center gap-4 p-3 rounded-xl"
              style={{ background: "var(--bg-elevated)" }}
            >
              <div
                className="flex-1 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Verfügbare Tage gesamt
              </div>
              <div
                className="text-xl font-black"
                style={{ color: "var(--success)" }}
              >
                {vacationQuota + carryOver}
              </div>
            </div>
          </section>

          {/* Deputy Settings */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <UserCheck size={16} className="text-[var(--primary)]" />{" "}
              Stellvertretung
            </h2>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Wer vertritt dich während deines Urlaubs? Wird in genehmigten
              Anträgen vermerkt.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  Name des Stellvertreters
                </label>
                <input
                  type="text"
                  value={deputyName}
                  onChange={(e) => setDeputyName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-wider">
                  E-Mail Stellvertreter
                </label>
                <input
                  type="email"
                  value={deputyEmail}
                  onChange={(e) => setDeputyEmail(e.target.value)}
                  placeholder="kollege@firma.de"
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-transparent border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Notification Preferences */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Bell size={16} className="text-[var(--primary)]" />{" "}
              Benachrichtigungen
            </h2>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Wähle, wann du per E-Mail benachrichtigt werden möchtest.
            </p>
            <div className="space-y-3">
              {[
                {
                  key: "notifyOnApproval",
                  value: notifyOnApproval,
                  setter: setNotifyOnApproval,
                  label: "Antrag genehmigt",
                  desc: "E-Mail wenn dein Antrag genehmigt wurde",
                },
                {
                  key: "notifyOnRejection",
                  value: notifyOnRejection,
                  setter: setNotifyOnRejection,
                  label: "Antrag abgelehnt",
                  desc: "E-Mail wenn dein Antrag abgelehnt wurde",
                },
                {
                  key: "notifyOnReminder",
                  value: notifyOnReminder,
                  setter: setNotifyOnReminder,
                  label: "Erinnerung",
                  desc: "E-Mail 3 Tage vor Urlaubsbeginn",
                },
              ].map(({ key, value, setter, label, desc }) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-base)" }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {desc}
                    </p>
                  </div>
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${value ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
                    onClick={() => setter(!value)}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-0.5"}`}
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Signature */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Shield size={16} className="text-[var(--primary)]" /> Meine
              Unterschrift
            </h2>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Lade deine digitale Unterschrift hoch (PNG/JPG, max. 500KB). Sie
              wird automatisch in Urlaubsanträgen verwendet.
            </p>
            <div className="flex items-start gap-4">
              {signaturePreview ? (
                <div
                  className="relative border rounded-xl p-3"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signaturePreview}
                    alt="Unterschrift"
                    className="h-16 max-w-[200px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setSignaturePreview(null)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => sigInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-40 h-16 border-2 border-dashed rounded-xl cursor-pointer hover:border-[var(--primary)] transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  {signatureUploading ? (
                    <Loader
                      size={16}
                      className="animate-spin"
                      style={{ color: "var(--primary)" }}
                    />
                  ) : (
                    <>
                      <Upload
                        size={14}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className="text-[10px] mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Unterschrift hochladen
                      </span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={sigInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 512 * 1024) {
                    alert("Max. 500KB erlaubt.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) =>
                    setSignaturePreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              <div
                className="text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                <p className="font-semibold mb-1">Anforderungen:</p>
                <ul className="space-y-0.5 list-disc ml-3">
                  <li>Format: PNG oder JPG</li>
                  <li>Max. Größe: 500 KB</li>
                  <li>Weißer oder transparenter Hintergrund</li>
                  <li>Querformat empfohlen</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary min-w-[160px] justify-center shadow-lg transform active:scale-95 transition-all text-sm font-black tracking-tight py-3"
            >
              {saving ? (
                <Loader size={16} className="animate-spin" />
              ) : saved ? (
                <CheckCircle size={16} />
              ) : null}
              {saved ? (locale === "en" ? "Saved!" : "Profil gespeichert!") : (locale === "en" ? "Save Settings" : "Einstellungen sichern")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
