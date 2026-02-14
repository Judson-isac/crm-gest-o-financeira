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
import { Plus, Trash2, Smartphone, RefreshCw } from 'lucide-react';
import { saveWhatsAppInstance, deleteWhatsAppInstance } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppManagerProps {
    initialInstances: WhatsAppInstance[];
    redes: Rede[];
}

export function WhatsAppManager({ initialInstances, redes }: WhatsAppManagerProps) {
    const { toast } = useToast();
    const [instances, setInstances] = useState<WhatsAppInstance[]>(initialInstances);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newInstance, setNewInstance] = useState<Partial<WhatsAppInstance>>({
        instanceName: '',
        instanceToken: '',
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
            setNewInstance({ instanceName: '', instanceToken: '', redeId: '' });
            toast({ title: 'Sucesso', description: 'Instância salva com sucesso' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar instância' });
            console.error(error);
        }
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
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                                <TableHead>Rede</TableHead>
                                <TableHead>Nome da Instância</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Número</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {instances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Nenhuma instância cadastrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                instances.map((instance) => {
                                    const rede = redes.find(r => r.id === instance.redeId);
                                    return (
                                        <TableRow key={instance.id}>
                                            <TableCell className="font-medium">{rede?.nome || 'N/A'}</TableCell>
                                            <TableCell>{instance.instanceName}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${instance.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {instance.status === 'open' ? 'Conectado' : 'Desconectado'}
                                                </span>
                                            </TableCell>
                                            <TableCell>{instance.phoneNumber || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(instance.id)}>
                                                    <Trash2 size={16} className="text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
