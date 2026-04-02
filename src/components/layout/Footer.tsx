import { LegalLinks } from "../legal/LegalLinks";
import { DevelopedInGermanyBadge } from "../legal/DevelopedInGermanyBadge";

export function Footer() {
  return (
    <footer className="mt-auto py-12 px-6 border-t border-[var(--border)] bg-[var(--bg-base)]">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-[var(--text-base)]">
            AWAY – MODERNE URLAUBSPLANNER
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-50 font-black">
            Professionelles Urlaubsmanagement &copy; {new Date().getFullYear()}{" "}
            WAMOCON GmbH
          </span>
        </div>

        <LegalLinks
          variant="inline"
          className="opacity-80 hover:opacity-100 transition-opacity"
        />

        <div className="scale-90 origin-center -mt-4">
          <DevelopedInGermanyBadge />
        </div>
      </div>
    </footer>
  );
}
