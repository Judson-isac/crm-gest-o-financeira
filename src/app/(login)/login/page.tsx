import { Suspense } from 'react';
import LoginForm from './login-form';
import { getSystemConfig } from '@/lib/db';

export default async function LoginPage() {
  const config = await getSystemConfig();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm appName={config.appName} appLogo={config.appLogo} />
    </Suspense>
  );
}
