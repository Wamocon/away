import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPlanActive, PRO_ONLY_ROUTES } from "@/lib/subscription";
import type { Subscription } from "@/lib/subscription";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth- und API-Routen durchlassen
  if (pathname.startsWith("/auth/") || pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  // Ohne Supabase-Konfiguration: alles durchlassen (lokaler Modus)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  // 1. Schema ermitteln (Logik analog zu src/lib/supabase/config.ts)
  let schema = "away-dev";
  if (process.env.NEXT_PUBLIC_DB_SCHEMA) {
    schema = process.env.NEXT_PUBLIC_DB_SCHEMA;
  } else if (process.env.NEXT_PUBLIC_SCHEMA) {
    schema = process.env.NEXT_PUBLIC_SCHEMA;
  } else {
    const env = process.env.NEXT_PUBLIC_VERCEL_ENV || "development";
    if (env === "production") schema = "away-prod";
    else if (env === "preview") schema = "away-test";
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema }, // Wichtig für AWAY Multi-Schema Setup
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>,
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
      cookieOptions: {
        sameSite: "none",
        secure: true,
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nicht eingeloggt → zum Login
  if (!user) {
    if (
      pathname !== "/auth/login" &&
      pathname !== "/auth/register" &&
      pathname !== "/auth/accept-invite"
    ) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return supabaseResponse;
  }

  // ── Super-Admin-Check ─────────────────────────────────────────────────────
  // Lazy ausgeführt: nur wenn ein Check den Zugang verweigern würde.
  // Vermeidet unnötige DB-Abfragen für normale Nutzer.
  const checkIsSuperAdmin = async (): Promise<boolean> => {
    try {
      const pubClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          db: { schema: "public" },
          cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: () => {},
          },
        },
      );
      const { data } = await pubClient
        .from("super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data !== null;
    } catch {
      return false;
    }
  };

  // ── Subscription-Check ─────────────────────────────────────────────────────
  // Routen die immer erreichbar sein sollen (auch ohne aktives Abo)
  const subscriptionFreeRoutes = [
    "/settings/subscription",
    "/legal",
    "/auth",
    "/admin", // Super-Admin-Routen sollen nie durch Abo geblockt werden
  ];
  const isSubscriptionFreeRoute = subscriptionFreeRoutes.some((r) =>
    pathname.startsWith(r),
  );

  if (!isSubscriptionFreeRoute) {
    try {
      // Aktive Org des Users holen (erste gefundene Org)
      const { data: userRoleRow } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const orgId = userRoleRow?.organization_id;

      if (orgId) {
        const { data: subData } = await supabase
          .from("subscriptions")
          .select(
            `id, organization_id, plan_id, status,
             trial_start, trial_end, grace_end,
             activated_by, order_requested_at, created_at,
             plan:subscription_plans (id, name, max_users, features, price_monthly)`,
          )
          .eq("organization_id", orgId)
          .maybeSingle();

        const sub = subData as Subscription | null;
        const active = isPlanActive(sub);

        // Kein aktives Abo → nur Abo-Seite erlaubt (Super-Admin ausgenommen)
        if (!active) {
          if (await checkIsSuperAdmin()) return supabaseResponse;
          return NextResponse.redirect(
            new URL("/settings/subscription", request.url),
          );
        }

        // Pro-only-Routen: Lite-User blockieren
        const isPro = sub?.plan?.name === "pro";
        const isProOnlyRoute = PRO_ONLY_ROUTES.some((r) =>
          pathname.startsWith(r),
        );
        if (isProOnlyRoute && !isPro) {
          const redirectUrl = new URL("/settings/subscription", request.url);
          redirectUrl.searchParams.set("upgrade", "1");
          return NextResponse.redirect(redirectUrl);
        }
      }
    } catch {
      // Subscription-Check darf niemals den Zugang blockieren (fail-open)
    }
  }

  // Admin-Check für /admin/ oder /dashboard/admin/
  if (
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/dashboard/admin/")
  ) {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "cio"]); // CIO hat ebenfalls Zugriff

      if (rolesError) {
        console.error("Middleware: DB Fehler beim Rollen-Check:", rolesError);
        return supabaseResponse;
      }

      if (!roles || roles.length === 0) {
        if (await checkIsSuperAdmin()) return supabaseResponse;
        console.warn(
          "Middleware: Zugriff verweigert auf:",
          pathname,
          "für User:",
          user.email,
        );
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (err) {
      console.error("Middleware: Unerwarteter Fehler im Admin-Check:", err);
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.png, sitemap.xml, robots.txt, manifest.json (static assets)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.png|sitemap.xml|robots.txt|manifest.json|auth).*)",
  ],
};
