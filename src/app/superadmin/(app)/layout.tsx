
import { buttonVariants } from "@/components/ui/button";
import { ShieldCheck, Users, Globe, UserCog, LayoutDashboard, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/superadmin/logout-button";

import { getSystemConfig } from "@/lib/db";

export default async function SuperAdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getSystemConfig();

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground">
          {config.appLogo ? (
            <>
              <img
                src={config.appLogo}
                alt="Logo"
                className={cn("h-8 w-auto object-contain", config.appLogoDark && "dark:hidden")}
              />
              {config.appLogoDark && (
                <img
                  src={config.appLogoDark}
                  alt="Logo"
                  className="hidden h-8 w-auto object-contain dark:block"
                />
              )}
            </>
          ) : (
            <ShieldCheck className="h-6 w-6 text-primary" />
          )}
          <span>Super Admin{config.appName ? ` - ${config.appName}` : ''}</span>
        </div>
        <nav className="flex items-center gap-1 ml-8 text-sm font-medium">
          <Link href="/superadmin" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2 text-muted-foreground hover:text-foreground')}>
            <LayoutDashboard className="h-4 w-4" />
            Visão Geral
          </Link>
          <Link href="/superadmin/redes" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2 text-muted-foreground hover:text-foreground')}>
            <Globe className="h-4 w-4" />
            Gerenciar Redes
          </Link>
          <Link href="/superadmin/administradores" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2 text-muted-foreground hover:text-foreground')}>
            <Users className="h-4 w-4" />
            Administradores
          </Link>
          <Link href="/superadmin/whatsapp" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2 text-muted-foreground hover:text-foreground')}>
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </Link>
          <Link href="/superadmin/configuracoes" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2 text-muted-foreground hover:text-foreground')}>
            <UserCog className="h-4 w-4" />
            Configurações
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <LogoutButton />
        </div>
      </header>
      <main className="container mx-auto py-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </main>
    </div>
  );
}
