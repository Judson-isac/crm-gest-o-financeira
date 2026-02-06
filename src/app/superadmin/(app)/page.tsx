import { getSuperAdminStats } from '@/lib/db';
import SuperAdminDashboard from '@/components/superadmin/dashboard-client';

export const dynamic = 'force-dynamic';

export default async function SuperAdminRootPage() {
  const stats = await getSuperAdminStats();

  return (
    <SuperAdminDashboard stats={stats} />
  );
}
