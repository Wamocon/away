import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSchema } from './config';

export async function createClient() {
  const cookieStore = await cookies();
  const schema = getSchema();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* In Server Components ignorieren */ }
        },
      },
    }
  );
}
