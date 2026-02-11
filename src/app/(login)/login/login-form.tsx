'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Loader2, AlertTriangle } from 'lucide-react';
import { loginAction } from '@/app/auth-actions';
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

export default function LoginForm({
  appName,
  appLogo,
  appLogoDark,
  appLogoLoginDark,
  appLogoLoginHeight,
  appLogoLoginScale,
  appLogoLoginPosition,
  appLogoLoginOffsetX,
  appLogoLoginOffsetY
}: {
  appName: string,
  appLogo: string,
  appLogoDark?: string,
  appLogoLoginDark?: string,
  appLogoLoginHeight?: string,
  appLogoLoginScale?: string,
  appLogoLoginPosition?: 'center' | 'left' | 'right',
  appLogoLoginOffsetX?: number,
  appLogoLoginOffsetY?: number
}) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = () => {
    if (error === 'InvalidCredentials') {
      return { title: 'Erro de Login', description: 'E-mail ou senha inválidos.' };
    }
    if (error === 'NoPermissions') {
      return { title: 'Acesso Negado', description: 'Você não tem permissão para acessar o sistema.' };
    }
    return null;
  };

  const errorMessage = getErrorMessage();

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <div className={cn(
          "flex items-center mb-6",
          appLogoLoginPosition === 'left' ? 'justify-start' :
            appLogoLoginPosition === 'right' ? 'justify-end' :
              'justify-center'
        )}>
          {appLogo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={appLogo}
                alt="Logo"
                style={{
                  height: `${appLogoLoginHeight || '48'}px`,
                  transform: `scale(${appLogoLoginScale || '1'}) translate(${appLogoLoginOffsetX || 0}px, ${appLogoLoginOffsetY || 0}px)`
                }}
                className={cn(
                  "w-auto max-w-full object-contain transition-all duration-300",
                  (appLogoLoginDark || appLogoDark) ? "dark:hidden" : ""
                )}
              />
              {(appLogoLoginDark || appLogoDark) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={appLogoLoginDark || appLogoDark}
                  alt="Logo Dark"
                  style={{
                    height: `${appLogoLoginHeight || '48'}px`,
                    transform: `scale(${appLogoLoginScale || '1'}) translate(${appLogoLoginOffsetX || 0}px, ${appLogoLoginOffsetY || 0}px)`
                  }}
                  className="w-auto max-w-full object-contain transition-all duration-300 hidden dark:block"
                />
              )}
            </>
          ) : (
            <div className="bg-primary p-3 rounded-lg inline-flex">
              <Key className="h-8 w-8 text-primary-foreground" />
            </div>
          )}
        </div>
        <CardTitle className="text-2xl">{appName || 'Bem-vindo'}</CardTitle>
        <CardDescription>
          Acesse sua conta para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{errorMessage.title}</AlertTitle>
            <AlertDescription>{errorMessage.description}</AlertDescription>
          </Alert>
        )}
        <form action={loginAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="usuario@exemplo.com" required />
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
