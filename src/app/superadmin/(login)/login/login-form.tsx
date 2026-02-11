'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { loginAction } from '@/app/superadmin/actions';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from "@/lib/utils";

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Entrar
    </Button>
  );
}

export default function SuperAdminLoginForm({
  appName,
  appLogo,
  appLogoDark,
  appLogoSuperAdminDark,
  appLogoSuperAdminHeight,
  appLogoSuperAdminScale,
  appLogoSuperAdminPosition,
  appLogoSuperAdminOffsetX,
  appLogoSuperAdminOffsetY
}: {
  appName: string,
  appLogo: string,
  appLogoDark?: string,
  appLogoSuperAdminDark?: string,
  appLogoSuperAdminHeight?: string,
  appLogoSuperAdminScale?: string,
  appLogoSuperAdminPosition?: 'center' | 'left' | 'right',
  appLogoSuperAdminOffsetX?: number,
  appLogoSuperAdminOffsetY?: number
}) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <div className={cn(
          "flex items-center mb-6",
          appLogoSuperAdminPosition === 'left' ? 'justify-start' :
            appLogoSuperAdminPosition === 'right' ? 'justify-end' :
              'justify-center'
        )}>
          {appLogo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={appLogo}
                alt="Logo"
                style={{
                  height: `${appLogoSuperAdminHeight || '48'}px`,
                  transform: `scale(${appLogoSuperAdminScale || '1'}) translate(${appLogoSuperAdminOffsetX || 0}px, ${appLogoSuperAdminOffsetY || 0}px)`
                }}
                className={cn(
                  "w-auto object-contain transition-all duration-300",
                  (appLogoSuperAdminDark || appLogoDark) ? "dark:hidden" : ""
                )}
              />
              {(appLogoSuperAdminDark || appLogoDark) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={appLogoSuperAdminDark || appLogoDark}
                  alt="Logo Dark"
                  style={{
                    height: `${appLogoSuperAdminHeight || '48'}px`,
                    transform: `scale(${appLogoSuperAdminScale || '1'}) translate(${appLogoSuperAdminOffsetX || 0}px, ${appLogoSuperAdminOffsetY || 0}px)`
                  }}
                  className="w-auto object-contain transition-all duration-300 hidden dark:block"
                />
              )}
            </>
          ) : (
            <div className="bg-primary p-3 rounded-lg inline-flex">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
          )}
        </div>
        <CardTitle className="text-2xl">Acesso Super Admin</CardTitle>
        <CardDescription>
          {appName
            ? `Entre com suas credenciais de super administrador do ${appName}.`
            : 'Entre com suas credenciais de super administrador.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Login Falhou</AlertTitle>
            <AlertDescription>E-mail ou senha inválidos.</AlertDescription>
          </Alert>
        )}
        <form action={loginAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="admin@exemplo.com" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <LoginButton />
        </form>
      </CardContent>
    </Card>
  );
}
