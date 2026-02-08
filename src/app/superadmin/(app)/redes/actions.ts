'use server';

import { saveRede, deleteRede, getMatriculas } from '@/lib/db';
import type { Rede } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function saveRedeAction(rede: Partial<Rede>) {
    try {
        await saveRede(rede);
        revalidatePath('/superadmin/redes');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteRedeAction(id: string) {
    try {
        // Fetch all matriculas for this network to delete their files
        const matriculas = await getMatriculas(id);

        for (const matricula of matriculas) {
            if (matricula.anexos && matricula.anexos.length > 0) {
                for (const anexoUrl of matricula.anexos) {
                    try {
                        const filename = anexoUrl.split('/').pop();
                        if (filename) {
                            const filePath = join(process.cwd(), 'public', 'uploads', 'matriculas', filename);
                            await unlink(filePath);
                        }
                    } catch (err) {
                        console.error(`Erro ao deletar arquivo físico ${anexoUrl} da rede ${id}:`, err);
                    }
                }
            }
        }

        await deleteRede(id);
        revalidatePath('/superadmin/redes');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
