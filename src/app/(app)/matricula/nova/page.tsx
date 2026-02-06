import { NovaMatriculaForm } from '@/components/matricula/nova-matricula-form';
import { getCursos, getDistinctValues, getCampanhas, getProcessosSeletivos, getTiposCurso, getCanais } from '@/lib/api';

import { getAuthenticatedUserPermissions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NovaMatriculaPage() {
  // Strict Permission Check (Bypasses stale JWT)
  const permissions = await getAuthenticatedUserPermissions();
  if (!permissions.gerenciarMatriculas) {
    redirect('/dashboard?error=ModuleDisabled');
  }

  // Fetch all data on the server side
  const [
    courses,
    distinctData,
    campaigns,
    selectionProcesses,
    courseTypes,
    marketingChannels,
  ] = await Promise.all([
    getCursos(),
    getDistinctValues(),
    getCampanhas(),
    getProcessosSeletivos(),
    getTiposCurso(),
    getCanais(),
  ]);

  // Filter active items
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
    />
  );
}
