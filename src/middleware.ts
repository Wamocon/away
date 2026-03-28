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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  // Session auffrischen
  const { data: { user } } = await supabase.auth.getUser();

  // Nicht eingeloggt → zum Login
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth|api).*)'],
};
