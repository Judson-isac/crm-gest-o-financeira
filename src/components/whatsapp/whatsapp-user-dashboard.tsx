'use client';

import { useState } from 'react';
import { WhatsAppInstance } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WhatsAppClient } from './whatsapp-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Smartphone, ChevronRight, RefreshCw } from 'lucide-react';
import { syncAllInstances, syncInstanceData } from '@/lib/evolution';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface WhatsAppUserDashboardProps {
    instances: WhatsAppInstance[];
}

export function WhatsAppUserDashboard({ instances }: WhatsAppUserDashboardProps) {
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(
        instances.length === 1 ? instances[0] : null
    );

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            await syncAllInstances(instances[0]?.redeId);
            toast({ title: 'Sucesso', description: 'Instâncias sincronizadas!' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao sincronizar' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncOne = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setIsSyncing(true);
        try {
            await syncInstanceData(id);
            toast({ title: 'Sucesso', description: 'Instância sincronizada!' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao sincronizar' });
        } finally {
            setIsSyncing(false);
        }
    };

    if (instances.length === 0) {
        return (
            <div className="container mx-auto py-6">
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
            <div className="container mx-auto py-6 space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <button
                            onClick={() => setSelectedInstance(null)}
                            className="hover:text-foreground transition-colors"
                        >
                            WhatsApp
                        </button>
                        <ChevronRight size={14} />
                        <span className="text-foreground font-medium">{selectedInstance.instanceName}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => handleSyncOne(e, selectedInstance.id)} disabled={isSyncing}>
                        <RefreshCw size={14} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar
                    </Button>
                </div>
                <WhatsAppClient instance={selectedInstance} />
            </div >
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex-1">
                    <p className="text-muted-foreground italic">Selecione uma instância para gerenciar a conexão.</p>
                </div>
                <Button variant="outline" onClick={handleSyncAll} disabled={isSyncing}>
                    <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar Tudo
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {instances.map((instance) => (
                    <Card
                        key={instance.id}
                        className="hover:border-primary/50 cursor-pointer transition-all hover:shadow-md relative group"
                        onClick={() => setSelectedInstance(instance)}
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="flex justify-between items-center text-lg">
                                {instance.instanceName}
                                <div className="flex items-center gap-2">
                                    <Badge variant={instance.status === 'open' ? 'default' : 'destructive'} className={instance.status === 'open' ? 'bg-green-500' : ''}>
                                        {instance.status === 'open' ? 'Conectado' : 'Desconectado'}
                                    </Badge>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Avatar className={`h-12 w-12 border ${instance.status === 'open' ? 'border-green-200' : ''}`}>
                                    <AvatarImage src={instance.profilePicUrl} alt={instance.instanceName} />
                                    <AvatarFallback className={instance.status === 'open' ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}>
                                        <Smartphone size={24} />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="text-sm truncate pr-8 flex-1">
                                    <p className="font-medium text-foreground truncate" title={instance.profileName || instance.phoneNumber}>
                                        {instance.profileName || instance.phoneNumber || (instance.status === 'open' ? 'Conectado' : 'Não conectado')}
                                    </p>
                                    {instance.phoneNumber && (
                                        <p className="text-xs truncate">{instance.phoneNumber}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">Clique para gerenciar</p>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => handleSyncOne(e, instance.id)}
                                    disabled={isSyncing}
                                    title="Sincronizar"
                                >
                                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
