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
  const user = await getAuthenticatedUser();

  // Default to system favicon or logo
  let iconUrl = config.appFavicon || config.appLogo;

  if (user?.redeId) {
    // Priority: user.redeId exists, but we removed network specific logos. 
    // So we just use system config. 
    // The previous logic for customized logos per network is removed.
    // We can keep the block if we plan to add other network specific metadata later, 
    // but for now, the iconUrl is decided by config.
  }

  return {
    title: config.appName || 'Gestão Financeira e CRM',
    description: 'Sistema de gestão financeira e dashboards analíticos',
    icons: iconUrl ? { icon: iconUrl } : undefined
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
