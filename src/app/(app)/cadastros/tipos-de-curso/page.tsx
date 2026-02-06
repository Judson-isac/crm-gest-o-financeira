'use server';
import { TiposCursoManager } from '@/components/cadastros/tipos-curso-manager';
import { getTiposCurso } from '@/lib/api';

export default async function TiposDeCursoPage() {
  const tipos = await getTiposCurso();
  return <TiposCursoManager initialTiposCurso={tipos} />;
}
