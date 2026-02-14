'use client';

import { useState } from 'react';
import { WhatsAppInstance } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WhatsAppClient } from './whatsapp-client';
import { Badge } from '@/components/ui/badge';
import { Smartphone, ChevronRight } from 'lucide-react';

interface WhatsAppUserDashboardProps {
    instances: WhatsAppInstance[];
}

export function WhatsAppUserDashboard({ instances }: WhatsAppUserDashboardProps) {
    const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(
        instances.length === 1 ? instances[0] : null
    );

    if (instances.length === 0) {
        return (
            <div className="container mx-auto py-10">
                <h1 className="text-2xl font-bold mb-6">Módulo WhatsApp</h1>
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 text-yellow-700">
                            <div>
                                <p className="font-semibold">Nenhuma instância configurada</p>
                                <p className="text-sm">Sua rede ainda não possui instâncias de WhatsApp configuradas pelo administrador.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (selectedInstance) {
        return (
            <div className="container mx-auto py-10 space-y-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <button
                        onClick={() => setSelectedInstance(null)}
                        className="hover:text-foreground transition-colors"
                    >
                        WhatsApp
                    </button>
                    <ChevronRight size={14} />
                    <span className="text-foreground font-medium">{selectedInstance.instanceName}</span>
                </div>
                <WhatsAppClient instance={selectedInstance} />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 space-y-6">
            <h1 className="text-2xl font-bold">Módulo WhatsApp</h1>
            <p className="text-muted-foreground italic mb-6">Selecione uma instância para gerenciar a conexão.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {instances.map((instance) => (
                    <Card
                        key={instance.id}
                        className="hover:border-primary/50 cursor-pointer transition-all hover:shadow-md"
                        onClick={() => setSelectedInstance(instance)}
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="flex justify-between items-center text-lg">
                                {instance.instanceName}
                                <Badge variant={instance.status === 'open' ? 'default' : 'destructive'} className={instance.status === 'open' ? 'bg-green-500' : ''}>
                                    {instance.status === 'open' ? 'Conectado' : 'Desconectado'}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <div className={`p-2 rounded-full ${instance.status === 'open' ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                    <Smartphone size={24} />
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-foreground">{instance.phoneNumber || 'Não conectado'}</p>
                                    <p>Clique para gerenciar</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
