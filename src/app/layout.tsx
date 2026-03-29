import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { ViewModeProvider } from '@/components/ui/ViewModeProvider';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AWAY – MODERNE URLAUBSPLANNER',
  description: 'EFFIZIENTE URLAUBSPLANUNG FÜR TEAMS – ANTRÄGE, GENEHMIGUNGEN, KALENDER',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' }
    ],
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning className={inter.variable}>
      <head />
      <body className="min-h-screen" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' }}>
        <ThemeProvider>
          <ViewModeProvider>
            <AppShell>
              {children}
            </AppShell>
          </ViewModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
