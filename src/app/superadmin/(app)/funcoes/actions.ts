
'use server';

import { revalidatePath } from 'next/cache';
import { saveFuncao, deleteFuncao as deleteFuncaoDb } from '@/lib/db';
import { Funcao } from '@/lib/types';

export async function handleSaveFuncao(funcao: Partial<Funcao>) {
  try {
    if (!funcao.redeId) {
        throw new Error("A rede é obrigatória para salvar uma função.");
    }
    await saveFuncao(funcao);
    revalidatePath('/superadmin/funcoes');
    revalidatePath('/superadmin/usuarios'); // Revalidate users page as it depends on the roles list
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar função:', error);
    return { success: false, message: (error as Error).message };
  }
}

export async function handleDeleteFuncao(id: string) {
  try {
    await deleteFuncaoDb(id);
    revalidatePath('/superadmin/funcoes');
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar função:', error);
    return { success: false, message: 'Erro ao deletar função.' };
  }
}
