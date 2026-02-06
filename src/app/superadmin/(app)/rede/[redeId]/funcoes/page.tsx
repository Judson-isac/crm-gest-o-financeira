
import { getFuncoes, getRedes, getDistinctValues, getRedeById } from '@/lib/db';
import FuncoesClient from '@/components/superadmin/FuncoesClient';
import { Permissoes } from '@/lib/types';
import { notFound } from 'next/navigation';

const permissoesDisponiveis: { key: keyof Permissoes, label: string }[] = [
    { key: 'verDashboard', label: 'Ver Dashboard' },
    { key: 'gerenciarMatriculas', label: 'Gerenciar Matrículas' },
    { key: 'verRelatoriosFinanceiros', label: 'Ver Relatórios Financeiros' },
    { key: 'gerenciarCadastrosGerais', label: 'Gerenciar Cadastros Gerais' },
    { key: 'gerenciarUsuarios', label: 'Gerenciar Usuários' },
    { key: 'realizarImportacoes', label: 'Realizar Importações' },
    { key: 'verRanking', label: 'Ver Ranking' },
];

export default async function ScopedFuncoesPage({ params }: { params: Promise<{ redeId: string }> }) {
    const resolvedParams = await params;
    const rede = await getRedeById(resolvedParams.redeId);
    if (!rede) notFound();

    const [funcoes, redes, distinctValues] = await Promise.all([
        getFuncoes(resolvedParams.redeId),
        getRedes(),
        getDistinctValues({ redeId: resolvedParams.redeId, polos: null, verDashboard: true } as any),
    ]);

    const funcoesComRede = funcoes.map(f => ({ ...f, nomeRede: rede.nome }));

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciamento de Funções - {rede.nome}</h1>
            <FuncoesClient
                funcoes={funcoesComRede}
                redes={redes}
                permissoesDisponiveis={permissoesDisponiveis}
                allPolos={distinctValues.polos}
                redeId={resolvedParams.redeId}
            />
        </div>
    );
}
