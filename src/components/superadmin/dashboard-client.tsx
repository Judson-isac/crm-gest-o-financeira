'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Users, UserCog, Plus, ShieldCheck, Database } from "lucide-react";
import Link from "next/link";
import type { SuperAdminStats } from "@/lib/types";

interface DashboardClientProps {
    stats: SuperAdminStats;
}

export default function SuperAdminDashboard({ stats }: DashboardClientProps) {
    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col gap-2 border-b pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
                <p className="text-muted-foreground text-lg">
                    Painel de controle mestre do sistema.
                </p>
            </div>

            {/* Metrics Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-lg border-muted/60 transition-all hover:shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Redes Ativas</CardTitle>
                        <Globe className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight">{stats.totalRedes}</div>
                        <p className="text-xs text-muted-foreground mt-1">Tenant isolados</p>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-muted/60 transition-all hover:shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight">{stats.totalUsuarios}</div>
                        <p className="text-xs text-muted-foreground mt-1">Distribuídos nas redes</p>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-muted/60 transition-all hover:shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Funções & Cargos</CardTitle>
                        <UserCog className="h-5 w-5 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight">{stats.totalFuncoes}</div>
                        <p className="text-xs text-muted-foreground mt-1">Configurações de acesso</p>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-muted/60 transition-all hover:shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
                        <Database className="h-5 w-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight text-emerald-600">Online</div>
                        <p className="text-xs text-muted-foreground mt-1">Conexão estável</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions & Recent Activity Area */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="col-span-1 shadow-md border-muted/60">
                    <CardHeader>
                        <CardTitle>Gerenciamento Rápido</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <Link href="/superadmin/redes" passHref className="w-full">
                            <Button className="w-full justify-start gap-2 h-12 text-base font-medium shadow-sm" size="lg">
                                <Plus className="h-5 w-5" />
                                Criar Nova Rede
                            </Button>
                        </Link>
                        <Link href="/superadmin/redes" passHref className="w-full">
                            <Button variant="outline" className="w-full justify-start gap-2 h-12 text-base font-medium border-muted-foreground/20" size="lg">
                                <Globe className="h-5 w-5" />
                                Gerenciar Redes Existentes
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="col-span-2 shadow-md border-muted/60 bg-muted/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Dicas de Administração
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex gap-2 items-start">
                                <span className="bg-primary/10 text-primary rounded-full p-1 h-fit mt-0.5">✓</span>
                                <span>Lembre-se de configurar os <strong>Módulos</strong> corretos ao criar uma rede para limitar o acesso a funcionalidades sensíveis.</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <span className="bg-primary/10 text-primary rounded-full p-1 h-fit mt-0.5">✓</span>
                                <span>Você pode acessar o painel específico de cada rede clicando em "Gerenciar" na lista de redes.</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <span className="bg-primary/10 text-primary rounded-full p-1 h-fit mt-0.5">✓</span>
                                <span>As funções criadas dentro de uma rede são exclusivas daquela rede.</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
