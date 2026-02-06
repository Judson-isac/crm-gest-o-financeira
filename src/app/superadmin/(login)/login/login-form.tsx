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

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Entrar
    </Button>
  );
}

export default function SuperAdminLoginForm({ appName, appLogo }: { appName: string, appLogo: string }) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="inline-flex items-center justify-center rounded-lg p-3 mb-4 mx-auto w-fit">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="h-12 w-auto object-contain" />
          ) : (
            <div className="bg-primary p-3 rounded-lg">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
          )}
        </div>
        <CardTitle className="text-2xl">Acesso Super Admin</CardTitle>
        <CardDescription>
          Entre com suas credenciais de super administrador do {appName}.
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
