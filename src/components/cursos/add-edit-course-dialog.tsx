
"use client";
import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { addOrUpdateCursoAction } from '@/actions/cursos';
import type { Curso, TipoCurso } from '@/lib/types';

const cursoSchema = z.object({
  sigla: z.string().min(1, "A sigla é obrigatória."),
  sigla_alternativa: z.string().optional(),
  nome: z.string().min(3, "O nome do curso é obrigatório."),
  tipo: z.enum(['EAD', 'HIBRIDO', 'Outros'], {
    errorMap: () => ({ message: "Selecione uma metodologia válida." })
  }),
  tipoCursoId: z.string().optional(),
  nicho: z.string().optional(),
});

type AddEditCourseDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  curso: Curso | null;
  courseTypes: TipoCurso[];
  onSuccess: () => void;
};

export function AddEditCourseDialog({ isOpen, setIsOpen, curso, courseTypes, onSuccess }: AddEditCourseDialogProps) {
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof cursoSchema>>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      sigla: '',
      sigla_alternativa: '',
      nome: '',
      tipo: 'EAD',
      tipoCursoId: '',
      nicho: '',
    },
  });

  useEffect(() => {
    if (curso) {
      form.reset({
        sigla: curso.sigla,
        sigla_alternativa: curso.sigla_alternativa || '',
        nome: curso.nome,
        tipo: curso.tipo as 'EAD' | 'HIBRIDO' | 'Outros',
        tipoCursoId: curso.tipoCursoId || '',
        nicho: curso.nicho || '',
      });
    } else {
      form.reset({
        sigla: '',
        sigla_alternativa: '',
        nome: '',
        tipo: 'EAD',
        tipoCursoId: '',
        nicho: '',
      });
    }
  }, [curso, isOpen, form]);

  const onSubmit = (data: z.infer<typeof cursoSchema>) => {
    startSaving(async () => {
      const originalSigla = curso ? curso.sigla : undefined;
      const result = await addOrUpdateCursoAction(data, originalSigla);
      if (result.success) {
        toast({ title: 'Sucesso!', description: result.message });
        onSuccess();
      } else {
        toast({ variant: 'destructive', title: 'Erro!', description: result.message });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{curso ? 'Editar Curso' : 'Adicionar Novo Curso'}</DialogTitle>
          <DialogDescription>
            {curso ? 'Altere os detalhes do curso abaixo.' : 'Preencha os detalhes do novo curso.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sigla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sigla</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: EGRAD_ADM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sigla_alternativa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sigla Alternativa (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: ESPRE_ADM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome do Curso</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Administração" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metodologia</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a metodologia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EAD">EAD</SelectItem>
                        <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipoCursoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Curso (Modalidade)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courseTypes.map(tipo => (
                          <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nicho"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nicho (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Gestão e Negócios" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
