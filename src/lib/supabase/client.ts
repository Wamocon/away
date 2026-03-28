import { createBrowserClient } from '@supabase/ssr';
import { getSchema } from './config';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const schema = getSchema();
  if (!url || !key) {
    throw new Error('Supabase ist nicht konfiguriert. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local setzen.');
  }
  return createBrowserClient(url, key, { db: { schema } });
}
