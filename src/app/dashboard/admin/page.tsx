'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/settings');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Leite weiter zur Administration...
      </div>
    </div>
  );
}
