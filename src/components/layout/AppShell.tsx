'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith('/auth/');

  if (isAuthPage) return <>{children}</>;

  return (
    <>
      <Header onMenuToggle={() => setMobileMenuOpen((o) => !o)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <main className="flex-1 overflow-auto main-content">{children}</main>
      </div>
    </>
  );
}
