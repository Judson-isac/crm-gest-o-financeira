'use client';

import { useState } from 'react';
import { WhatsAppInstance, Rede } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Smartphone, RefreshCw, Search, CheckSquare, Square, Edit2 } from 'lucide-react';
import { saveWhatsAppInstance, deleteWhatsAppInstance } from '@/lib/db';
import { syncInstanceData, fetchInstancesFromServer, getQRCode } from '@/lib/evolution';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppClient } from '../whatsapp/whatsapp-client';

interface WhatsAppManagerProps {
    initialInstances: WhatsAppInstance[];
    redes: Rede[];
}

export function WhatsAppManager({ initialInstances, redes }: WhatsAppManagerProps) {
    const { toast } = useToast();
    const [instances, setInstances] = useState<WhatsAppInstance[]>(initialInstances);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importData, setImportData] = useState({ url: '', token: '', redeId: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnecting, setIsConnecting] = useState<WhatsAppInstance | null>(null);
    const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
    const [newInstance, setNewInstance] = useState<Partial<WhatsAppInstance>>({
        instanceName: '',
        instanceToken: '',
        apiUrl: '',
        redeId: '',
    });

    const handleSave = async () => {
        if (!newInstance.instanceName || !newInstance.instanceToken || !newInstance.redeId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todos os campos obrigatórios' });
            return;
        }

        try {
            const saved = await saveWhatsAppInstance(newInstance);
            setInstances([...instances, saved]);
            setIsAddOpen(false);
            setNewInstance({ instanceName: '', instanceToken: '', apiUrl: '', redeId: '' });
            toast({ title: 'Sucesso', description: 'Instância salva com sucesso' });
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
            // Reload instances (ideally we would have a way to fetch all from DB again, 
            // but for now, we can just say success or wait for revalidatePath to kick in if using Server Props)
            // Since this is a client component with initialInstances, we might need a refresh logic.
            toast({ title: 'Sincronização iniciada', description: 'Os status estão sendo atualizados em segundo plano.' });
            // For simple state update, we could wait a bit then window.location.reload() or just trust the next interval
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao sincronizar instâncias' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleImport = async () => {
        if (!importData.url || !importData.token || !importData.redeId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todos os campos' });
            return;
        }

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

            toast({ title: 'Importação concluída', description: `${importedCount} instâncias importadas, ${skippedCount} já existiam.` });
            setIsImportOpen(false);
            window.location.reload();
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
        return i.instanceName.toLowerCase().includes(search) ||
            rede?.nome.toLowerCase().includes(search);
    });

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
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Gerenciar WhatsApp</h1>
                <div className="flex flex-wrap gap-2">
                    <div className="relative mr-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou rede..."
                            className="pl-8 w-[250px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex gap-2 mr-2 border-r pr-2">
                            <Button variant="outline" size="sm" onClick={handleBulkSync} disabled={isSyncing}>
                                <RefreshCw size={14} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar ({selectedIds.length})
                            </Button>
                            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                                <Trash2 size={14} className="mr-2" /> Excluir ({selectedIds.length})
                            </Button>
                        </div>
                    )}

                    <Button variant="outline" onClick={handleSyncAll} disabled={isSyncing}>
                        <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar Todos
                    </Button>

                    <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                                <RefreshCw size={16} /> Importar Servidor
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
                            <Button className="flex items-center gap-2">
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
                                        placeholder="Token da Evolution API"
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
                                <Button onClick={handleSave}>Salvar</Button>
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
                                            <TableCell className="font-medium">{rede?.nome || 'N/A'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{instance.instanceName}</span>
                                                    {instance.profileName && (
                                                        <span className="text-xs text-muted-foreground">{instance.profileName}</span>
                                                    )}
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
                                try {
                                    const saved = await saveWhatsAppInstance(editingInstance);
                                    setInstances(instances.map(i => i.id === saved.id ? saved : i));
                                    setEditingInstance(null);
                                    toast({ title: 'Sucesso', description: 'Instância atualizada' });
                                } catch (error) {
                                    toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar instância' });
                                }
                            }
                        }}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
