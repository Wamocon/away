"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: string;
  target?: string; // CSS selector for highlight (optional)
}

const LITE_STEPS: TourStep[] = [
  {
    title: "Willkommen bei Away",
    description:
      "Away ist deine digitale Urlaubsplanung. In wenigen Schritten zeigen wir dir die wichtigsten Funktionen.",
    icon: "✦",
  },
  {
    title: "Dashboard",
    description:
      "Auf dem Dashboard siehst du alle offenen Anträge, dein verbleibendes Urlaubsbudget und aktuelle Team-Abwesenheiten auf einen Blick.",
    icon: "📊",
    target: '[href="/dashboard"]',
  },
  {
    title: "Neuen Antrag stellen",
    description:
      'Klicke auf "Neuer Antrag" im Dashboard. Wähle Start- und Enddatum, traga optional einen Grund ein und sende den Antrag ab. Der Genehmiger wird automatisch informiert.',
    icon: "📝",
  },
  {
    title: "Meine Anträge",
    description:
      'Unter "Meine Anträge" siehst du den aktuellen Status aller deiner Urlaubsanfragen: ausstehend, genehmigt oder abgelehnt.',
    icon: "📋",
    target: '[href="/dashboard/requests"]',
  },
  {
    title: "Profil-Einstellungen",
    description:
      "Hier kannst du deinen Vor- und Nachnamen, dein Urlaubskontingent, deinen Vertreter und Benachrichtigungseinstellungen anpassen.",
    icon: "⚙️",
    target: '[href="/settings"]',
  },
];

const PRO_EXTRA_STEPS: TourStep[] = [
  {
    title: "E-Mail-Integration",
    description:
      "Als Pro-Nutzer kannst du Outlook oder Google OAuth verbinden. Anträge werden dann direkt per E-Mail versendet – kein manuelles Kopieren mehr.",
    icon: "📧",
  },
  {
    title: "Kalender-Sync",
    description:
      "Synchronisiere deinen Outlook- oder Google-Kalender. Genehmigte Urlaube erscheinen automatisch als Termine.",
    icon: "📅",
    target: '[href="/dashboard/calendar"]',
  },
  {
    title: "Reports & Analytics",
    description:
      "Im Reports-Bereich (Pro-Feature) kannst du Auswertungen über Urlaubsquoten, Genehmigungszeiten und Abwesenheitsstatistiken abrufen.",
    icon: "📈",
    target: '[href="/dashboard/reports"]',
  },
];

interface ProductTourProps {
  planTier: "lite" | "pro";
  onComplete: () => void;
  onSkip: () => void;
}

export default function ProductTour({
  planTier,
  onComplete,
  onSkip,
}: ProductTourProps) {
  const steps = useMemo(
    () =>
      planTier === "pro"
        ? [...LITE_STEPS, ...PRO_EXTRA_STEPS]
        : LITE_STEPS,
    [planTier],
  );

  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  const highlight = useCallback(() => {
    // Remove previous highlight
    document
      .querySelectorAll("[data-tour-highlight]")
      .forEach((el) => el.removeAttribute("data-tour-highlight"));

    const target = steps[step]?.target;
    if (target) {
      const el = document.querySelector(target);
      if (el) {
        el.setAttribute("data-tour-highlight", "true");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [step, steps]);

  useEffect(() => {
    highlight();
    return () => {
      document
        .querySelectorAll("[data-tour-highlight]")
        .forEach((el) => el.removeAttribute("data-tour-highlight"));
    };
  }, [highlight]);

  const finishTour = (complete: boolean) => {
    setExiting(true);
    setTimeout(() => {
      if (complete) onComplete();
      else onSkip();
    }, 250);
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
        onClick={() => finishTour(false)}
      />

      {/* Tour Card */}
      <div
        className={`fixed z-[901] bottom-8 right-8 w-full max-w-sm transition-all duration-300 ${exiting ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Interaktiver Produktguide"
      >
        <div
          className="rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            borderColor: "rgba(59,130,246,0.3)",
          }}
        >
          {/* Progress bar */}
          <div className="h-1 w-full" style={{ background: "var(--border)" }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: "var(--primary)",
              }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: "var(--primary)" }} />
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: "var(--primary)" }}
              >
                Interaktiver Guide
              </span>
            </div>
            <button
              onClick={() => finishTour(false)}
              className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Tour schließen"
            >
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pb-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5" aria-hidden="true">
                {current.icon}
              </span>
              <div>
                <h3
                  className="font-black text-base leading-snug"
                  style={{ color: "var(--text)" }}
                >
                  {current.title}
                </h3>
                <p
                  className="text-sm mt-1 leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {current.description}
                </p>
              </div>
            </div>

            {/* Step counter */}
            <div className="flex items-center justify-between">
              <span
                className="text-[11px]"
                style={{ color: "var(--text-dim)" }}
              >
                Schritt {step + 1} von {steps.length}
              </span>
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                    style={{
                      background:
                        i === step
                          ? "var(--primary)"
                          : i < step
                            ? "rgba(59,130,246,0.4)"
                            : "var(--border)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-muted)",
                  }}
                >
                  <ChevronLeft size={13} />
                  Zurück
                </button>
              )}
              <button
                onClick={() => {
                  if (isLast) {
                    finishTour(true);
                  } else {
                    setStep((s) => s + 1);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all flex-1 justify-center"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                }}
              >
                {isLast ? (
                  <>
                    <Check size={13} />
                    Tour abschließen
                  </>
                ) : (
                  <>
                    Weiter
                    <ChevronRight size={13} />
                  </>
                )}
              </button>
            </div>

            {/* Skip link */}
            {!isLast && (
              <button
                onClick={() => finishTour(false)}
                className="w-full text-center text-[11px] transition-opacity opacity-50 hover:opacity-100 pt-0.5"
                style={{ color: "var(--text-dim)" }}
              >
                Tour überspringen
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        [data-tour-highlight] {
          outline: 2px solid var(--primary, #3b82f6) !important;
          outline-offset: 3px;
          border-radius: 8px;
        }
      `}</style>
    </>
  );
}
