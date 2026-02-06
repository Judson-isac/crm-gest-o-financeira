
'use server';

import { saveUsuario, deleteUsuario as deleteDbUsuario } from '@/lib/db';
import type { Usuario } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function saveUsuarioAction(usuario: Partial<Usuario>) {
    try {
        await saveUsuario(usuario);
        revalidatePath('/superadmin/usuarios');
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteUsuarioAction(usuarioId: string) {
    try {
        await deleteDbUsuario(usuarioId);
        revalidatePath('/superadmin/usuarios');
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
