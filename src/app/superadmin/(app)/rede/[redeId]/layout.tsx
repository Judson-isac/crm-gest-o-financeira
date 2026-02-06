import { buttonVariants } from "@/components/ui/button";
import { Users, UserCog, ArrowLeft, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getRedeById } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function NetworkScopedLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ redeId: string }>;
}) {
    const resolvedParams = await params;
    const rede = await getRedeById(resolvedParams.redeId);

    if (!rede) {
        notFound();
    }

    return (
        <div className="space-y-6">
            {/* Header with Breadcrumb-like Feel */}
            <div className="flex flex-col gap-4 border-b pb-6 bg-card/50 -mx-4 px-8 pt-4 rounded-lg shadow-sm border mb-8">
                <Link href="/superadmin/redes" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), "w-fit text-muted-foreground hover:text-foreground pl-0")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para Lista de Redes
                </Link>
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">{rede.nome}</h2>
                        <p className="text-muted-foreground text-lg">Área de Gerenciamento Dedicada</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="lg:w-1/5">
                    <div className="sticky top-24">
                        <div className="bg-card rounded-xl border shadow-sm p-4">
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-4 px-2">Menu da Rede</h4>
                            <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                                <Link
                                    href={`/superadmin/rede/${resolvedParams.redeId}`}
                                    className={cn(buttonVariants({ variant: 'ghost' }), "justify-start w-full text-sm font-medium hover:bg-muted/50 transition-colors h-10 px-3",
                                        "hover:text-primary hover:bg-primary/5"
                                    )}
                                >
                                    <LayoutDashboard className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    Visão Geral
                                </Link>
                                <Link
                                    href={`/superadmin/rede/${resolvedParams.redeId}/usuarios`}
                                    className={cn(buttonVariants({ variant: 'ghost' }), "justify-start w-full text-sm font-medium hover:bg-muted/50 transition-colors h-10 px-3",
                                        "hover:text-blue-600 hover:bg-blue-50"
                                    )}
                                >
                                    <Users className="mr-3 h-4 w-4 text-blue-500/70" />
                                    Usuários
                                </Link>
                                <Link
                                    href={`/superadmin/rede/${resolvedParams.redeId}/funcoes`}
                                    className={cn(buttonVariants({ variant: 'ghost' }), "justify-start w-full text-sm font-medium hover:bg-muted/50 transition-colors h-10 px-3",
                                        "hover:text-indigo-600 hover:bg-indigo-50"
                                    )}
                                >
                                    <UserCog className="mr-3 h-4 w-4 text-indigo-500/70" />
                                    Funções
                                </Link>
                            </nav>
                        </div>

                        <div className="mt-8 px-4 py-4 bg-muted/20 rounded-lg border text-sm text-muted-foreground hidden lg:block">
                            <p className="leading-relaxed">
                                Você está editando dados exclusivos da rede <strong>{rede.nome}</strong>.
                            </p>
                        </div>
                    </div>
                </aside>
                <div className="flex-1 lg:max-w-5xl bg-card rounded-xl border shadow-sm p-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {children}
                </div>
            </div>
        </div>
    );
}
