import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { ViewModeProvider } from '@/components/ui/ViewModeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Away – Moderne Urlaubsplanung',
  description: 'Effiziente Urlaubsplanung für Teams – Anträge, Genehmigungen, Kalender',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
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
