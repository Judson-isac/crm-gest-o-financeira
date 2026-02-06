import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCog } from "lucide-react";
import { getRedeById, getAllUsuarios, getFuncoes } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function NetworkOverviewPage({ params }: { params: Promise<{ redeId: string }> }) {
    const resolvedParams = await params;
    const rede = await getRedeById(resolvedParams.redeId);
    if (!rede) notFound();

    // Fetch scoped stats
    const [usuarios, funcoes] = await Promise.all([
        getAllUsuarios(resolvedParams.redeId),
        getFuncoes(resolvedParams.redeId)
    ]);

    return (
        <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-md border-muted/60 transition-all hover:shadow-lg bg-gradient-to-br from-card to-secondary/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
                        <Users className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold tracking-tighter mt-2">{usuarios.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Cadastrados nesta rede</p>
                    </CardContent>
                </Card>
                <Card className="shadow-md border-muted/60 transition-all hover:shadow-lg bg-gradient-to-br from-card to-secondary/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Funções Personalizadas</CardTitle>
                        <UserCog className="h-5 w-5 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold tracking-tighter mt-2">{funcoes.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Cargos ativos</p>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-muted/20 border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Módulos Ativos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {rede.modulos && rede.modulos.length > 0 ? (
                        rede.modulos.map((mod: string) => (
                            <div key={mod} className="bg-background border px-4 py-2 rounded-md font-medium capitalize text-center shadow-sm text-sm">
                                {mod}
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-muted-foreground italic text-sm">
                            Nenhum módulo específico ativado (Acesso Padrão).
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
