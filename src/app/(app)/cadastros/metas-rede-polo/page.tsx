'use server';
import { MetasRedePoloManager } from '@/components/cadastros/metas-rede-polo-manager';
import { getMetas, getDistinctValues, getProcessosSeletivos, getTiposCurso } from '@/lib/api';

export default async function MetasRedePoloPage() {
    const [metas, distinctValues, processosSeletivos, tiposDeCurso] = await Promise.all([
      getMetas(),
      getDistinctValues(),
      getProcessosSeletivos(),
      getTiposCurso(),
    ]);
    
    return <MetasRedePoloManager 
              initialMetas={metas}
              polos={distinctValues.polos} 
              tiposDeCurso={tiposDeCurso.map(t => t.nome)} 
              processosSeletivos={processosSeletivos.map(p => `${p.numero}/${p.ano}`)} 
          />;
}
