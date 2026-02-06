import { getMatriculaById, getCursos, getCampanhas, getProcessosSeletivos, getTiposCurso, getCanais } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Pencil, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function VerMatriculaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [matricula, courses, campaigns, processes, courseTypes, channels] = await Promise.all([
        getMatriculaById(id),
        getCursos(),
        getCampanhas(),
        getProcessosSeletivos(),
        getTiposCurso(),
        getCanais(),
    ]);

    if (!matricula) {
        notFound();
    }

    const curso = courses.find(c => c.sigla === matricula.cursoSigla);
    const campanha = campaigns.find(c => c.id === matricula.campanhaId);
    const processo = processes.find(p => p.id === matricula.processoSeletivoId);
    const tipoCurso = courseTypes.find(t => t.id === matricula.tipoCursoId);
    const canal = channels.find(c => c.id === matricula.canalId);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold text-foreground">Detalhes da Matrícula</h1>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/matricula/listar">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/matricula/editar/${matricula.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Informações da Matrícula</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Data e Processo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Data de Matrícula</Label>
                            <p className="font-medium">{format(new Date(matricula.dataMatricula), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Processo Seletivo</Label>
                            <p className="font-medium">{processo ? `${processo.numero}/${processo.ano}` : '—'}</p>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Localização</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Polo</Label>
                                <p className="font-medium">{matricula.polo}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Estado</Label>
                                <p className="font-medium">{matricula.estado}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Cidade</Label>
                                <p className="font-medium">{matricula.cidade}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Dados do Aluno</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-muted-foreground">Nome Completo</Label>
                                <p className="font-medium">{matricula.nomeAluno}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Telefone</Label>
                                <p className="font-medium">{matricula.telefone || '—'}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">RA</Label>
                                <p className="font-medium">{matricula.ra || '—'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Informações do Curso</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Tipo de Curso</Label>
                                <p className="font-medium">{tipoCurso?.nome || '—'}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Curso</Label>
                                <p className="font-medium">{curso?.nome || matricula.cursoSigla} ({matricula.cursoSigla})</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Campanha</Label>
                                <p className="font-medium">{campanha?.nome || '—'}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Canal</Label>
                                <p className="font-medium">{canal?.nome || '—'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Valores de Mensalidade</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">1ª Mensalidade</Label>
                                <p className="font-medium">
                                    {matricula.primeiraMensalidade
                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(matricula.primeiraMensalidade)
                                        : '—'
                                    }
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">2ª Mensalidade</Label>
                                <p className="font-medium">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(matricula.segundaMensalidade)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {matricula.anexos && matricula.anexos.length > 0 && (
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold mb-4">Anexos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {matricula.anexos.map((anexo, index) => {
                                    const filename = anexo.split('/').pop() || '';
                                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

                                    return (
                                        <div key={index} className="space-y-2">
                                            <Label className="text-muted-foreground">Arquivo {index + 1}</Label>
                                            {isImage ? (
                                                <a href={anexo} target="_blank" rel="noopener noreferrer" className="block">
                                                    <img
                                                        src={anexo}
                                                        alt={filename}
                                                        className="max-w-full h-auto rounded border hover:opacity-80 transition-opacity"
                                                    />
                                                </a>
                                            ) : (
                                                <a
                                                    href={anexo}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-primary hover:underline"
                                                >
                                                    <Paperclip className="h-4 w-4" />
                                                    {filename}
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {matricula.criadoEm && (
                        <div className="border-t pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Criado em</Label>
                                    <p>{format(new Date(matricula.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                </div>
                                {matricula.atualizadoEm && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Última atualização</Label>
                                        <p>{format(new Date(matricula.atualizadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
