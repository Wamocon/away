'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/ui/ThemeProvider';
import {
  LayoutDashboard,
  CalendarDays,
  Settings,
  X,
  Sun,
  Moon,
  Building2,
  Mail,
} from 'lucide-react';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: '/dashboard/calendar', icon: CalendarDays, label: 'Kalender', exact: true },
    { href: '/dashboard/organizations', icon: Building2, label: 'Organisationen', exact: false },
    { href: '/dashboard/email', icon: Mail, label: 'E-Mail', exact: true },
    { href: '/settings', icon: Settings, label: 'Einstellungen', exact: true },
  ];

  return (
    <>
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Navigation */}
        <nav className="p-3 flex flex-col gap-0.5">
          <div className="text-[9px] font-bold uppercase tracking-widest px-2 pt-3 pb-1.5 text-black/30 dark:text-white/20">
            Navigation
          </div>
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium no-underline transition-all duration-150 ${
                  active
                    ? 'bg-blue-500/12 border border-blue-500/20'
                    : 'dark:text-white/45 dark:hover:text-white/80 dark:hover:bg-white/[0.05] text-gray-600 hover:text-gray-900 hover:bg-black/[0.05]'
                }`}
                style={
                  active
                    ? {
                        boxShadow: '0 0 12px rgba(59,130,246,0.08)',
                        color: theme === 'dark' ? 'rgba(255,255,255,0.9)' : '#374151',
                      }
                    : {}
                }
              >
                <item.icon size={14} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-black/[0.05] dark:border-white/[0.04] flex flex-col gap-0.5">
        {/* Theme-Umschalter */}
        <div className="mb-2 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] flex">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              theme === 'light'
                ? 'bg-white text-blue-500 shadow-sm'
                : 'text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/55'
            }`}
          >
            <Sun size={11} />
            <span>Hell</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-white/[0.12] text-blue-500'
                : 'text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/55'
            }`}
          >
            <Moon size={11} />
            <span>Dunkel</span>
          </button>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { theme } = useTheme();

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 border-r sidebar-scroll"
        style={{
          background: theme === 'dark' ? 'rgba(8,10,20,0.9)' : 'rgba(248,250,252,0.95)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(12px)',
        }}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex flex-col w-72 md:hidden"
            style={{
              background: theme === 'dark' ? 'rgba(8,10,20,0.98)' : '#ffffff',
              backdropFilter: 'blur(16px)',
            }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.07] dark:border-white/[0.06] shrink-0">
              <span className="text-[9px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest">
                Navigation
              </span>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 dark:text-white/40 dark:hover:text-white bg-transparent border-none cursor-pointer p-1 rounded transition-colors"
                aria-label="Menü schließen"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent onNavigate={onClose} />
          </aside>
        </>
      )}
    </>
  );
}
