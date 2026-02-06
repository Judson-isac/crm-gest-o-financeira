
'use server';
import { CanaisManager } from '@/components/cadastros/canais-manager';
// As funções da API agora têm a lógica de segurança embutida.
import { getCanais, getRedes, getAuthenticatedUser } from '@/lib/api';

export default async function CanaisPage() {
  // Busca os dados. A lógica de segregação por rede já está na API.
  // getCanais() retornará apenas os canais da rede do usuário, a menos que ele seja superadmin.
  // getRedes() retornará apenas a rede do usuário, a menos que ele seja superadmin.
  const [canais, allRedes, user] = await Promise.all([
    getCanais(),
    getRedes(),
    getAuthenticatedUser()
  ]);

  // CORREÇÃO: A verificação de superadmin agora é feita pelo campo booleano do usuário.
  const isSuperAdmin = user?.isSuperadmin ?? false;

  return (
    <CanaisManager 
      initialCanais={canais}
      // A prop isSuperAdmin é passada para o componente de cliente, que não tem acesso ao usuário.
      isSuperAdmin={isSuperAdmin}
      // allRedes conterá todas as redes para superadmin ou apenas uma para usuário normal.
      allRedes={allRedes}
      // currentUserRede é usado para pré-selecionar a rede correta no formulário de criação/edição.
      currentUserRede={user?.rede}
    />
  );
}
