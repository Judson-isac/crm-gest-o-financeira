import { getMatriculas } from '@/lib/api';
import { MatriculasList } from '@/components/matricula/matriculas-list';

export default async function ListarMatriculasPage() {
    const matriculas = await getMatriculas();

    return <MatriculasList initialMatriculas={matriculas} />;
}
