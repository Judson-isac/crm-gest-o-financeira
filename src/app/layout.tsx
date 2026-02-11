import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

// Force all routes to be dynamic (no static generation during build)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';

import { getSystemConfig, getRedeById } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSystemConfig();

  // Theme-aware icons
  const lightIcon = config.appFavicon || config.appLogo;
  const darkIcon = config.appFaviconDark || config.appLogoDark || lightIcon;

  return {
    title: config.appName || 'Gestão Financeira e CRM',
    description: 'Sistema de gestão financeira e dashboards analíticos',
    icons: lightIcon ? {
      icon: [
        { url: lightIcon, media: '(prefers-color-scheme: light)' },
        { url: darkIcon, media: '(prefers-color-scheme: dark)' },
      ],
      apple: lightIcon,
    } : undefined
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body bg-background text-foreground antialiased min-h-screen')}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
