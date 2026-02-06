
'use server';

import { SuperAdminUsuariosManager } from '@/components/superadmin/usuarios-manager';
import { getAllUsuarios, getRedes, getFuncoes, getDistinctValues } from '@/lib/db';

export default async function SuperAdminUsuariosPage() {
  const [usuarios, redes, funcoes, distinctValues] = await Promise.all([
    getAllUsuarios(),
    getRedes(),
    getFuncoes(),
    getDistinctValues(true), // force fetch all polos
  ]);
  
  return <SuperAdminUsuariosManager initialUsuarios={usuarios} redes={redes} funcoes={funcoes} allPolos={distinctValues.polos} />;
}
