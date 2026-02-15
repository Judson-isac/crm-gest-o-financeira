'use client';

import { useState } from 'react';
import { WhatsAppInstance, Rede, Usuario } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WhatsAppClient } from './whatsapp-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { syncAllInstances, syncInstanceData, createUserInstance } from '@/lib/evolution';
import { deleteWhatsAppInstance } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Smartphone, ChevronRight, RefreshCw, Plus, Trash2 } from 'lucide-react';

interface WhatsAppUserDashboardProps {
    instances: WhatsAppInstance[];
    rede: Rede | null;
    user: Omit<Usuario, 'senha'>;
}

export function WhatsAppUserDashboard({ instances, rede, user }: WhatsAppUserDashboardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newInstanceName, setNewInstanceName] = useState('');
    const [newInboxName, setNewInboxName] = useState('');
    const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(
        instances.length === 1 ? instances[0] : null
    );

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            await syncAllInstances(instances[0]?.redeId);
            toast({ title: 'Sucesso', description: 'Instâncias sincronizadas!' });
            router.refresh();
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
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao sincronizar' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteInstance = async (e: React.MouseEvent, instance: WhatsAppInstance) => {
        e.stopPropagation();
        if (!confirm(`Tem certeza que deseja excluir a instância "${instance.instanceName}"? Isso também a removerá do servidor Evolution API.`)) return;

        setIsSaving(true);
        try {
            await deleteWhatsAppInstance(instance.id);
            toast({ title: 'Sucesso', description: 'Instância excluída com sucesso!' });
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao excluir instância' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateInstance = async () => {
        if (!newInstanceName.trim()) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira o nome da instância.' });
            return;
        }

        setIsSaving(true);
        try {
            await createUserInstance(newInstanceName, user.redeId, user.id, newInboxName);
            toast({ title: 'Sucesso', description: 'Instância criada com sucesso!' });
            setIsAddOpen(false);
            setNewInstanceName('');
            setNewInboxName('');
            router.refresh();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao criar instância' });
        } finally {
            setIsSaving(false);
        }
    };

    // View: Single Instance Selected
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
            </div>
        );
    }

    // View: Empty State (if creation is NOT enabled)
    if (instances.length === 0 && !rede?.whatsapp_enabled) {
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

    // View: Grid of instances + Creation button (if enabled)
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold">WhatsApp</h1>
                    <p className="text-muted-foreground italic">Gerencie suas instâncias de WhatsApp.</p>
                </div>
                <div className="flex gap-2">
                    {rede?.whatsapp_enabled && (
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus size={16} /> Nova Instância
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Nova Instância de WhatsApp</DialogTitle>
                                    <CardDescription>
                                        Ao criar uma nova instância, as configurações padrão da rede <strong>{rede.nome}</strong> serão aplicadas automaticamente.
                                    </CardDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome da Instância</Label>
                                        <Input
                                            id="name"
                                            placeholder="Ex: Secretaria, Suporte..."
                                            value={newInstanceName}
                                            onChange={(e) => setNewInstanceName(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">Este nome ajudará você a identificar a conexão.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="inbox">Nome da Inbox (Chatwoot)</Label>
                                        <Input
                                            id="inbox"
                                            placeholder="Ex: Comercial, Atendimento..."
                                            value={newInboxName}
                                            onChange={(e) => setNewInboxName(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground italic">Deixe vazio para usar o padrão da rede.</p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancelar</Button>
                                    <Button onClick={handleCreateInstance} disabled={isSaving}>
                                        {isSaving ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                                        {isSaving ? 'Criando...' : 'Criar Instância'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                    <Button variant="outline" onClick={handleSyncAll} disabled={isSyncing}>
                        <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar Tudo
                    </Button>
                </div>
            </div>

            {instances.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                        <Smartphone className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">Nenhuma instância ativa</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto">
                            Clique em "Nova Instância" para começar a conectar seu WhatsApp.
                        </p>
                    </CardContent>
                </Card>
            ) : (
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

                                    <div className="flex flex-col gap-2 absolute right-2 bottom-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => handleDeleteInstance(e, instance)}
                                            disabled={isSaving}
                                            title="Excluir Instância"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => handleSyncOne(e, instance.id)}
                                            disabled={isSyncing}
                                            title="Sincronizar"
                                        >
                                            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
