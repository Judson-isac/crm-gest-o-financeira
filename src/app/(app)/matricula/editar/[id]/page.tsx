import { getMatriculaById, getCursos, getDistinctValues, getCampanhas, getProcessosSeletivos, getTiposCurso, getCanais } from '@/lib/api';
import { NovaMatriculaForm } from '@/components/matricula/nova-matricula-form';
import { notFound } from 'next/navigation';

export default async function EditarMatriculaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [
        matricula,
        courses,
        distinctData,
        campaigns,
        selectionProcesses,
        courseTypes,
        marketingChannels,
    ] = await Promise.all([
        getMatriculaById(id),
        getCursos(),
        getDistinctValues(),
        getCampanhas(),
        getProcessosSeletivos(),
        getTiposCurso(),
        getCanais(),
    ]);

    if (!matricula) {
        notFound();
    }

    const activeCampaigns = campaigns.filter(c => c.status === 'Ativo');
    const activeProcesses = selectionProcesses.filter(p => p.ativo);
    const activeChannels = marketingChannels.filter(c => c.ativo);

    return (
        <NovaMatriculaForm
            courses={courses}
            polos={distinctData.polos}
            cidades={distinctData.cidades}
            estados={distinctData.estados}
            campaigns={activeCampaigns}
            selectionProcesses={activeProcesses}
            courseTypes={courseTypes}
            marketingChannels={activeChannels}
            initialData={matricula}
            isEditing={true}
        />
    );
}
