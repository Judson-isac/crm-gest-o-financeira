import { Suspense } from 'react';
import SuperAdminLoginForm from './login-form';
import { getSystemConfig } from '@/lib/db';

export default async function SuperAdminLoginPage() {
  const config = await getSystemConfig();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuperAdminLoginForm
        appName={config.appName}
        appLogo={config.appLogo}
        appLogoDark={config.appLogoDark}
        appLogoSuperAdminDark={config.appLogoSuperAdminDark}
        appLogoSuperAdminHeight={config.appLogoSuperAdminHeight}
        appLogoSuperAdminScale={config.appLogoSuperAdminScale}
        appLogoSuperAdminPosition={config.appLogoSuperAdminPosition}
        appLogoSuperAdminOffsetX={config.appLogoSuperAdminOffsetX}
        appLogoSuperAdminOffsetY={config.appLogoSuperAdminOffsetY}
      />
    </Suspense>
  );
}
