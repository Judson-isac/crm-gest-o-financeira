'use server';

import { SuperAdminUsuariosManager } from '@/components/superadmin/usuarios-manager';
import { getAllUsuarios, getRedes, getFuncoes } from '@/lib/db';

export default async function SuperAdminUsuariosPage() {
  const [usuarios, redes, funcoes] = await Promise.all([
    getAllUsuarios(),
    getRedes(),
    getFuncoes() // Get all funcoes without filtering by rede initially
  ]);
  
  return <SuperAdminUsuariosManager initialUsuarios={usuarios} redes={redes} funcoes={funcoes} />;
}
