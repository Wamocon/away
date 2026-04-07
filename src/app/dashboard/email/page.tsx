"use client";
import { useState, useEffect } from "react";
import {
  Mail,
  CheckCircle,
  AlertCircle,
  Loader,
  LayoutGrid,
  List,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveUserSettings, getUserSettings } from "@/lib/userSettings";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { useViewMode } from "@/components/ui/ViewModeProvider";
import { useLanguage } from "@/components/ui/LanguageProvider";

type Provider = "google" | "microsoft" | null;

export default function EmailPage() {
  const { viewMode, setViewMode } = useViewMode();
  const { t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [connectedProvider, setConnectedProvider] = useState<Provider>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [orgId, setOrgId] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) return;
        setUserId(data.user.id);

        if (orgId) {
          getUserSettings(data.user.id, orgId)
            .then((settings) => {
              if (settings?.email) {
                setEmailInput(settings.email);
              } else {
                setEmailInput("");
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [orgId]);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !orgId) return;
    setSaving(true);
    try {
      await saveUserSettings(userId, orgId, emailInput);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = (provider: Provider) => {
    setConnectedProvider(provider);
  };

  return (
    <div className="p-6 w-full animate-fade-in space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1
            className="text-2xl font-black tracking-tight flex items-center gap-2"
            style={{ color: "var(--text-base)" }}
          >
            <Mail size={22} style={{ color: "var(--primary)" }} /> E-Mail
            Integration
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Verbinde dein E-Mail-Postfach um Urlaubsanträge direkt zu versenden.
          </p>
        </div>
        <div
          className="flex items-center bg-[var(--bg-elevated)] p-1 rounded-xl border"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
            title={t.view.listView}
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-gray-800 shadow-sm text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-base)]"}`}
            title={t.view.gridView}
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Email address settings */}
          <section className="card p-5">
            <h2
              className="text-sm font-bold mb-4 flex items-center gap-2"
              style={{ color: "var(--text-base)" }}
            >
              <Mail size={16} style={{ color: "var(--primary)" }} />{" "}
              Benachrichtigungs-E-Mail
            </h2>
            <form onSubmit={handleSaveEmail} className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="deine@email.de"
                className="flex-1 rounded-lg border px-3 py-2.5 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-base)",
                }}
                required
              />
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? (
                  <Loader size={14} className="animate-spin" />
                ) : saved ? (
                  <CheckCircle size={14} />
                ) : null}
                {saved ? "Gespeichert" : "Speichern"}
              </button>
            </form>
          </section>

          {/* OAuth Provider connection */}
          <section className="card p-5">
            <h2
              className="text-sm font-bold mb-4 flex items-center gap-2"
              style={{ color: "var(--text-base)" }}
            >
              <CheckCircle size={16} style={{ color: "var(--primary)" }} />{" "}
              Postfach verbinden
            </h2>

            <div
              className={
                viewMode === "list"
                  ? "space-y-3"
                  : "grid grid-cols-1 md:grid-cols-2 gap-4"
              }
            >
              {/* Google */}
              <div
                className="flex flex-col gap-3 p-4 rounded-xl border transition-all hover:border-[var(--primary)]"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
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
                    <div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: "var(--text-base)" }}
                      >
                        Google Gmail
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        OAuth2 Integration
                      </p>
                    </div>
                  </div>
                  {connectedProvider === "google" && (
                    <CheckCircle size={14} className="text-[var(--success)]" />
                  )}
                </div>
                {connectedProvider === "google" ? (
                  <div className="text-[10px] font-bold text-[var(--success)]">
                    Verbunden
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect("google")}
                    className="btn-secondary py-1 text-xs w-full justify-center"
                  >
                    Verbinden
                  </button>
                )}
              </div>

              {/* Microsoft */}
              <div
                className="flex flex-col gap-3 p-4 rounded-xl border transition-all hover:border-[var(--primary)]"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <rect width="24" height="24" rx="4" fill="#0078d4" />
                        <text
                          x="5"
                          y="17"
                          fontSize="14"
                          fill="white"
                          fontWeight="bold"
                        >
                          O
                        </text>
                      </svg>
                    </div>
                    <div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: "var(--text-base)" }}
                      >
                        Microsoft Outlook
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Microsoft Graph API
                      </p>
                    </div>
                  </div>
                  {connectedProvider === "microsoft" && (
                    <CheckCircle size={14} className="text-[var(--success)]" />
                  )}
                </div>
                {connectedProvider === "microsoft" ? (
                  <div className="text-[10px] font-bold text-[var(--success)]">
                    Verbunden
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect("microsoft")}
                    className="btn-secondary py-1 text-xs w-full justify-center"
                  >
                    Verbinden
                  </button>
                )}
              </div>
            </div>

            <div
              className="mt-6 p-4 rounded-xl bg-[var(--info-light)] border"
              style={{ borderColor: "rgba(59,130,246,0.1)" }}
            >
              <div className="flex items-start gap-3 text-blue-500">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold mb-1">
                    Hinweis zur Einrichtung
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-80">
                    Für den produktiven Betrieb müssen in{" "}
                    <strong>Azure AD</strong> bzw.{" "}
                    <strong>Google Cloud Console</strong> OAuth-Apps registriert
                    werden. Die Redirect-URI lautet:{" "}
                    <code className="bg-white/50 px-1 rounded">
                      /api/oauth/callback
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {userId && (
            <section className="card p-5">
              <h2
                className="text-sm font-bold mb-4"
                style={{ color: "var(--text-base)" }}
              >
                Organisation
              </h2>
              <OrganizationSwitcher
                userId={userId}
                onOrgChange={(id) => setOrgId(id)}
              />
            </section>
          )}

          <div className="card p-5">
            <h2
              className="text-sm font-bold mb-2"
              style={{ color: "var(--text-base)" }}
            >
              Warum verbinden?
            </h2>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Durch die Verbindung deines Postfaches können Urlaubsanträge
              direkt als E-Mail an deine Genehmiger versendet werden. Dies
              stellt sicher, dass Anträge zeitnah bearbeitet werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
