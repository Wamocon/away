import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth- und API-Routen durchlassen
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
    return NextResponse.next({ request });
  }

  // Ohne Supabase-Konfiguration: alles durchlassen (lokaler Modus)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  // 1. Schema ermitteln (Logik analog zu src/lib/supabase/config.ts)
  let schema = 'away-dev';
  if (process.env.NEXT_PUBLIC_DB_SCHEMA) {
    schema = process.env.NEXT_PUBLIC_DB_SCHEMA;
  } else if (process.env.NEXT_PUBLIC_SCHEMA) {
    schema = process.env.NEXT_PUBLIC_SCHEMA;
  } else {
    const env = process.env.NEXT_PUBLIC_VERCEL_ENV || 'development';
    if (env === 'production') schema = 'away-prod';
    else if (env === 'preview') schema = 'away-test';
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
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions: {
        sameSite: 'none',
        secure: true,
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Nicht eingeloggt → zum Login
  if (!user) {
    if (pathname !== '/auth/login' && pathname !== '/auth/register' && pathname !== '/auth/accept-invite') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    return supabaseResponse;
  }

  // Admin-Check für /admin/ oder /dashboard/admin/
  if (pathname.startsWith('/admin/') || pathname.startsWith('/dashboard/admin/')) {
    try {
      // Wir prüfen, ob der User in IRGENDEINER Organisation Admin ist.
      // Hinweis: Für eine feingranulare Prüfung müsste die orgId aus dem Pfad/Cookie bekannt sein.
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      if (rolesError) {
        console.error('Middleware: DB Fehler beim Rollen-Check:', rolesError);
        // Bei einem DB-Fehler lassen wir den Request durch (Fallback)
        return supabaseResponse;
      }

      if (!roles || roles.length === 0) {
        console.warn('Middleware: Zugriff verweigert auf:', pathname, 'für User:', user.email);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (err) {
      console.error('Middleware: Unerwarteter Fehler im Admin-Check:', err);
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
    '/((?!api|_next/static|_next/image|favicon.ico|favicon.png|sitemap.xml|robots.txt|manifest.json|auth).*)',
  ],
};
