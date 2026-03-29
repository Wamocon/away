"use client";

import Link from "next/link";
import { type LegalConsentState } from "@/lib/legal/consent";

interface LegalConsentFieldsProps {
  value: LegalConsentState;
  onChange: (next: LegalConsentState) => void;
  disabled?: boolean;
}

export function LegalConsentFields({
  value,
  onChange,
  disabled = false,
}: LegalConsentFieldsProps) {
  function update<K extends keyof LegalConsentState>(key: K, checked: boolean) {
    onChange({ ...value, [key]: checked });
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-sm shadow-sm transition-all hover:shadow-md">
      <p className="mb-4 font-bold text-[var(--text-base)] flex items-center gap-2">
        <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full" />
        Rechtliche Zustimmung
      </p>
      <div className="space-y-4 text-[var(--text-muted)]">
        <label className="group flex items-start gap-3 cursor-pointer">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={value.termsAccepted}
              onChange={(e) => update("termsAccepted", e.target.checked)}
              disabled={disabled}
              className="peer h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] transition-all cursor-pointer accent-[var(--primary)]"
            />
          </div>
          <span className="leading-tight group-hover:text-[var(--text-base)] transition-colors">
            Ich akzeptiere die {" "}
            <Link href="/legal/agb" className="font-semibold text-[var(--primary)] hover:underline decoration-2 underline-offset-4">
              AGB
            </Link>
            .
          </span>
        </label>

        <label className="group flex items-start gap-3 cursor-pointer">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={value.privacyAccepted}
              onChange={(e) => update("privacyAccepted", e.target.checked)}
              disabled={disabled}
              className="peer h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] transition-all cursor-pointer accent-[var(--primary)]"
            />
          </div>
          <span className="leading-tight group-hover:text-[var(--text-base)] transition-colors">
            Ich akzeptiere die {" "}
            <Link href="/legal/datenschutz" className="font-semibold text-[var(--primary)] hover:underline decoration-2 underline-offset-4">
               Datenschutzerklärung
            </Link>
            .
          </span>
        </label>

        <label className="group flex items-start gap-3 cursor-pointer">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={value.dsgvoAccepted}
              onChange={(e) => update("dsgvoAccepted", e.target.checked)}
              disabled={disabled}
              className="peer h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] transition-all cursor-pointer accent-[var(--primary)]"
            />
          </div>
          <span className="leading-tight group-hover:text-[var(--text-base)] transition-colors">
            Ich willige in die Verarbeitung meiner personenbezogenen Daten gemäß DSGVO ein, um die Dienste von AWAY nutzen zu können.
          </span>
        </label>
      </div>
    </div>
  );
}
