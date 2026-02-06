'use server';

export const dynamic = 'force-dynamic';

import { getFuncoes, getRedes, getDistinctValues } from '@/lib/api';
import FuncoesClient from '@/components/superadmin/FuncoesClient';
import { Permissoes, Rede } from '@/lib/types';

const permissoesDisponiveis: { key: keyof Permissoes, label: string }[] = [
  { key: 'verDashboard', label: 'Ver Dashboard' },
  { key: 'gerenciarMatriculas', label: 'Gerenciar Matrículas' },
  { key: 'verRelatoriosFinanceiros', label: 'Ver Relatórios Financeiros' },
  { key: 'gerenciarCadastrosGerais', label: 'Gerenciar Cadastros Gerais' },
  { key: 'gerenciarUsuarios', label: 'Gerenciar Usuários' },
  { key: 'realizarImportacoes', label: 'Realizar Importações' },
];

export default async function FuncoesPage() {
  const [funcoes, redes, distinctValues] = await Promise.all([
    getFuncoes(),
    getRedes(),
    getDistinctValues(true), // Force fetch all polos
  ]);

  const funcoesComRede = funcoes.map(f => {
    const rede = redes.find(r => r.id === f.redeId);
    return { ...f, nomeRede: rede?.nome || 'N/A' };
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciamento de Funções</h1>
      <FuncoesClient
        funcoes={funcoesComRede}
        redes={redes}
        permissoesDisponiveis={permissoesDisponiveis}
        allPolos={distinctValues.polos}
      />
    </div>
  );
}
