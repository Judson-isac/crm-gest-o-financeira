'use client';

import { useState, useEffect } from 'react';
import { WhatsAppInstance } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, LogOut, Smartphone, AlertCircle } from 'lucide-react';
import { getQRCode, logoutInstance, syncInstanceData, createInstance } from '@/lib/evolution';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface WhatsAppClientProps {
    instance: WhatsAppInstance | null;
}

export function WhatsAppClient({ instance }: WhatsAppClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [status, setStatus] = useState(instance?.status || 'Disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [needsCreation, setNeedsCreation] = useState(false);

    // Update local status when prop changes
    useEffect(() => {
        if (instance?.status) {
            setStatus(instance.status);
        }
    }, [instance?.status]);

    useEffect(() => {
        if (instance?.id && status !== 'open') {
            const interval = setInterval(async () => {
                const newStatus = await syncInstanceData(instance.id);
                if (newStatus && newStatus !== status) {
                    setStatus(newStatus);
                    router.refresh();
                }
            }, 10000); // Poll every 10s if not connected
            return () => clearInterval(interval);
        }
    }, [instance?.id, status, router]);

    const handleConnect = async () => {
        if (!instance) return;
        setLoading(true);
        setNeedsCreation(false);
        try {
            const qr = await getQRCode(instance.instanceName, instance.apiUrl, instance.instanceToken);
            setQrCode(qr);
            toast({ title: 'QR Code gerado!', description: 'Escaneie no WhatsApp.' });
        } catch (error: any) {
            if (error.message === 'INSTANCE_NOT_FOUND') {
                setNeedsCreation(true);
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao gerar QR Code' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!instance) return;
        setLoading(true);
        try {
            await createInstance(instance.instanceName, instance.apiUrl, instance.instanceToken);
            toast({ title: 'Sucesso', description: 'Instância criada no servidor!' });
            setNeedsCreation(false);
            // After creation, try to connect again
            await handleConnect();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao criar instância no servidor' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!instance || !confirm('Tem certeza que deseja desconectar?')) return;
        setLoading(true);
        try {
            await logoutInstance(instance.instanceName, instance.apiUrl, instance.instanceToken);
            setQrCode(null);
            setStatus('Disconnected');
            toast({ title: 'Sucesso', description: 'Desconectado com sucesso' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao desconectar' });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!instance) return;
        setLoading(true);
        try {
            const newStatus = await syncInstanceData(instance.id);
            if (newStatus) setStatus(newStatus);
            router.refresh(); // Refresh parent data
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!instance) {
        return (
            <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3 text-yellow-700">
                        <AlertCircle size={24} />
                        <div>
                            <p className="font-semibold">Nenhuma instância configurada</p>
                            <p className="text-sm">Solicite ao superadmin a configuração de uma instância para sua rede.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            Conexão
                            <Badge variant={status === 'open' ? 'default' : 'destructive'} className={status === 'open' ? 'bg-green-500' : ''}>
                                {status === 'open' ? 'Conectado' : 'Desconectado'}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            Gerencie a conexão do seu número com o sistema ({instance.instanceName}).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 border-2 border-dashed rounded-lg bg-muted/50">
                            {status === 'open' ? (
                                <div className="text-center space-y-4">
                                    <Avatar className="h-20 w-20 border-2 border-green-200">
                                        <AvatarImage src={instance.profilePicUrl} alt={instance.instanceName} />
                                        <AvatarFallback className="bg-green-100">
                                            <Smartphone size={40} className="text-green-600" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="text-center">
                                        {instance.profileName && <p className="font-bold text-lg">{instance.profileName}</p>}
                                        <p className={instance.profileName ? "text-sm text-muted-foreground" : "font-bold text-lg"}>
                                            {instance.phoneNumber || 'Número Conectado'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">O sistema está pronto para enviar mensagens.</p>
                                    </div>
                                    <div className="flex gap-2 justify-center">
                                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                                            <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar Estágio
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={handleLogout} disabled={loading}>
                                            <LogOut size={14} className="mr-2" /> Desconectar
                                        </Button>
                                    </div>
                                </div>
                            ) : qrCode ? (
                                <div className="text-center space-y-4">
                                    <div className="bg-white p-2 rounded shadow-sm mx-auto flex justify-center items-center w-fit">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 block" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar Aparelho</p>
                                    <Button variant="outline" size="sm" onClick={() => setQrCode(null)}>Cancelar</Button>
                                </div>
                            ) : needsCreation ? (
                                <div className="text-center space-y-4">
                                    <div className="bg-amber-100 p-4 rounded-full inline-block">
                                        <AlertCircle size={48} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-amber-900">Instância não encontrada</p>
                                        <p className="text-sm text-amber-700 max-w-xs mx-auto">Esta instância ainda não existe no servidor oficial da API. Deseja criá-la agora?</p>
                                    </div>
                                    <div className="flex gap-2 justify-center">
                                        <Button variant="outline" size="sm" onClick={() => setNeedsCreation(false)}>Cancelar</Button>
                                        <Button size="sm" onClick={handleCreate} disabled={loading}>
                                            {loading ? <RefreshCw className="mr-2 animate-spin" size={16} /> : null}
                                            Sim, Criar Agora
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="bg-muted p-4 rounded-full inline-block">
                                        <Smartphone size={48} className="text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground">Seu número não está pareado.</p>
                                    <Button onClick={handleConnect} disabled={loading}>
                                        {loading ? <RefreshCw className="mr-2 animate-spin" size={16} /> : null}
                                        Conectar WhatsApp
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Dicas de Uso</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-4">
                        <p>• Mantenha seu celular conectado à internet para garantir a estabilidade da conexão.</p>
                        <p>• Evite desconectar o aparelho através do aplicativo do WhatsApp para não perder o vínculo com o CRM.</p>
                        <p>• Caso o status não atualize instantaneamente, clique em "Atualizar Estágio".</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
