
"use server";

import { revalidatePath } from "next/cache";
import * as db from "@/lib/db";
import { FinancialRecord, Despesa, Filters } from "@/lib/types";
import { getAuthenticatedUser } from "@/lib/auth";

export async function storeParsedRecordsAction(records: Omit<FinancialRecord, 'id' | 'data_importacao'>[]) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) {
            return { success: false, message: "Usuário não autenticado ou não associado a uma rede." };
        }

        if (!records || records.length === 0) {
            return { success: false, message: "Nenhum registro para salvar." };
        }

        // Adiciona a redeId do usuário a cada um dos registros
        const recordsToStore = records.map(record => ({
            ...record,
            redeId: user.redeId!,
        }));

        // Envia os registros (já com a redeId) para a função do banco de dados
        await db.storeFinancialRecords(recordsToStore);

        revalidatePath('/');
        revalidatePath('/dashboard');
        return { success: true, message: `${records.length} registros foram importados com sucesso.` };
    } catch (error) {
        console.error("Erro ao salvar registros:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao salvar os registros.";
        return { success: false, message: `Falha ao salvar registros: ${errorMessage}` };
    }
}


export async function deleteImportAction(importId: string) {
    try {
        await db.clearFinancialRecordsByImportId(importId);
        revalidatePath('/');
        revalidatePath('/dashboard');
        return { success: true, message: 'Importação removida com sucesso.' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        return { success: false, message: `Falha ao remover importação: ${errorMessage}` };
    }
}

export async function deleteDespesasByPeriod(referencia_ano: number, referencia_mes: number): Promise<{ success: boolean, message?: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) throw new Error("Acesso negado.");
        await db.deleteDespesasByPeriod(referencia_ano, referencia_mes, user.redeId);
        revalidatePath('/');
        revalidatePath('/dashboard');
        revalidatePath('/despesas');
        return { success: true, message: 'Lançamentos de despesas do período foram excluídos com sucesso.' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        return { success: false, message: `Falha ao remover despesas: ${errorMessage}` };
    }
}

export async function addDespesaAction(
    data: Omit<Despesa, 'id'>
): Promise<{ success: boolean; data?: Despesa, message?: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) throw new Error("Acesso negado.");

        if (!data.polo || !data.referencia_ano || !data.referencia_mes) {
            return { success: false, message: "Polo, ano e mês são obrigatórios." };
        }
        if (!data.descricao) {
            return { success: false, message: "A descrição é obrigatória para despesas." };
        }

        const dataWithRede = { ...data, redeId: user.redeId };
        const newDespesa = await db.addDespesa(dataWithRede);
        revalidatePath('/dashboard');
        revalidatePath('/despesas');
        return { success: true, data: newDespesa };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteDespesaAction(
    id: string
): Promise<{ success: boolean; message?: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) throw new Error("Acesso negado.");
        await db.deleteDespesa(id, user.redeId);
        revalidatePath('/dashboard');
        revalidatePath('/despesas');
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function validateImportedCoursesAction(importId: string) {
    try {
        const records = await db.getFinancialRecordsByImportId(importId);
        const user = await getAuthenticatedUser();
        if (!user) throw new Error("Acesso negado.");

        const cursos = await db.getCursos(user.redeId);
        const cursoSiglas = new Set<string>();

        cursos.forEach(c => {
            cursoSiglas.add(c.sigla);
            if (c.sigla_alternativa) {
                cursoSiglas.add(c.sigla_alternativa);
            }
        });

        const untranslated = new Set<string>();
        records.forEach(rec => {
            if (rec.sigla_curso && !cursoSiglas.has(rec.sigla_curso)) {
                untranslated.add(rec.sigla_curso);
            }
        });

        return { success: true, untranslated: Array.from(untranslated) };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        return { success: false, message: `Falha na validação: ${errorMessage}` };
    }
}

export async function deleteFinancialRecordAction(id: string): Promise<{ success: boolean; message: string; }> {
    try {
        await db.deleteFinancialRecord(id);
        revalidatePath('/');
        revalidatePath('/dashboard');
        return { success: true, message: "Registro excluído com sucesso." };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        return { success: false, message: `Falha ao excluir registro: ${errorMessage}` };
    }
}

export async function deleteFinancialRecordsAction(ids: string[]): Promise<{ success: boolean; message: string; }> {
    if (!ids || ids.length === 0) {
        return { success: false, message: 'Nenhum ID de registro fornecido.' };
    }
    try {
        await db.deleteFinancialRecords(ids);
        revalidatePath('/');
        revalidatePath('/dashboard');
        return { success: true, message: `${ids.length} registros foram excluídos com sucesso.` };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        return { success: false, message: `Falha ao excluir registros: ${errorMessage}` };
    }
}

export async function deleteFinancialRecordsByFilterAction(filters: Filters): Promise<{ success: boolean; message: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user) throw new Error("Acesso negado.");

        // We need full permissions object here, or at least redeId/polos. 
        // Let's construct a basic one or fetch it.
        // Since getAuthenticatedUser returns a user object which has redeId and polos, we can use that.
        // But the type in db.ts expects UserPermissions. 
        // Let's perform a cast or better yet, fetch permissions.
        // Ideally we should import getAuthenticatedUserPermissions

        // Simplified approach using user object data which matches UserPermissions structure for scoping
        const permissionsForDelete = {
            redeId: user.isSuperadmin ? null : user.redeId,
            polos: user.isSuperadmin ? null : user.polos,
            // other fields don't matter for buildWhereClause
        } as any;

        const { deletedCount } = await db.deleteFinancialRecordsByFilter(filters, permissionsForDelete);
        revalidatePath('/');
        revalidatePath('/dashboard');
        return { success: true, message: `${deletedCount} registros foram excluídos com sucesso.` };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        return { success: false, message: `Falha ao excluir registros: ${errorMessage}` };
    }
}
