'use server';

import * as db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { Matricula } from '@/lib/types';
import { getAuthenticatedUserPermissions } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function saveMatriculaAction(data: Partial<Matricula>) {
    try {
        const permissions = await getAuthenticatedUserPermissions();
        if (!permissions.gerenciarMatriculas && !permissions.isSuperadmin) {
            return { success: false, message: "Você não tem permissão para gerenciar matrículas." };
        }

        const redeId = permissions.redeId;
        if (!redeId) {
            return { success: false, message: "Rede não identificada para este usuário." };
        }

        data.redeId = redeId;
        const saved = await db.saveMatricula(data);
        revalidatePath('/matricula/listar');
        revalidatePath('/matricula/nova');

        return { success: true, data: saved };
    } catch (e: any) {
        console.error("Erro ao salvar matrícula:", e);
        return { success: false, message: e.message };
    }
}

export async function deleteMatriculaAction(id: string) {
    try {
        const permissions = await getAuthenticatedUserPermissions();
        if (!permissions.gerenciarMatriculas && !permissions.isSuperadmin) {
            return { success: false, message: "Você não tem permissão para gerenciar matrículas." };
        }

        const redeId = permissions.redeId;
        if (!redeId) {
            return { success: false, message: "Rede não identificada para este usuário." };
        }

        await db.deleteMatricula(id, redeId);
        revalidatePath('/matricula/listar');

        return { success: true };
    } catch (e: any) {
        console.error("Erro ao deletar matrícula:", e);
        return { success: false, message: e.message };
    }
}

export async function uploadMatriculaFilesAction(formData: FormData) {
    try {
        const permissions = await getAuthenticatedUserPermissions();
        if (!permissions.gerenciarMatriculas && !permissions.isSuperadmin) {
            return { success: false, message: 'Sem permissão', files: [] };
        }

        const files = formData.getAll('files') as File[];
        if (files.length === 0) {
            return { success: true, files: [] };
        }

        const uploadedPaths: string[] = [];

        for (const file of files) {
            if (file.size === 0) continue;

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const timestamp = Date.now();
            const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filename = ${timestamp}-;
            const filepath = join(process.cwd(), 'public', 'uploads', 'matriculas', filename);

            await writeFile(filepath, buffer);
            uploadedPaths.push(/uploads/matriculas/);
        }

        return { success: true, files: uploadedPaths };
    } catch (e: any) {
        console.error('Erro ao fazer upload:', e);
        return { success: false, message: e.message, files: [] };
    }
}

