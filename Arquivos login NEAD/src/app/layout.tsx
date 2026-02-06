"use client";

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';


// Metadata precisa ser exportada de um componente de servidor ou de um arquivo somente de servidor.
// Como estamos convertendo isso em um componente de cliente, não podemos exportá-lo daqui.
// No entanto, para este aplicativo, podemos mantê-lo simples e defini-lo estaticamente.
// export const metadata: Metadata = {
//   title: 'Leitor de Requisição',
//   description: 'Um aplicativo para buscar e exibir HTML de uma URL.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('mobile_mode');
    } else {
      document.body.classList.remove('mobile_mode');
    }
  }, [isMobile]);

  return (
    <html lang="pt-BR">
      <head>
        <title>Leitor de Requisição</title>
        <meta name="description" content="Um aplicativo para buscar e exibir HTML de uma URL." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn("font-body antialiased", { 'mobile_mode': isMobile })}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

    