'use client';

import { useState, useTransition, useEffect } from 'react';
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
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import type { Curso, Campanha, ProcessoSeletivo, TipoCurso, Canal, Matricula } from '@/lib/types';
import { saveMatriculaAction, uploadMatriculaFilesAction } from '@/actions/matriculas';

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
};

export function NovaMatriculaForm({
    courses,
    polos,
    cidades,
    estados,
    campaigns,
    selectionProcesses,
    courseTypes,
    marketingChannels,
    initialData,
    isEditing = false,
}: NovaMatriculaFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSaving, startSaving] = useTransition();

    // Fix hydration error: Initialize with undefined if no initialData, set to new Date() in effect
    const [dataMatricula, setDataMatricula] = useState<Date | undefined>(
        initialData?.dataMatricula ? new Date(initialData.dataMatricula) : undefined
    );

    useEffect(() => {
        if (!initialData?.dataMatricula) {
            setDataMatricula(new Date());
        }
    }, [initialData]);

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
            const files = formData.getAll('anexos');
            const hasFiles = files.some(f => f instanceof File && f.size > 0);

            if (hasFiles) {
                console.log(`[NovaMatriculaForm] Uploading ${files.length} files...`); // Log restaurado para garantir estabilidade
                files.forEach((file) => fileFormData.append('files', file));
            }

            // Always call action to get potential empty list or handle logic, 
            // but if we have files, we expect success with files.
            const uploadResult = await uploadMatriculaFilesAction(fileFormData);

            if (!uploadResult.success) {
                toast({ variant: 'destructive', title: 'Erro no upload', description: uploadResult.message });
                return; // Stop execution if upload fails
            }

            // Validação extra: Se enviamos arquivos mas o servidor não salvou nenhum
            if (hasFiles && (!uploadResult.files || uploadResult.files.length === 0)) {
                console.error('Erro: Arquivos detectados no formulário mas não retornados pelo servidor.');
                toast({ variant: 'destructive', title: 'Erro no processamento', description: 'O servidor não identificou os arquivos enviados. Tente novamente.' });
                return;
            }

            const newAttachments = uploadResult.files || [];
            const existingAttachments = initialData?.anexos || [];

            // Merge existing and new attachments to avoid overwriting on edit
            const anexos = [...existingAttachments, ...newAttachments];

            const matriculaData = {
                id: initialData?.id,
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
                primeiraMensalidade: formData.get('r$-1a-mensalidade') ? parseFloat(formData.get('r$-1a-mensalidade') as string) : undefined,
                segundaMensalidade: parseFloat(formData.get('r$-2a-mensalidade') as string),
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
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="data-matricula">Data de Matrícula *</Label>
                                <DatePicker value={dataMatricula} onValueChange={setDataMatricula} />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="processo-seletivo">Processo Seletivo</Label>
                                <Select name="processo-seletivo">
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
                                <Select name="polo" required disabled={polos.length === 0}>
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
                                <Select name="estado" required disabled={estados.length === 0}>
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
                                <Select name="cidade" required disabled={cidades.length === 0}>
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
                                    <Select name="tipo-curso" required disabled={courseTypes.length === 0}>
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
                                    <Select name="curso" required disabled={courses.length === 0}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={courses.length === 0 ? 'Nenhum curso importado' : 'Selecione o curso'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courses.map(curso => (
                                                <SelectItem key={curso.sigla} value={curso.sigla}>
                                                    {curso.nome} {curso.tipo ? `- ${curso.tipo}` : ''} ({curso.sigla})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="campanha">Campanha</Label>
                                    <Select name="campanha" disabled={campaigns.length === 0}>
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
                                    <Select name="canal" disabled={marketingChannels.length === 0}>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="r$-1a-mensalidade">R$ 1ª Mensalidade</Label>
                                    <Input id="r$-1a-mensalidade" name="r$-1a-mensalidade" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="r$-2a-mensalidade">R$ 2ª Mensalidade *</Label>
                                    <Input id="r$-2a-mensalidade" name="r$-2a-mensalidade" placeholder="R$ 0,00" required />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Anexos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="anexos">Contrato e Documentação</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="anexos" name="anexos" type="file" multiple />
                                        <Button type="button" variant="outline" size="icon">
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 p-6">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                            Salvar Matrícula
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
