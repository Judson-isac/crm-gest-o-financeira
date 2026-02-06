"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { FinancialRecord, Despesa } from "@/lib/types";

export async function storeParsedRecordsAction(records: Omit<FinancialRecord, 'id' | 'data_importacao'>[]) {
    try {
        if (!records || records.length === 0) {
            return { success: false, message: "Nenhum registro para salvar." };
        }
        await storeFinancialRecords(records);
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
        await clearFinancialRecordsByImportId(importId);
        revalidatePath('/');
        revalidatePath('/dashboard');
        return { success: true, message: 'Importação removida com sucesso.' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        return { success: false, message: `Falha ao remover importação: ${errorMessage}` };
    }
}

export async function deleteDespesasAction(ano: number, mes: number): Promise<{ success: boolean, message?: string }> {
    try {
        await db.deleteDespesasByPeriod(ano, mes);
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
        if (!data.polo || !data.ano || !data.mes) {
            return { success: false, message: "Polo, ano e mês são obrigatórios." };
        }
         if (data.tipo_despesa === 'GERAL' && !data.descricao) {
            return { success: false, message: "A descrição é obrigatória para despesas gerais." };
        }
        if ((data.tipo_despesa === 'EAD' || data.tipo_despesa === 'HIBRIDO') && !data.sigla_curso) {
            return { success: false, message: "A seleção de um curso é obrigatória para despesas EAD ou Híbridas." };
        }

        const newDespesa = await db.addDespesa(data);
        revalidatePath('/dashboard');
        revalidatePath('/despesas');
        return { success: true, data: newDespesa };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteDespesaAction(
  id: string
): Promise<{ success: boolean; message?: string }> {
    try {
        await db.deleteDespesa(id);
        revalidatePath('/dashboard');
        revalidatePath('/despesas');
        return { success: true };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}
