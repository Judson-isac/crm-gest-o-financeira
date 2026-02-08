'use client';

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Loader2, Paperclip } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from "next/link";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Matricula } from '@/lib/types';
import { deleteMatriculaAction } from '@/actions/matriculas';

type MatriculasListProps = {
    initialMatriculas: Matricula[];
};

export function MatriculasList({ initialMatriculas }: MatriculasListProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [matriculas] = useState(initialMatriculas);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPolo, setSelectedPolo] = useState('all');
    const [filtroAnexo, setFiltroAnexo] = useState('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [matriculaToDelete, setMatriculaToDelete] = useState<string | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();

    const uniquePolos = Array.from(new Set(matriculas.map(m => m.polo))).sort();

    const filteredMatriculas = matriculas.filter(m => {
        const matchesSearch =
            m.nomeAluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.ra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.cursoSigla.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesPolo = selectedPolo === 'all' || m.polo === selectedPolo;

        const matchesAnexo =
            filtroAnexo === 'all' ||
            (filtroAnexo === 'com_anexo' && m.anexos && m.anexos.length > 0) ||
            (filtroAnexo === 'sem_anexo' && (!m.anexos || m.anexos.length === 0));

        return matchesSearch && matchesPolo && matchesAnexo;
    });

    const handleDeleteClick = (id: string) => {
        setMatriculaToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!matriculaToDelete) return;

        startDeleteTransition(async () => {
            const result = await deleteMatriculaAction(matriculaToDelete);
            if (result.success) {
                toast({ title: 'Matrícula excluída com sucesso!' });
                setDeleteDialogOpen(false);
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Erro ao excluir', description: result.message });
            }
        });
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Matrículas</CardTitle>
                        <Button asChild>
                            <Link href="/matricula/nova">
                                <Plus className="mr-2 h-4 w-4" />
                                Nova Matrícula
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="busca">Busca</Label>
                                <Input
                                    id="busca"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="filtro-polo">Polo</Label>
                                <Select value={selectedPolo} onValueChange={setSelectedPolo}>
                                    <SelectTrigger id="filtro-polo">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {uniquePolos.map(polo => (
                                            <SelectItem key={polo} value={polo}>{polo}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="filtro-anexo">Comprovante</Label>
                                <Select value={filtroAnexo} onValueChange={setFiltroAnexo}>
                                    <SelectTrigger id="filtro-anexo">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="com_anexo">Com Comprovante</SelectItem>
                                        <SelectItem value="sem_anexo">Pendente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="processo-seletivo">Processo Seletivo</Label>
                                <Select>
                                    <SelectTrigger id="processo-seletivo">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ordenar-por">Ordenar por</Label>
                                <Select defaultValue="data-recente">
                                    <SelectTrigger id="ordenar-por">
                                        <SelectValue placeholder="Ordenar por" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="data-recente">Data (recente)</SelectItem>
                                        <SelectItem value="data-antiga">Data (antiga)</SelectItem>
                                        <SelectItem value="aluno-az">Aluno (A-Z)</SelectItem>
                                        <SelectItem value="aluno-za">Aluno (Z-A)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2 items-end">
                                <Button variant="secondary" className="w-full">
                                    <Search className="mr-2 h-4 w-4" />
                                    Filtrar
                                </Button>
                                <Button variant="destructive-outline" size="icon" onClick={() => {
                                    setSearchTerm('');
                                    setSelectedPolo('all');
                                    setFiltroAnexo('all');
                                }}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead className="w-[50px] text-center" title="Comprovante"><Paperclip className="h-4 w-4 mx-auto" /></TableHead>
                                    <TableHead>DATA</TableHead>
                                    <TableHead>ALUNO</TableHead>
                                    <TableHead>CURSO</TableHead>
                                    <TableHead>POLO / CAMPANHA / CANAL</TableHead>
                                    <TableHead className="text-right">AÇÕES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMatriculas.length > 0 ? (
                                    filteredMatriculas.map((matricula, index) => (
                                        <TableRow
                                            key={matricula.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => router.push(`/matricula/ver/${matricula.id}`)}
                                        >
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="text-center">
                                                {matricula.anexos && matricula.anexos.length > 0 ? (
                                                    <div className="h-3 w-3 rounded-full bg-green-500 mx-auto" title="Com Anexos" />
                                                ) : (
                                                    <div className="h-3 w-3 rounded-full bg-red-500 mx-auto" title="Sem Anexos" />
                                                )}
                                            </TableCell>
                                            <TableCell>{format(new Date(matricula.dataMatricula), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                                            <TableCell className="font-medium">{matricula.nomeAluno}</TableCell>
                                            <TableCell>{matricula.cursoSigla}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {matricula.polo}
                                                {matricula.campanhaId && ` / Campanha`}
                                                {matricula.canalId && ` / Canal`}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Link href={`/matricula/editar/${matricula.id}`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(matricula.id);
                                                    }}
                                                    disabled={isDeleting}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            Nenhum registro encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta matrícula? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
