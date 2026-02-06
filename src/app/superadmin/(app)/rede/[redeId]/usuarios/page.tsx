import { SuperAdminUsuariosManager } from '@/components/superadmin/usuarios-manager';
import { getAllUsuarios, getRedes, getFuncoes, getRedeById } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function ScopedUsuariosPage({ params }: { params: Promise<{ redeId: string }> }) {
    const resolvedParams = await params;
    const rede = await getRedeById(resolvedParams.redeId);
    if (!rede) notFound();

    const [usuarios, redes, funcoes] = await Promise.all([
        getAllUsuarios(resolvedParams.redeId), // Fetch only users for this rede
        getRedes(), // Need access to all redes metadata if we want (though locked mainly)
        getFuncoes(resolvedParams.redeId) // Fetch functions relevant to this rede
    ]);

    return <SuperAdminUsuariosManager initialUsuarios={usuarios} redes={redes} funcoes={funcoes} redeId={resolvedParams.redeId} />;
}
