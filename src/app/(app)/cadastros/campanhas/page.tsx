
'use server';

import { CampanhasManager } from '@/components/cadastros/campanhas-manager';
import { getCampanhas, getRedes, getAuthenticatedUser } from '@/lib/api';
import { cookies } from 'next/headers';

export default async function CampanhasPage() {
  const cookieStore = await cookies();
  const isSuperAdmin = cookieStore.has('superadmin-auth');
  const [campanhas, allRedes, user] = await Promise.all([
    getCampanhas(),
    getRedes(),
    getAuthenticatedUser(),
  ]);

  return (
    <CampanhasManager
      initialCampanhas={campanhas}
      isSuperAdmin={isSuperAdmin}
      allRedes={allRedes}
      currentUserRede={user?.rede}
    />
  );
}
