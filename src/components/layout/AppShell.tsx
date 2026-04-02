'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationCenter } from './NotificationCenter';
import { useLanguage } from '@/components/ui/LanguageProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { locale, setLocale } = useLanguage();

  const isAuthPage = pathname.startsWith('/auth/');

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isAuthPage) return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="app-layout min-h-screen flex flex-col">
      <div className="flex flex-1 relative">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          onMobileToggle={() => setMobileMenuOpen(o => !o)}
        />

        <div className="main-with-sidebar flex-1 flex flex-col min-w-0">
          {/* Top bar: Breadcrumbs left, Language + NotificationCenter right */}
          <div
            className="shrink-0 flex items-center justify-between border-b px-4"
            style={{ borderColor: 'var(--border)', minHeight: '40px' }}
          >
            <Breadcrumbs />
            <div className="shrink-0 pl-2 flex items-center gap-1">
              {/* Language Switcher */}
              <div className="flex items-center rounded-lg overflow-hidden border text-[10px] font-black" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setLocale('de')}
                  className={`px-2 py-1 transition-colors ${locale === 'de' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--bg-elevated)]'}`}
                  style={{ color: locale === 'de' ? 'white' : 'var(--text-muted)' }}
                  title="Deutsch"
                >
                  DE
                </button>
                <button
                  onClick={() => setLocale('en')}
                  className={`px-2 py-1 transition-colors ${locale === 'en' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--bg-elevated)]'}`}
                  style={{ color: locale === 'en' ? 'white' : 'var(--text-muted)' }}
                  title="English"
                >
                  EN
                </button>
              </div>
              <NotificationCenter />
            </div>
          </div>
          <main className="main-content flex-1">
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
