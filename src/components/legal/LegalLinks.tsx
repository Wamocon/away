"use client";

import Link from "next/link";
import { FileText, ReceiptText, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LegalLinksProps {
  className?: string;
  variant?: "inline" | "cards";
}

export const LEGAL_LINK_ITEMS = [
  { href: "/legal/impressum", label: "Impressum", icon: FileText },
  { href: "/legal/datenschutz", label: "Datenschutz", icon: Shield },
  { href: "/legal/agb", label: "AGB", icon: ReceiptText },
] as const;

export function LegalLinks({ className, variant = "inline" }: LegalLinksProps) {
  if (variant === "cards") {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
        {LEGAL_LINK_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 text-sm font-bold transition-all hover:bg-[var(--bg-elevated)] hover:border-[var(--primary)] hover:shadow-lg group"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--primary-light)] bg-[var(--primary-light-soft)] text-[var(--primary)] group-hover:scale-110 transition-transform">
              <item.icon size={20} />
            </span>
            <span className="text-[var(--text-base)]">{item.label}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-6 gap-y-3", className)}>
      {LEGAL_LINK_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors uppercase tracking-widest flex items-center gap-2"
        >
          <item.icon size={12} />
          {item.label}
        </Link>
      ))}
    </div>
  );
}
