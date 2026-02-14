'use server';

import FuncoesClient from '@/components/superadmin/FuncoesClient';
import { getFuncoes, getRedes, getDistinctValues } from '@/lib/api';
import { Permissoes } from '@/lib/types';

const permissoesDisponiveis: { key: keyof Permissoes, label: string }[] = [
  { key: 'verDashboard', label: 'Ver Dashboard' },
  { key: 'gerenciarMatriculas', label: 'Gerenciar Matrículas' },
  { key: 'verRelatoriosFinanceiros', label: 'Ver Relatórios Financeiros' },
  { key: 'gerenciarCadastrosGerais', label: 'Gerenciar Cadastros Gerais' },
  { key: 'gerenciarUsuarios', label: 'Gerenciar Usuários' },
  { key: 'realizarImportacoes', label: 'Realizar Importações' },
  { key: 'verRanking', label: 'Ver Ranking' },
  { key: 'gerenciarWhatsapp', label: 'Gerenciar WhatsApp' },
];

export default async function FuncoesPage() {
  // These API calls are already context-aware and will fetch data for the user's network.
  const [funcoes, redes, distinctValues] = await Promise.all([
    getFuncoes(),
    getRedes(),
    getDistinctValues(),
  ]);

  const funcoesComRede = funcoes.map(f => {
    const rede = redes.find(r => r.id === f.redeId);
    return { ...f, nomeRede: rede?.nome || 'N/A' };
  });

  return (
    <div className="space-y-6">
      <FuncoesClient
        funcoes={funcoesComRede}
        redes={redes}
        permissoesDisponiveis={permissoesDisponiveis}
        allPolos={distinctValues.polos}
      />
    </div>
  );
}
