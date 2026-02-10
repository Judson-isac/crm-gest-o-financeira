
"use server";

import { revalidatePath } from "next/cache";
import * as db from "@/lib/db";
import type { Curso } from "@/lib/types";
import { getAuthenticatedUserPermissions } from "@/lib/auth";

type CursoJsonItem = {
  ID_CURSO: string;
  NM_CURSO: string;
  METODOLOGIA: string;
  CD_GRUPO_CURSO: string;
  TIPO_NICHO?: string;
};

type CursoBackupItem = {
  sigla: string;
  sigla_alternativa?: string;
  nome: string;
  metodologia: string;
  nicho?: string;
}

export async function importCursosAction(cursosData: (CursoJsonItem | CursoBackupItem)[]) {
  try {
    const permissions = await getAuthenticatedUserPermissions();
    if (!permissions.isSuperadmin && !permissions.realizarImportacoes) {
      return { success: false, message: "Você não tem permissão para importar cursos." };
    }

    if (!cursosData || cursosData.length === 0) {
      return { success: false, message: "Nenhum curso para importar." };
    }

    const redeId = permissions.redeId;
    if (!redeId) {
      return { success: false, message: "Rede não identificada para este usuário." };
    }

    // 1. Identify all unique modalities first
    const uniqueModalidades = new Set<string>();
    cursosData.forEach(item => {
      if (!('metodologia' in item)) {
        const curso = item as CursoJsonItem;
        const modalidade = (curso as any).MODALIDADE || (curso as any).UNIDADE || '';
        if (modalidade) {
          const normalizedModalidade = modalidade === 'pos-graduacao' ? 'Pós-Graduação' :
            modalidade === 'tecnico' ? 'Técnico' :
              modalidade === 'graduacao' ? 'Graduação' :
                modalidade;
          uniqueModalidades.add(normalizedModalidade);
        }
      }
    });

    // 2. Upsert modalities and create a map of Name -> ID
    const modalidadeIdMap: Record<string, string> = {};
    for (const modalidade of uniqueModalidades) {
      const sigla = modalidade.toUpperCase().substring(0, 10).replace(/[^A-Z0-9]/g, '');
      const savedTipo = await db.upsertTipoCurso({
        nome: modalidade,
        sigla: sigla,
        ativo: true,
        redeId: redeId,
      });
      modalidadeIdMap[modalidade] = savedTipo.id;
    }

    // 3. Map courses to their respective objects, including tipoCursoId
    const cursosToUpsert: Omit<Curso, 'id'>[] = cursosData.map(item => {
      if ('metodologia' in item) {
        // User-provided simplified format
        const curso = item as CursoBackupItem;
        return {
          sigla: curso.sigla,
          sigla_alternativa: curso.sigla_alternativa,
          nome: curso.nome,
          tipo: curso.metodologia,
          nicho: curso.nicho,
          ativo: true,
        };
      } else {
        // Automatic import from Unicesumar JSON
        const curso = item as CursoJsonItem;
        const modalidade = (curso as any).MODALIDADE || (curso as any).UNIDADE || '';
        let tipoCursoId: string | undefined = undefined;

        if (modalidade) {
          const normalizedModalidade = modalidade === 'pos-graduacao' ? 'Pós-Graduação' :
            modalidade === 'tecnico' ? 'Técnico' :
              modalidade === 'graduacao' ? 'Graduação' :
                modalidade;
          tipoCursoId = modalidadeIdMap[normalizedModalidade];
        }

        const tipo = (curso as any).CD_GRUPO_CURSO === 'EAD_HIBRIDO' ? 'HIBRIDO' : 'EAD';
        const cursoBase = {
          nome: curso.NM_CURSO,
          tipo: tipo,
          tipoCursoId: tipoCursoId,
          nicho: curso.TIPO_NICHO,
          ativo: true,
        };

        if (curso.ID_CURSO.startsWith('ESPRE_')) {
          return {
            ...cursoBase,
            sigla: curso.ID_CURSO,
            sigla_alternativa: curso.ID_CURSO.replace('ESPRE_', 'EGRAD_'),
          };
        }

        return {
          ...cursoBase,
          sigla: curso.ID_CURSO,
        };
      }
    });

    await db.upsertCursos(cursosToUpsert, redeId);

    revalidatePath('/importacao/cursos');
    revalidatePath('/cadastros/cursos');
    revalidatePath('/cadastros/tipos-de-curso');
    revalidatePath('/matricula/nova');

    return {
      success: true,
      message: `${cursosToUpsert.length} cursos foram importados/atualizados com sucesso. ${Object.keys(modalidadeIdMap).length} tipos de curso foram processados sem duplicidade.`
    };
  } catch (error) {
    console.error("Erro ao importar cursos:", error);
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    return { success: false, message: `Falha ao importar cursos: ${errorMessage}` };
  }
}

export async function addOrUpdateCursoAction(curso: Partial<Curso>, originalSigla?: string) {
  try {
    const permissions = await getAuthenticatedUserPermissions();
    if (!permissions.isSuperadmin && !permissions.gerenciarCadastrosGerais) {
      return { success: false, message: "Você não tem permissão para gerenciar cursos." };
    }

    const redeId = permissions.redeId;
    if (!redeId) {
      return { success: false, message: "Rede não identificada para este usuário." };
    }

    const dataToSave = {
      ativo: curso.ativo ?? true,
      redeId: redeId,
      ...curso,
    }

    const result = await db.upsertCurso(dataToSave as Curso, originalSigla);
    revalidatePath('/importacao/cursos');
    revalidatePath('/cadastros/cursos');
    return { success: true, data: result, message: `Curso "${curso.nome}" salvo com sucesso.` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    return { success: false, message: `Falha ao salvar curso: ${errorMessage}` };
  }
}

export async function deleteCursoAction(sigla: string) {
  try {
    const permissions = await getAuthenticatedUserPermissions();
    if (!permissions.isSuperadmin && !permissions.gerenciarCadastrosGerais) {
      return { success: false, message: "Você não tem permissão para excluir cursos." };
    }
    const redeId = permissions.redeId;
    if (!redeId) return { success: false, message: "Rede não identificada." };

    await db.deleteCurso(sigla, redeId);
    revalidatePath('/importacao/cursos');
    revalidatePath('/cadastros/cursos');
    return { success: true, message: "Curso excluído com sucesso." };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    return { success: false, message: `Falha ao excluir curso: ${errorMessage}` };
  }
}

export async function deleteCursosAction(siglas: string[]) {
  try {
    const permissions = await getAuthenticatedUserPermissions();
    if (!permissions.isSuperadmin && !permissions.gerenciarCadastrosGerais) {
      return { success: false, message: "Você não tem permissão para excluir cursos." };
    }
    const redeId = permissions.redeId;
    if (!redeId) return { success: false, message: "Rede não identificada." };

    await db.deleteCursos(siglas, redeId);
    revalidatePath('/importacao/cursos');
    revalidatePath('/cadastros/cursos');
    return { success: true, message: `${siglas.length} cursos excluídos com sucesso.` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    return { success: false, message: `Falha ao excluir cursos: ${errorMessage}` };
  }
}
