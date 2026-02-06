'use server';

import { RedesManager } from '@/components/superadmin/redes-manager';
import { getRedes } from '@/lib/db';

export default async function RedesPage() {
  const redes = await getRedes();
  return <RedesManager initialRedes={redes} />;
}
