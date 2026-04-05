"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  requests: "Anträge",
  calendar: "Kalender",
  reports: "Berichte",
  organizations: "Organisationen",
  settings: "Einstellungen",
  admin: "Administration",
  email: "E-Mail",
  invite: "Einladung",
  legal: "Rechtliches",
  agb: "AGB",
  datenschutz: "Datenschutz",
  impressum: "Impressum",
  imprint: "Impressum",
  privacy: "Datenschutz",
  terms: "AGB",
  faq: "FAQ",
  help: "Hilfe",
};

function getLabel(segment: string): string {
  // UUIDs or IDs – show as "Antrag"
  if (/^[0-9a-f-]{8,}$/i.test(segment)) return "Details";
  return (
    ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();

  // Don't show on root, auth, or top-level pages
  if (!pathname || pathname === "/" || pathname.startsWith("/auth"))
    return null;

  const segments = pathname.split("/").filter(Boolean);

  // Build crumb list
  const crumbs = segments.map((seg, i) => ({
    label: getLabel(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 px-6 py-2 text-xs select-none"
      style={{ color: "var(--text-muted)" }}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[var(--bg-elevated)]"
        style={{ color: "var(--text-muted)" }}
        title="Dashboard"
      >
        <Home size={11} />
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight size={11} style={{ color: "var(--text-subtle)" }} />
          {crumb.isLast ? (
            <span
              className="font-semibold"
              style={{ color: "var(--text-base)" }}
            >
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-[var(--bg-elevated)]"
              style={{ color: "var(--text-muted)" }}
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
