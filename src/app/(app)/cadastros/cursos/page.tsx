import { getCursos } from '@/lib/api';
import { CursosList } from '@/components/cursos/cursos-list';

export default async function CursosPage() {
    const cursos = await getCursos();
    return <CursosList initialCursos={cursos} />;
}
