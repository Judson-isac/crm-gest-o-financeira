
'use server';
import { ProcessoSeletivoManager } from '@/components/cadastros/processo-seletivo-manager';
import { getProcessosSeletivos, getNumerosProcessoSeletivo, getRedes, getAuthenticatedUser } from '@/lib/api';
import { cookies } from 'next/headers';

export default async function ProcessoSeletivoPage() {
  const cookieStore = await cookies();
  const isSuperAdmin = cookieStore.has('superadmin-auth');
  const [processos, numeros, allRedes, user] = await Promise.all([
    getProcessosSeletivos(),
    getNumerosProcessoSeletivo(),
    getRedes(),
    getAuthenticatedUser()
  ]);

  return (
    <ProcessoSeletivoManager
      initialProcessos={processos}
      numerosProcessoSeletivo={numeros}
      isSuperAdmin={isSuperAdmin}
      allRedes={allRedes}
      currentUserRede={user?.rede}
    />
  );
}
