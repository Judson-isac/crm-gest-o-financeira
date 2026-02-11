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
        appLogoDark={config.appLogoDark}
        appLogoLoginHeight={config.appLogoLoginHeight}
        appLogoLoginScale={config.appLogoLoginScale}
        appLogoLoginPosition={config.appLogoLoginPosition}
        appLogoLoginOffsetX={config.appLogoLoginOffsetX}
        appLogoLoginOffsetY={config.appLogoLoginOffsetY}
      />
    </Suspense>
  );
}
