import { getCursos, getTiposCurso } from '@/lib/api';
import { CursosList } from '@/components/cursos/cursos-list';

export default async function CursosPage() {
    const [cursos, courseTypes] = await Promise.all([
        getCursos(),
        getTiposCurso()
    ]);
    return <CursosList initialCursos={cursos} courseTypes={courseTypes} />;
}
