'use server';

import { UsuariosManager } from '@/components/cadastros/usuarios-manager';
import { getUsuarios } from '@/lib/api';

export default async function UsuariosPage() {
  const usuarios = await getUsuarios();
  return <UsuariosManager initialUsuarios={usuarios} />;
}
