'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Power, Pencil, Loader2, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { DatePicker } from '../ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Campanha } from '@/lib/types';
import { saveCampanhaAction, deleteCampanhaAction } from '@/actions/cadastros';

export function CampanhasManager({ initialCampanhas }: { initialCampanhas: Campanha[] }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [view, setView] = useState<'list' | 'form'>('list');
    const [activeTab, setActiveTab] = useState('Ativo');
    const [editingCampanha, setEditingCampanha] = useState<Partial<Campanha> | null>(null);

    // Form state
    const [nome, setNome] = useState('');
    const [dataInicial, setDataInicial] = useState<Date | undefined>();
    const [dataFinal, setDataFinal] = useState<Date | undefined>();
    const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

    const openForm = (campanha: Campanha | null = null) => {
        setEditingCampanha(campanha);
        if (campanha) {
            setNome(campanha.nome);
            setDataInicial(campanha.dataInicial ? new Date(campanha.dataInicial) : undefined);
            setDataFinal(campanha.dataFinal ? new Date(campanha.dataFinal) : undefined);
            setStatus(campanha.status);
        } else {
            setNome('');
            setDataInicial(undefined);
            setDataFinal(undefined);
            setStatus('Ativo');
        }
        setView('form');
    };

    const closeForm = () => {
        setEditingCampanha(null);
        setView('list');
    };

    const handleSave = () => {
        if (!nome || !dataInicial || !dataFinal) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha todos os campos marcados com *.' });
            return;
        }

        startTransition(async () => {
            const result = await saveCampanhaAction({
                id: editingCampanha?.id,
                nome,
                dataInicial,
                dataFinal,
                status,
            });
            if (result.success) {
                toast({ title: editingCampanha ? 'Campanha atualizada!' : 'Campanha criada!' });
                closeForm();
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const handleToggleStatus = (campanha: Campanha) => {
        startTransition(async () => {
            const newStatus = campanha.status === 'Ativo' ? 'Inativo' : 'Ativo';
            // Only send necessary fields, exclude 'rede' which is from join
            const { rede, ...campanhaData } = campanha as any;
            const result = await saveCampanhaAction({ ...campanhaData, status: newStatus });
            if (result.success) {
                toast({ title: 'Status alterado!' });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    const campanhas = initialCampanhas.filter(c => c.status === activeTab);

    if (view === 'form') {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-foreground">{editingCampanha ? 'Editar Campanha' : 'Nova Campanha'}</h1>
                    <Button variant="secondary" onClick={closeForm}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="nome">Nome *</Label>
                                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="data-inicial">Data inicial *</Label>
                                    <DatePicker value={dataInicial} onValueChange={setDataInicial} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="data-final">Data final *</Label>
                                    <DatePicker value={dataFinal} onValueChange={setDataFinal} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={status} onValueChange={(val) => setStatus(val as 'Ativo' | 'Inativo')}>
                                        <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ativo">Ativo</SelectItem>
                                            <SelectItem value="Inativo">Inativo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-4">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar
                                </Button>
                                <Button type="button" variant="secondary" onClick={closeForm}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Campanhas</CardTitle>
                        <Button onClick={() => openForm()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Campanha
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="busca">Busca</Label>
                                <Input id="busca" placeholder="Nome" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ordenar-por">Ordenar por</Label>
                                <Select defaultValue="nome-az">
                                    <SelectTrigger id="ordenar-por">
                                        <SelectValue placeholder="Ordenar por" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="nome-az">Nome (A-Z)</SelectItem>
                                        <SelectItem value="nome-za">Nome (Z-A)</SelectItem>
                                        <SelectItem value="data-recente">Data (recente)</SelectItem>
                                        <SelectItem value="data-antiga">Data (antiga)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2 items-end">
                                <Button variant="secondary">
                                    <Search className="mr-2 h-4 w-4" />
                                    Filtrar
                                </Button>
                                <Button variant="destructive-outline">
                                    Limpar
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                        <TabsList>
                            <TabsTrigger value="Ativo">Ativas</TabsTrigger>
                            <TabsTrigger value="Inativo">Inativas</TabsTrigger>
                        </TabsList>
                        <TabsContent value={activeTab}>
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>NOME</TableHead>
                                            <TableHead>DATA INICIAL</TableHead>
                                            <TableHead>DATA FINAL</TableHead>
                                            <TableHead>STATUS</TableHead>
                                            <TableHead className="text-right">AÇÕES</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {campanhas.map(campanha => (
                                            <TableRow key={campanha.id}>
                                                <TableCell className="font-medium text-primary">{campanha.nome}</TableCell>
                                                <TableCell>{format(new Date(campanha.dataInicial), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</TableCell>
                                                <TableCell>{format(new Date(campanha.dataFinal), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</TableCell>
                                                <TableCell>
                                                    <Badge variant={campanha.status === 'Ativo' ? 'secondary' : 'destructive'} className={campanha.status === 'Ativo' ? "bg-green-100 text-green-800" : ""}>
                                                        {campanha.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleToggleStatus(campanha)} disabled={isPending}>
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-yellow-600" onClick={() => openForm(campanha)} disabled={isPending}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {campanhas.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">Nenhuma campanha encontrada.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </>
    );
}
