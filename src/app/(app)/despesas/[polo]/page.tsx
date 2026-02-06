
'use client';

import { useState, useTransition, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, PlusCircle, ArrowLeft } from "lucide-react";
import { getDespesasDetalhadas, getCursos } from "@/lib/api";
import { addDespesaAction, deleteDespesaAction } from "@/actions/financial-records";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { Despesa, Polo, Curso } from "@/lib/types";

const commonExpenses = ["Aluguel", "Energia Elétrica", "Água", "Internet", "Telefone", "Marketing", "Salários"];

export default function PoloDespesaPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const polo = decodeURIComponent(params.polo as string);
    const ano = searchParams.get('ano');
    const mes = searchParams.get('mes');

    const [despesas, setDespesas] = useState<Despesa[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [isDataLoading, startDataLoading] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
    
    // Form state
    const [expenseMode, setExpenseMode] = useState<'geral' | 'curso' | 'nicho'>('geral');
    const [newDescricao, setNewDescricao] = useState("");
    const [newValor, setNewValor] = useState("");
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [selectedNiche, setSelectedNiche] = useState("");
    const [selectedCommonExpense, setSelectedCommonExpense] = useState("");
    
    const { toast } = useToast();

    const refreshData = useCallback(() => {
        if (polo && ano && mes) {
            startDataLoading(async () => {
                const despesasData = await getDespesasDetalhadas({ polo, ano: Number(ano), mes: Number(mes) });
                setDespesas(despesasData);
            });
        }
    }, [polo, ano, mes]);

    useEffect(() => {
        async function fetchInitialData() {
            const cursosData = await getCursos();
            setCursos(cursosData);
            refreshData();
        }
        fetchInitialData();
    }, [refreshData]);

    const cursoOptions = useMemo(() => {
        return cursos.map(c => ({ value: c.sigla, label: `${c.nome} (${c.sigla})` }));
    }, [cursos]);

    const nicheOptions = useMemo(() => {
        const niches = new Set(cursos.map(c => c.nicho).filter(Boolean));
        return Array.from(niches).map(n => ({ value: n!, label: n! }));
    }, [cursos]);
  
    const handleAddDespesa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!polo || !ano || !mes) return;

        if (expenseMode === 'curso') {
            if (selectedCourses.length === 0) {
                toast({ variant: "destructive", title: "Erro de Validação", description: "Selecione pelo menos um curso." });
                return;
            }
            const valuePerCourse = parseFloat(newValor || '0') / selectedCourses.length;

            startSaving(async () => {
                const promises = selectedCourses.map(courseSigla => {
                    const cursoSelecionado = cursos.find(c => c.sigla === courseSigla);
                    if (!cursoSelecionado) return Promise.resolve({ success: false, message: `Curso com sigla ${courseSigla} não encontrado.` });

                    return addDespesaAction({
                        polo,
                        referencia_ano: Number(ano),
                        referencia_mes: Number(mes),
                        tipo_despesa: cursoSelecionado.tipo as 'EAD' | 'HIBRIDO',
                        sigla_curso: cursoSelecionado.sigla,
                        descricao: `Despesa para curso: ${cursoSelecionado.nome}`,
                        valor: valuePerCourse,
                    });
                });

                const results = await Promise.all(promises);
                const successful = results.filter(r => r?.success).length;
                if (successful > 0) {
                    refreshData();
                    setSelectedCourses([]);
                    setNewValor("");
                    toast({ title: "Sucesso", description: `${successful} despesas de curso adicionadas.` });
                }
                const failedCount = results.length - successful;
                if (failedCount > 0) {
                     toast({ variant: "destructive", title: "Falha Parcial", description: `${failedCount} despesas de curso falharam ao serem adicionadas.` });
                }
            });

        } else if (expenseMode === 'nicho') {
            if (!selectedNiche) {
                toast({ variant: "destructive", title: "Erro de Validação", description: "Selecione um nicho." });
                return;
            }
             startSaving(async () => {
                const result = await addDespesaAction({
                    polo,
                    referencia_ano: Number(ano),
                    referencia_mes: Number(mes),
                    tipo_despesa: 'NICHO',
                    nicho_curso: selectedNiche,
                    descricao: `Despesa para nicho: ${selectedNiche}`,
                    valor: parseFloat(newValor || '0'),
                });
                 if (result.success) {
                    refreshData();
                    setNewValor("");
                    setSelectedNiche("");
                    toast({ title: "Sucesso", description: "Despesa de nicho adicionada." });
                } else {
                    toast({ variant: "destructive", title: "Erro", description: result.message });
                }
             });
        } else { // 'geral'
            let descricaoFinal = newDescricao;
            if (selectedCommonExpense === 'Outros') {
                if (!newDescricao) {
                    toast({ variant: "destructive", title: "Erro de Validação", description: "A descrição é obrigatória para 'Outros'." });
                    return;
                }
                descricaoFinal = newDescricao;
            } else {
                 if (!selectedCommonExpense) {
                    toast({ variant: "destructive", title: "Erro de Validação", description: "Selecione um tipo de despesa." });
                    return;
                }
                descricaoFinal = selectedCommonExpense;
            }
            startSaving(async () => {
                const result = await addDespesaAction({
                    polo,
                    referencia_ano: Number(ano),
                    referencia_mes: Number(mes),
                    tipo_despesa: 'GERAL',
                    descricao: descricaoFinal,
                    valor: parseFloat(newValor || '0'),
                });
                if (result.success) {
                    refreshData();
                    setNewDescricao("");
                    setNewValor("");
                    setSelectedCommonExpense("");
                    toast({ title: "Sucesso", description: "Despesa adicionada." });
                } else {
                    toast({ variant: "destructive", title: "Erro ao adicionar", description: result.message });
                }
            });
        }
    }

    const handleDeleteDespesa = (id: string) => {
        startDeleting(async () => {
            const result = await deleteDespesaAction(id);
            if (result.success) {
                refreshData();
                toast({ title: "Sucesso", description: "Despesa removida." });
            } else {
                toast({ variant: "destructive", title: "Erro ao remover", description: result.message });
            }
        });
    }
    
    const handleCommonExpenseClick = (expense: string) => {
        setSelectedCommonExpense(expense);
        if (expense !== 'Outros') {
            setNewDescricao('');
        }
    }


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                 </Button>
                 <div>
                    <h1 className="text-2xl font-bold">Lançar Despesas: {polo}</h1>
                    <p className="text-muted-foreground">Período: {String(mes).padStart(2, '0')}/{ano}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Adicionar Nova Despesa</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddDespesa} className="space-y-6">
                           <div className="space-y-2">
                                <Label>Tipo de Lançamento</Label>
                                <RadioGroup value={expenseMode} onValueChange={(v) => setExpenseMode(v as any)} className="flex gap-2 sm:gap-4 flex-wrap">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="geral" id="r-geral" />
                                        <Label htmlFor="r-geral">Geral</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="curso" id="r-curso" />
                                        <Label htmlFor="r-curso">Por Curso</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="nicho" id="r-nicho" />
                                        <Label htmlFor="r-nicho">Por Nicho</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            
                            {expenseMode === 'curso' && (
                                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                                    <Label>Cursos</Label>
                                    <MultiSelect
                                        options={cursoOptions}
                                        onValueChange={setSelectedCourses}
                                        defaultValue={selectedCourses}
                                        placeholder="Selecione um ou mais cursos..."
                                        className="w-full"
                                    />
                                </div>
                            )}

                            {expenseMode === 'nicho' && (
                                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                                    <Label>Nicho de Cursos</Label>
                                     <Select value={selectedNiche} onValueChange={setSelectedNiche}>
                                        <SelectTrigger><SelectValue placeholder="Selecione um nicho..." /></SelectTrigger>
                                        <SelectContent>
                                            {nicheOptions.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {expenseMode === 'geral' && (
                                <div className="space-y-4 p-4 border rounded-md">
                                    <Label>Despesa Geral</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {commonExpenses.map(exp => (
                                            <Button
                                                key={exp}
                                                type="button"
                                                variant={selectedCommonExpense === exp ? "secondary" : "outline"}
                                                onClick={() => handleCommonExpenseClick(exp)}
                                                size="sm"
                                            >
                                                {exp}
                                            </Button>
                                        ))}
                                         <Button
                                                type="button"
                                                variant={selectedCommonExpense === 'Outros' ? "secondary" : "outline"}
                                                onClick={() => handleCommonExpenseClick('Outros')}
                                                size="sm"
                                            >
                                                Outros
                                            </Button>
                                    </div>
                                    {selectedCommonExpense === 'Outros' && (
                                        <div className="space-y-2 pt-2">
                                            <Label htmlFor="descricao-outros">Descrição (Outros)</Label>
                                            <Input id="descricao-outros" value={newDescricao} onChange={e => setNewDescricao(e.target.value)} placeholder="Ex: Material de Escritório" required />
                                        </div>
                                    )}
                                </div>
                            )}

                             <div className="space-y-2">
                                <Label htmlFor="valor">Valor Total da Despesa (R$)</Label>
                                <Input id="valor" type="number" value={newValor} onChange={e => setNewValor(e.target.value)} placeholder="1500.00" step="0.01" required />
                            </div>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                                Adicionar Despesa
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Despesas Lançadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[450px] w-full rounded-md border">
                            {isDataLoading ? (
                                <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead className="text-center">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {despesas.length > 0 ? (
                                        despesas.map(d => (
                                            <TableRow key={d.id}>
                                                <TableCell className="font-medium">{d.descricao}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{d.tipo_despesa}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(d.valor)}</TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteDespesa(d.id)} disabled={isDeleting}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={4} className="text-center h-24">Nenhuma despesa lançada neste período.</TableCell></TableRow>
                                    )}
                                    </TableBody>
                                </Table>
                            )}
                        </ScrollArea>
                    </CardContent>
                 </Card>
            </div>
        </div>
    );
}
