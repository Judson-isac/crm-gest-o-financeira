import { getProcessosSeletivos, getSpacepoints, getTiposCurso } from '@/lib/api';
import SpacepointsManager from '@/components/cadastros/spacepoints-manager';

export default async function SpacePointsPage() {
  const processosSeletivos = await getProcessosSeletivos();
  const spacepoints = await getSpacepoints();
  const tiposCurso = await getTiposCurso();

  const allDates = [...new Set(spacepoints.map(sp => sp.dataSpace.getTime()))]
    .sort((a, b) => a - b)
    .map(ts => new Date(ts));

  return <SpacepointsManager
    processosSeletivos={processosSeletivos}
    allSpacepoints={spacepoints}
    allDates={allDates}
    tiposCurso={tiposCurso}
  />;
}
