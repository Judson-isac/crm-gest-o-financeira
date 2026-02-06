import { redirect } from 'next/navigation';

export default function OldUsuariosPage() {
  redirect('/usuarios/listar');
  return null;
}
