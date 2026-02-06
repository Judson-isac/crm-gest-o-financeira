
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

    // Extract unique modalidades (course types) from the import data
    const modalidades = new Set<string>();

    const cursosToUpsert: Omit<Curso, 'id'>[] = cursosData.map(item => {
      if ('metodologia' in item) {
        // This is for the manual JSON import with the user's desired format
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
        // This is for the automatic import from the Unicesumar JSON
        const curso = item as CursoJsonItem;

        // Extract modalidade for tipos_curso
        const modalidade = curso.MODALIDADE || curso.UNIDADE || '';
        if (modalidade) {
          // Normalize modalidade names
          const normalizedModalidade = modalidade === 'pos-graduacao' ? 'Pós-Graduação' :
            modalidade === 'tecnico' ? 'Técnico' :
              modalidade === 'graduacao' ? 'Graduação' :
                modalidade;
          modalidades.add(normalizedModalidade);
        }

        const tipo = curso.CD_GRUPO_CURSO === 'EAD_HIBRIDO' ? 'HIBRIDO' : 'EAD';
        const cursoBase = {
          nome: curso.NM_CURSO,
          tipo: tipo,
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

    // Create/update tipos_curso for each unique modalidade
    for (const modalidade of modalidades) {
      const sigla = modalidade.toUpperCase().substring(0, 10).replace(/[^A-Z0-9]/g, '');
      await db.saveTipoCurso({
        nome: modalidade,
        sigla: sigla,
        ativo: true,
        redeId: redeId,
      });
    }

    await db.upsertCursos(cursosToUpsert, redeId);

    revalidatePath('/importacao/cursos');
    revalidatePath('/cadastros/cursos');
    revalidatePath('/cadastros/tipos-de-curso');
    revalidatePath('/matricula/nova');

    const tiposMessage = modalidades.size > 0 ? ` e ${modalidades.size} tipo(s) de curso` : '';
    return { success: true, message: `${cursosToUpsert.length} cursos${tiposMessage} foram importados/atualizados com sucesso.` };
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
