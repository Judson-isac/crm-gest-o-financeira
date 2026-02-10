'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    Loader2,
    UserPlus,
    Paperclip,
    Trash2,
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import type { Curso, Campanha, ProcessoSeletivo, TipoCurso, Canal, Matricula, Usuario } from '@/lib/types';
import { saveMatriculaAction } from '@/actions/matriculas';

type NovaMatriculaFormProps = {
    courses: Curso[];
    polos: string[];
    cidades: string[];
    estados: string[];
    campaigns: Campanha[];
    selectionProcesses: ProcessoSeletivo[];
    courseTypes: TipoCurso[];
    marketingChannels: Canal[];
    initialData?: Matricula;
    isEditing?: boolean;
    users?: Omit<Usuario, 'senha'>[];
    canAssignUser?: boolean;
};

export function NovaMatriculaForm({
    courses = [],
    polos = [],
    cidades = [],
    estados = [],
    campaigns = [],
    selectionProcesses = [],
    courseTypes = [],
    marketingChannels = [],
    initialData,
    isEditing = false,
    users = [],
    canAssignUser = false,
}: NovaMatriculaFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSaving, startSaving] = useTransition();
    const [isUploading, setIsUploading] = useState(false);

    // States for dynamic filtering
    const [selectedTipoCursoId, setSelectedTipoCursoId] = useState<string | undefined>(initialData?.tipoCursoId);
    const [selectedCursoSigla, setSelectedCursoSigla] = useState<string | undefined>(initialData?.cursoSigla);

    // Dynamic filtering of courses based on selected type
    const filteredCourses = useMemo(() => {
        if (!selectedTipoCursoId) return courses;

        const selectedType = courseTypes.find(t => t.id === selectedTipoCursoId);
        if (!selectedType) return courses;

        // Filtering rule: match course.tipo with type.nome (case insensitive or exact)
        // Usually course.tipo is 'EAD', 'HIBRIDO', etc.
        return courses.filter(c =>
            c.tipo === selectedType.nome ||
            c.tipo === selectedType.sigla ||
            // Fallback if there's no direct match, could be empty list or all
            !c.tipo
        );
    }, [courses, selectedTipoCursoId, courseTypes]);

    // Clear course selection when type changes
    useEffect(() => {
        if (selectedTipoCursoId && selectedCursoSigla) {
            const courseInType = filteredCourses.find(c => c.sigla === selectedCursoSigla);
            if (!courseInType) {
                setSelectedCursoSigla(undefined);
            }
        }
    }, [selectedTipoCursoId, filteredCourses, selectedCursoSigla]);

    const courseOptions = useMemo(() => {
        return filteredCourses.map(curso => ({
            value: curso.sigla,
            label: `${curso.nome} ${curso.tipo ? `- ${curso.tipo}` : ''} (${curso.sigla})`
        }));
    }, [filteredCourses]);

    // Currency formatter function
    const formatCurrency = (value: string) => {
        const numericValue = value.replace(/\D/g, '');
        const floatValue = parseFloat(numericValue) / 100;
        return floatValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!value) return;
        e.target.value = formatCurrency(value);
    };

    // Fix hydration error: Initialize with undefined if no initialData, set to new Date() in effect
    const [dataMatricula, setDataMatricula] = useState<Date | undefined>(
        initialData?.dataMatricula ? new Date(initialData.dataMatricula) : undefined
    );

    useEffect(() => {
        if (!initialData?.dataMatricula) {
            setDataMatricula(new Date());
        }
    }, [initialData]);

    const [existingAnexos, setExistingAnexos] = useState<string[]>(initialData?.anexos || []);

    const handleRemoveAnexo = (indexToRemove: number) => {
        setExistingAnexos(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        if (!dataMatricula) {
            toast({ variant: 'destructive', title: 'Data de matrícula é obrigatória' });
            return;
        }

        startSaving(async () => {
            // Upload files first
            const fileFormData = new FormData();
            const files = formData.getAll('anexos').filter((f): f is File => f instanceof File);
            const hasFiles = files.some(f => f.size > 0);

            if (hasFiles) {
                setIsUploading(true);
                files.forEach((file) => {
                    fileFormData.append('files', file);
                    console.log(`[NovaMatriculaForm] Appending file: ${file.name} (${file.size} bytes)`);
                });

                // Debug FormData content
                const keys = Array.from((fileFormData as any).keys());
                console.log(`[NovaMatriculaForm] FormData keys before sending:`, keys);
            }

            // Always call action to get potential empty list or handle logic, 
            // but if we have files, we expect success with files.
            // Use API Route instead of Server Action for better reliability
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: fileFormData,
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const uploadResult = await response.json();

                if (!uploadResult.success) {
                    toast({ variant: 'destructive', title: 'Erro no upload', description: uploadResult.message || 'Falha ao enviar arquivos.' });
                    setIsUploading(false);
                    return;
                }

                var newAttachments = uploadResult.files || [];
            } catch (error: any) {
                console.error('Upload failed:', error);
                toast({ variant: 'destructive', title: 'Erro no upload', description: 'Falha de comunicação com o servidor.' });
                setIsUploading(false);
                return;
            }

            setIsUploading(false);
            // Use current state of existing attachments instead of initial data
            const existingAttachments = existingAnexos;

            // Merge existing and new attachments to avoid overwriting on edit
            const anexos = [...existingAttachments, ...newAttachments];

            const matriculaData = {
                id: initialData?.id,
                usuarioId: canAssignUser ? (formData.get('responsavel') as string || undefined) : undefined,
                dataMatricula: dataMatricula,
                processoSeletivoId: formData.get('processo-seletivo') as string || undefined,
                polo: formData.get('polo') as string,
                estado: formData.get('estado') as string,
                cidade: formData.get('cidade') as string,
                nomeAluno: formData.get('nome') as string,
                telefone: formData.get('telefone') as string || undefined,
                ra: formData.get('ra') as string || undefined,
                tipoCursoId: formData.get('tipo-curso') as string || undefined,
                cursoSigla: formData.get('curso') as string,
                campanhaId: formData.get('campanha') as string || undefined,
                canalId: formData.get('canal') as string || undefined,
                primeiraMensalidade: formData.get('r$-1a-mensalidade') ? parseFloat((formData.get('r$-1a-mensalidade') as string).replace(/[^\d,]/g, '').replace(',', '.')) : undefined,
                segundaMensalidade: parseFloat((formData.get('r$-2a-mensalidade') as string).replace(/[^\d,]/g, '').replace(',', '.')),
                bolsaGestor: formData.get('bolsa-gestor') ? parseFloat((formData.get('bolsa-gestor') as string).replace(',', '.')) : undefined,
                anexos,
            };

            const result = await saveMatriculaAction(matriculaData);
            if (result.success) {
                toast({
                    title: isEditing ? 'Matrícula atualizada!' : 'Matrícula Realizada!',
                    description: isEditing ? 'A matrícula foi atualizada com sucesso.' : 'O novo aluno foi matriculado com sucesso.',
                });
                router.push('/matricula/listar');
            } else {
                toast({ variant: 'destructive', title: 'Erro!', description: result.message });
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Registrar Nova Matrícula</CardTitle>
                    <CardDescription>Preencha os dados abaixo para registrar uma nova matrícula no sistema.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            {canAssignUser && (
                                <div className="space-y-2 md:col-span-1">
                                    <Label htmlFor="responsavel">Responsável</Label>
                                    <Select name="responsavel" defaultValue={initialData?.usuarioId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map(user => (
                                                <SelectItem key={user.id} value={user.id}>{user.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="data-matricula">Data de Matrícula *</Label>
                                <DatePicker value={dataMatricula} onValueChange={setDataMatricula} />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="processo-seletivo">Processo Seletivo</Label>
                                <Select name="processo-seletivo" defaultValue={initialData?.processoSeletivoId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="--------" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectionProcesses.map(item => (
                                            <SelectItem key={item.id} value={item.id}>{`${item.numero}/${item.ano}`}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="polo">Polo *</Label>
                                <Select name="polo" required disabled={polos.length === 0} defaultValue={initialData?.polo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={polos.length === 0 ? 'Sem polos' : 'Selecione'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {polos.map(polo => (
                                            <SelectItem key={polo} value={polo}>
                                                {polo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="estado">Estado *</Label>
                                <Select name="estado" required disabled={estados.length === 0} defaultValue={initialData?.estado}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={estados.length === 0 ? 'Sem estados' : 'Selecione'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {estados.map(estado => (
                                            <SelectItem key={estado} value={estado}>
                                                {estado}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="cidade">Cidade *</Label>
                                <Select name="cidade" required disabled={cidades.length === 0} defaultValue={initialData?.cidade}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={cidades.length === 0 ? 'Sem cidades' : 'Selecione'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cidades.map(cidade => (
                                            <SelectItem key={cidade} value={cidade}>
                                                {cidade}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Dados do Aluno</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="nome">Nome Completo do Aluno *</Label>
                                    <Input id="nome" name="nome" required defaultValue={initialData?.nomeAluno} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefone">Telefone</Label>
                                    <Input id="telefone" name="telefone" placeholder="(99) 99999-9999" defaultValue={initialData?.telefone} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ra">RA</Label>
                                    <Input id="ra" name="ra" defaultValue={initialData?.ra} />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Informações do Curso</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2 md:col-span-1">
                                    <Label htmlFor="tipo-curso">Tipo de Curso *</Label>
                                    <Select
                                        name="tipo-curso"
                                        required
                                        disabled={courseTypes.length === 0}
                                        defaultValue={initialData?.tipoCursoId}
                                        onValueChange={setSelectedTipoCursoId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={courseTypes.length === 0 ? 'Nenhum tipo importado' : 'Selecione o tipo'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courseTypes.map(tipo => (
                                                <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="curso">Curso *</Label>
                                    <Combobox
                                        options={courseOptions}
                                        value={selectedCursoSigla || ""}
                                        onValueChange={setSelectedCursoSigla}
                                        placeholder={courses.length === 0 ? 'Nenhum curso importado' : 'Pesquisar ou selecionar curso...'}
                                        emptyText="Nenhum curso encontrado."
                                    />
                                    {/* Input oculto para manter compatibilidade com FormData */}
                                    <input type="hidden" name="curso" value={selectedCursoSigla || ""} required />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="campanha">Campanha</Label>
                                    <Select name="campanha" disabled={campaigns.length === 0} defaultValue={initialData?.campanhaId || undefined}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="--------" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {campaigns.map(item => (
                                                <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="canal">Canal</Label>
                                    <Select name="canal" disabled={marketingChannels.length === 0} defaultValue={initialData?.canalId || undefined}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="--------" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {marketingChannels.map(canal => (
                                                <SelectItem key={canal.id} value={canal.id}>{canal.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Informações de Mensalidade</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="r$-1a-mensalidade">R$ 1ª Mensalidade</Label>
                                    <Input
                                        id="r$-1a-mensalidade"
                                        name="r$-1a-mensalidade"
                                        placeholder="R$ 0,00"
                                        defaultValue={initialData?.primeiraMensalidade ? initialData.primeiraMensalidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                                        onChange={handleCurrencyChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="r$-2a-mensalidade">R$ 2ª Mensalidade *</Label>
                                    <Input
                                        id="r$-2a-mensalidade"
                                        name="r$-2a-mensalidade"
                                        placeholder="R$ 0,00"
                                        required
                                        defaultValue={initialData?.segundaMensalidade ? initialData.segundaMensalidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                                        onChange={handleCurrencyChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bolsa-gestor">Bolsa Gestor (%)</Label>
                                    <Input
                                        id="bolsa-gestor"
                                        name="bolsa-gestor"
                                        placeholder="0%"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        defaultValue={initialData?.bolsaGestor?.toString() || ''}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Anexos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="anexos">Contrato e Documentação</Label>

                                    {/* Lista de anexos existentes */}
                                    {existingAnexos.length > 0 && (
                                        <div className="mb-4 space-y-2">
                                            <Label className="text-muted-foreground text-xs">Arquivos já anexados:</Label>
                                            <ul className="space-y-2">
                                                {existingAnexos.map((anexo, index) => {
                                                    const fileName = anexo.split('/').pop() || `Anexo ${index + 1}`;
                                                    return (
                                                        <li key={index} className="flex items-center justify-between gap-2 text-sm bg-muted/50 p-2 rounded-md group">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                                <a
                                                                    href={anexo}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline truncate"
                                                                >
                                                                    {fileName}
                                                                </a>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleRemoveAnexo(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Input id="anexos" name="anexos" type="file" multiple />
                                        <Button type="button" variant="outline" size="icon">
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Selecione novos arquivos para adicionar. Os arquivos existentes serão mantidos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 p-6">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving || isUploading}>
                            {(isSaving || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isUploading ? 'Enviando Anexos...' : (isSaving ? 'Salvando...' : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Salvar Matrícula
                                </>
                            ))}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
