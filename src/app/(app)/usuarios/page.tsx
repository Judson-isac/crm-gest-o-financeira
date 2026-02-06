import { redirect } from 'next/navigation';

export default function UsuariosRootPage() {
  redirect('/usuarios/listar');
}
