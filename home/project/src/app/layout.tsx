import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'VirtuaFinance CRM',
  description: 'Gestão financeira e dashboards analíticos para VirtuaCRM',
};

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
        <div
          className="fixed inset-0 -z-10 h-full w-full"
          style={{
            backgroundImage: `url('data:image/svg+xml,<svg width="30" height="30" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dottedGrid" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.08)" /></pattern></defs><rect width="100%" height="100%" fill="url(%23dottedGrid)" /></svg>')`,
          }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
