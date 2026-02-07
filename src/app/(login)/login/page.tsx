import { Suspense } from 'react';
import LoginForm from './login-form';
import { getSystemConfig } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';


export default async function LoginPage() {
  const config = await getSystemConfig();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm
        appName={config.appName}
        appLogo={config.appLogo}
        appLogoHeight={config.appLogoHeight}
        appLogoLoginScale={config.appLogoLoginScale}
      />
    </Suspense>
  );
}
