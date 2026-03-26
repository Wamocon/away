'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUser({ email: data.user.email ?? '' });
          router.push('/dashboard');
        } else {
          router.push('/auth/login');
        }
      });
    } catch {
      router.push('/auth/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center mx-auto mb-3">
          <Plane size={22} className="text-white" />
        </div>
        <p className="text-sm dark:text-white/40 text-gray-400">Weiterleiten...</p>
      </div>
    </div>
  );
}
