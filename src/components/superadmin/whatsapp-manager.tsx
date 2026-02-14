'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WhatsAppInstance, Rede } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Square, CheckSquare, Search, Edit2, Trash2, Smartphone, Plus, RefreshCw, Upload } from 'lucide-react';
import { saveWhatsAppInstance, deleteWhatsAppInstance } from '@/lib/db';
import { syncInstanceData, fetchInstancesFromServer, getQRCode } from '@/lib/evolution';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppClient } from '../whatsapp/whatsapp-client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface WhatsAppManagerProps {
    initialInstances: WhatsAppInstance[];
    redes: Rede[];
}

export function WhatsAppManager({ initialInstances, redes }: WhatsAppManagerProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [instances, setInstances] = useState<WhatsAppInstance[]>(initialInstances);

    // Update local state when server data changes
    useEffect(() => {
        setInstances(initialInstances);
    }, [initialInstances]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importData, setImportData] = useState({ url: '', token: '', redeId: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnecting, setIsConnecting] = useState<WhatsAppInstance | null>(null);
    const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
    const [selectedRedeId, setSelectedRedeId] = useState<string>('all');
    const [newInstance, setNewInstance] = useState<Partial<WhatsAppInstance>>({
        instanceName: '',
        instanceToken: '',
        apiUrl: '',
        redeId: '',
    });

    // Load persisted import credentials
    useEffect(() => {
        const savedUrl = localStorage.getItem('EVOLUTION_IMPORT_URL');
        const savedToken = localStorage.getItem('EVOLUTION_IMPORT_TOKEN');
        if (savedUrl || savedToken) {
            setImportData(prev => ({
                ...prev,
                url: savedUrl || '',
                token: savedToken || ''
            }));
            setNewInstance(prev => ({
                ...prev,
                apiUrl: savedUrl || '',
                instanceToken: savedToken || ''
            }));
        }
    }, []);

    const handleSave = async () => {
        if (!newInstance.instanceName || !newInstance.instanceToken || !newInstance.redeId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha o Nome, o Token e selecione a Rede' });
            return;
        }

        try {
            // Persist credentials
            if (newInstance.apiUrl) localStorage.setItem('EVOLUTION_IMPORT_URL', newInstance.apiUrl);
            if (newInstance.instanceToken) localStorage.setItem('EVOLUTION_IMPORT_TOKEN', newInstance.instanceToken);

            const saved = await saveWhatsAppInstance(newInstance);
            setInstances([...instances, saved]);
            setIsAddOpen(false);
            setNewInstance({
                instanceName: '',
                instanceToken: localStorage.getItem('EVOLUTION_IMPORT_TOKEN') || '',
                apiUrl: localStorage.getItem('EVOLUTION_IMPORT_URL') || '',
                redeId: ''
            });
            toast({ title: 'Sucesso', description: 'Instância salva com sucesso' });

            // Sync with Import state
            setImportData(prev => ({
                ...prev,
                url: newInstance.apiUrl || '',
                token: newInstance.instanceToken || ''
            }));
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar instância' });
            console.error(error);
        }
    };

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            for (const instance of instances) {
                await syncInstanceData(instance.id);
            }
            toast({ title: 'Sucesso', description: 'Instâncias sincronizadas!' });
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao sincronizar instâncias' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleImport = async () => {
        if (!importData.url || !importData.token || !importData.redeId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha a URL, a API Key e selecione a Rede' });
            return;
        }

        // Persist credentials
        localStorage.setItem('EVOLUTION_IMPORT_URL', importData.url);
        localStorage.setItem('EVOLUTION_IMPORT_TOKEN', importData.token);

        // Sync with Add Instance state
        setNewInstance(prev => ({
            ...prev,
            apiUrl: importData.url,
            instanceToken: importData.token
        }));

        setIsImporting(true);
        try {
            const serverInstances = await fetchInstancesFromServer(importData.url, importData.token);
            let importedCount = 0;
            let skippedCount = 0;

            for (const si of serverInstances) {
                const name = si.instanceName || si.name;
                const token = si.token || si.instanceToken || importData.token;

                if (!instances.some(i => i.instanceName === name)) {
                    await saveWhatsAppInstance({
                        redeId: importData.redeId,
                        instanceName: name,
                        instanceToken: token,
                        apiUrl: importData.url,
                        status: si.status || 'Disconnected'
                    });
                    importedCount++;
                } else {
                    skippedCount++;
                }
            }

            toast({ title: 'Sucesso', description: `Importado ${importedCount} instâncias (${skippedCount} ignoradas por já existirem).` });
            setIsImportOpen(false);
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao importar do servidor' });
        } finally {
            setIsImporting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Deseja excluir as ${selectedIds.length} instâncias selecionadas?`)) return;

        try {
            for (const id of selectedIds) {
                await deleteWhatsAppInstance(id);
            }
            setInstances(instances.filter(i => !selectedIds.includes(i.id)));
            setSelectedIds([]);
            toast({ title: 'Sucesso', description: 'Instâncias excluídas' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir instâncias' });
        }
    };

    const handleBulkSync = async () => {
        if (selectedIds.length === 0) return;
        setIsSyncing(true);
        try {
            for (const id of selectedIds) {
                await syncInstanceData(id);
            }
            toast({ title: 'Sincronização iniciada', description: 'Status das instâncias selecionadas estão sendo atualizados.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao sincronizar instâncias' });
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredInstances = instances.filter(i => {
        const rede = redes.find(r => r.id === i.redeId);
        const search = searchTerm.toLowerCase();
        const matchesSearch = i.instanceName.toLowerCase().includes(search) ||
            rede?.nome.toLowerCase().includes(search) ||
            (!i.redeId && "sem rede".includes(search));

        const matchesRede = selectedRedeId === 'all' || i.redeId === selectedRedeId;
        return matchesSearch && matchesRede;
    });

    const handleBulkChangeRede = async (newRedeId: string) => {
        if (!newRedeId || newRedeId === 'all') return;
        if (!confirm(`Deseja mover ${selectedIds.length} instâncias para esta rede?`)) return;

        setIsSyncing(true);
        try {
            for (const id of selectedIds) {
                await saveWhatsAppInstance({ id, redeId: newRedeId });
            }
            toast({ title: 'Sucesso', description: `${selectedIds.length} instâncias movidas.` });
            setSelectedIds([]);
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao mover instâncias' });
        } finally {
            setIsSyncing(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredInstances.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredInstances.map(i => i.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta instância?')) return;

        try {
            await deleteWhatsAppInstance(id);
            setInstances(instances.filter(i => i.id !== id));
            toast({ title: 'Sucesso', description: 'Instância excluída' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir instância' });
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-4 rounded-lg border shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold mr-2">WhatsApp</h1>

                    <div className="flex items-center gap-2">
                        <Select value={selectedRedeId} onValueChange={setSelectedRedeId}>
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Todas as Redes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Redes</SelectItem>
                                {redes.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar instância..."
                            className="pl-9 w-[200px] h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">{selectedIds.length} selecionados</span>
                            <div className="h-4 w-px bg-blue-200 dark:bg-blue-800" />
                            <Select onValueChange={handleBulkChangeRede}>
                                <SelectTrigger className="w-[160px] h-8 text-xs bg-background border-blue-200 dark:border-blue-800 focus:ring-blue-500">
                                    <SelectValue placeholder="Mover p/ Rede..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {redes.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400" onClick={handleBulkSync} disabled={isSyncing}>
                                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:bg-red-50 dark:hover:bg-red-950/30" onClick={handleBulkDelete}>
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    )}

                    <Button variant="outline" size="sm" className="h-9" onClick={handleSyncAll} disabled={isSyncing}>
                        <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar Tudo
                    </Button>

                    <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Upload size={16} /> Importar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Importar Instâncias da Evolution</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Rede de Destino</Label>
                                    <Select
                                        value={importData.redeId}
                                        onValueChange={(v) => setImportData({ ...importData, redeId: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a rede" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {redes.map(rede => (
                                                <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>URL do Servidor Evolution</Label>
                                    <Input
                                        placeholder="Ex: https://api.suaevolution.com"
                                        value={importData.url}
                                        onChange={(e) => setImportData({ ...importData, url: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Global API Key</Label>
                                    <Input
                                        placeholder="Sua Global API Key"
                                        type="password"
                                        value={importData.token}
                                        onChange={(e) => setImportData({ ...importData, token: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsImportOpen(false)} disabled={isImporting}>Cancelar</Button>
                                <Button onClick={handleImport} disabled={isImporting}>
                                    {isImporting ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                                    {isImporting ? 'Importando...' : 'Importar Agora'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-9 gap-2">
                                <Plus size={16} /> Nova Instância
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nova Instância Evolution</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Rede</Label>
                                    <Select
                                        value={newInstance.redeId}
                                        onValueChange={(v) => setNewInstance({ ...newInstance, redeId: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a rede" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {redes.map(rede => (
                                                <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome da Instância</Label>
                                    <Input
                                        placeholder="Ex: rede_conchas"
                                        value={newInstance.instanceName}
                                        onChange={(e) => setNewInstance({ ...newInstance, instanceName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Token da Instância (API Key)</Label>
                                    <Input
                                        placeholder="Sua Global API Key"
                                        value={newInstance.instanceToken}
                                        onChange={(e) => setNewInstance({ ...newInstance, instanceToken: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>URL da Evolution API (Opcional)</Label>
                                    <Input
                                        placeholder="Ex: https://api.suaevolution.com"
                                        value={newInstance.apiUrl}
                                        onChange={(e) => setNewInstance({ ...newInstance, apiUrl: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground italic">Se vazio, usará a URL padrão configurada no servidor.</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                                <Button onClick={async () => {
                                    const toSave = { ...newInstance };

                                    if (!toSave.instanceName || !toSave.instanceToken || !toSave.redeId) {
                                        toast({ variant: 'destructive', title: 'Erro', description: 'Preencha o Nome, o Token e selecione a Rede' });
                                        return;
                                    }

                                    try {
                                        const saved = await saveWhatsAppInstance(toSave);
                                        setInstances([...instances, saved]);
                                        setIsAddOpen(false);
                                        setNewInstance({ instanceName: '', instanceToken: '', apiUrl: '', redeId: '' });
                                        toast({ title: 'Sucesso', description: 'Instância salva com sucesso' });
                                        router.refresh();
                                    } catch (error) {
                                        toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar instância' });
                                    }
                                }}>Salvar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Instâncias Ativas</CardTitle>
                    <CardDescription>Configure aqui as conexões com a Evolution API para cada rede.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Button variant="ghost" size="icon" onClick={toggleSelectAll}>
                                        {selectedIds.length === filteredInstances.length && filteredInstances.length > 0 ? (
                                            <CheckSquare className="h-4 w-4" />
                                        ) : (
                                            <Square className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TableHead>
                                <TableHead>Rede</TableHead>
                                <TableHead>Nome da Instância</TableHead>
                                <TableHead>API URL</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Número</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInstances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Nenhuma instância encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInstances.map((instance) => {
                                    const rede = redes.find(r => r.id === instance.redeId);
                                    return (
                                        <TableRow key={instance.id} className={selectedIds.includes(instance.id) ? "bg-muted/50" : ""}>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => toggleSelect(instance.id)}>
                                                    {selectedIds.includes(instance.id) ? (
                                                        <CheckSquare className="h-4 w-4" />
                                                    ) : (
                                                        <Square className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={instance.redeId}
                                                    onValueChange={async (newRedeId) => {
                                                        try {
                                                            const saved = await saveWhatsAppInstance({ id: instance.id, redeId: newRedeId });
                                                            setInstances(instances.map(i => i.id === saved.id ? saved : i));
                                                            toast({ title: 'Sucesso', description: 'Rede atualizada' });
                                                            router.refresh();
                                                        } catch (error) {
                                                            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao mudar rede' });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs w-[160px] bg-transparent border-none hover:bg-muted/50 transition-colors focus:ring-0 px-2 font-medium">
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <div className="h-2 w-2 rounded-full flex-shrink-0 bg-blue-500" />
                                                            <SelectValue>
                                                                {rede?.nome || 'Desconhecida'}
                                                            </SelectValue>
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {redes.map(r => (
                                                            <SelectItem key={r.id} value={r.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                                    {r.nome}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border">
                                                        <AvatarImage src={instance.profilePicUrl} alt={instance.instanceName} />
                                                        <AvatarFallback className="bg-muted">
                                                            {instance.profileName ? instance.profileName.substring(0, 2).toUpperCase() : <Smartphone className="h-4 w-4 text-muted-foreground" />}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{instance.instanceName}</span>
                                                        {instance.profileName && (
                                                            <span className="text-xs text-muted-foreground">{instance.profileName}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={instance.apiUrl || 'Padrão'}>
                                                {instance.apiUrl || 'Padrão'}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${instance.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {instance.status === 'open' ? 'Conectado' : 'Desconectado'}
                                                </span>
                                            </TableCell>
                                            <TableCell>{instance.phoneNumber || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" title="Conectar" onClick={() => setIsConnecting(instance)}>
                                                        <Smartphone size={16} className="text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditingInstance(instance)}>
                                                        <Edit2 size={16} className="text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDelete(instance.id)}>
                                                        <Trash2 size={16} className="text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog open={!!isConnecting} onOpenChange={(open) => !open && setIsConnecting(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Conectar WhatsApp: {isConnecting?.instanceName}</DialogTitle>
                    </DialogHeader>
                    {isConnecting && (
                        <div className="py-4">
                            <WhatsAppClient instance={isConnecting} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingInstance} onOpenChange={(open) => !open && setEditingInstance(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Instância</DialogTitle>
                    </DialogHeader>
                    {editingInstance && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Rede</Label>
                                <Select
                                    value={editingInstance.redeId}
                                    onValueChange={(v) => setEditingInstance({ ...editingInstance, redeId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a rede" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {redes.map(rede => (
                                            <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nome da Instância</Label>
                                <Input
                                    value={editingInstance.instanceName}
                                    onChange={(e) => setEditingInstance({ ...editingInstance, instanceName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Token da Instância</Label>
                                <Input
                                    value={editingInstance.instanceToken}
                                    onChange={(e) => setEditingInstance({ ...editingInstance, instanceToken: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>URL da Evolution API</Label>
                                <Input
                                    value={editingInstance.apiUrl || ''}
                                    onChange={(e) => setEditingInstance({ ...editingInstance, apiUrl: e.target.value })}
                                    placeholder="Deixe vazio para usar a padrão"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingInstance(null)}>Cancelar</Button>
                        <Button onClick={async () => {
                            if (editingInstance) {
                                const toSave = { ...editingInstance };

                                if (!toSave.instanceName || !toSave.instanceToken || !toSave.redeId) {
                                    toast({ variant: 'destructive', title: 'Erro', description: 'Preencha o Nome, o Token e selecione a Rede' });
                                    return;
                                }

                                try {
                                    const saved = await saveWhatsAppInstance(toSave);
                                    setInstances(instances.map(i => i.id === saved.id ? saved : i));
                                    setEditingInstance(null);
                                    toast({ title: 'Sucesso', description: 'Instância atualizada' });
                                    router.refresh();
                                } catch (error) {
                                    toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar instância' });
                                }
                            }
                        }}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
