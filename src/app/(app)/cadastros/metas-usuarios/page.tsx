import { MetasUsuariosManager } from '@/components/cadastros/metas-usuarios-manager';
import { getUsuarios, getProcessosSeletivos, getSpacepoints, getRedeContext } from '@/lib/api';

export default async function MetasUsuariosPage() {
  const { sessionRedeId } = await getRedeContext();

  const [usuarios, processosSeletivos, allSpacepoints] = await Promise.all([
    getUsuarios(),
    getProcessosSeletivos(),
    getSpacepoints()
  ]);

  return (
    <div className="space-y-6">
      <MetasUsuariosManager
        usuarios={usuarios}
        processosSeletivos={processosSeletivos}
        allSpacepoints={allSpacepoints}
      />
    </div>
  );
}
