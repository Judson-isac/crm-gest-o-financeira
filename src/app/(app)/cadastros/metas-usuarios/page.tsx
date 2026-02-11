import { MetasUsuariosManager } from '@/components/cadastros/metas-usuarios-manager';
import { getUsuarios, getProcessosSeletivos, getSpacepoints, getRedeContext } from '@/lib/api';
import { getMetasUsuariosAction } from '@/actions/cadastros';

export default async function MetasUsuariosPage() {
  const { sessionRedeId } = await getRedeContext();

  const [usuarios, processosSeletivos, initialMetasResult] = await Promise.all([
    getUsuarios(),
    getProcessosSeletivos(),
    getMetasUsuariosAction()
  ]);

  const initialMetas = (initialMetasResult.success && initialMetasResult.data) ? initialMetasResult.data : [];

  return (
    <div className="space-y-6">
      <MetasUsuariosManager
        usuarios={usuarios}
        processosSeletivos={processosSeletivos}
        initialMetas={initialMetas}
      />
    </div>
  );
}
