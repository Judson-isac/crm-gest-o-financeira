'use server';

import { saveRede, deleteRede } from '@/lib/db';
import type { Rede } from '@/lib/types';
import { revalidatePath } from 'next/cache';

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
        await deleteRede(id);
        revalidatePath('/superadmin/redes');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
