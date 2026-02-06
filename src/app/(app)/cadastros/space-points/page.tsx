'use server';
import { SpacepointsManager } from '@/components/cadastros/spacepoints-manager';
import { getProcessosSeletivos, getSpacepoints } from '@/lib/api';

export default async function SpacePointsPage() {
  const processosSeletivos = await getProcessosSeletivos();
  const spacepoints = await getSpacepoints();

  const allDates = [...new Set(spacepoints.map(sp => sp.date.getTime()))]
    .sort((a, b) => a - b)
    .map(ts => new Date(ts));

  return <SpacepointsManager
    processosSeletivos={processosSeletivos}
    allSpacepoints={spacepoints}
    allDates={allDates}
  />;
}
