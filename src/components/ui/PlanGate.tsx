"use client";
import { type ReactNode } from "react";
import { useSubscription } from "@/components/ui/SubscriptionProvider";
import type { FeatureKey } from "@/lib/subscription";
import { useRouter } from "next/navigation";
import { Lock, Zap } from "lucide-react";

interface PlanGateProps {
  /** Feature key to check. Children render when the feature is available. */
  feature: FeatureKey;
  children: ReactNode;
  /**
   * Optional custom fallback. Defaults to the upgrade-hint card.
   * Pass `null` to render nothing when feature is unavailable.
   */
  fallback?: ReactNode | null;
  /** When true, renders an inline badge instead of a full card. */
  inline?: boolean;
}

function DefaultFallback({ inline }: { inline?: boolean }) {
  const router = useRouter();

  if (inline) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => router.push("/settings/subscription?upgrade=1")}
        onKeyDown={(e) => {
          if (e.key === "Enter") router.push("/settings/subscription?upgrade=1");
        }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 cursor-pointer hover:bg-amber-500/25 transition-colors select-none"
      >
        <Zap size={9} />
        Pro
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] p-6 flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
        <Lock size={18} className="text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-black text-[var(--text-base)]">
          Pro-Funktion
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Diese Funktion ist im Pro-Plan verfügbar.
        </p>
      </div>
      <button
        onClick={() => router.push("/settings/subscription?upgrade=1")}
        className="mt-1 rounded-xl bg-amber-500 text-black font-black text-xs px-4 py-2 hover:bg-amber-400 transition-colors flex items-center gap-1.5"
      >
        <Zap size={12} />
        Auf Pro upgraden
      </button>
    </div>
  );
}

/**
 * PlanGate – renders children when the current subscription includes `feature`.
 * Renders a fallback (upgrade hint) otherwise.
 *
 * @example
 * <PlanGate feature="reports">
 *   <ReportsPage />
 * </PlanGate>
 */
export function PlanGate({ feature, children, fallback, inline }: PlanGateProps) {
  const { hasFeature, loading } = useSubscription();

  // While loading: render children silently (fail-open)
  if (loading) return <>{children}</>;

  if (hasFeature(feature)) return <>{children}</>;

  // fallback=null means render nothing
  if (fallback === null) return null;

  return <>{fallback ?? <DefaultFallback inline={inline} />}</>;
}
