'use server';

import { UsuariosManager } from '@/components/cadastros/usuarios-manager';
import { getUsuarios, getFuncoes } from '@/lib/api';

export default async function UsuariosPage() {
  const [usuarios, funcoes] = await Promise.all([
    getUsuarios(),
    getFuncoes()
  ]);
  return <UsuariosManager initialUsuarios={usuarios} funcoes={funcoes} />;
}
