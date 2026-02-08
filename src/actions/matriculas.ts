'use server';

import * as db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { Matricula } from '@/lib/types';
import { getAuthenticatedUserPermissions, getAuthenticatedUser } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';

// ... (keep saveMatriculaAction and deleteMatriculaAction as is) ...

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

        const user = await getAuthenticatedUser();
        if (!user) {
            return { success: false, message: "Usuário não autenticado." };
        }

        data.redeId = redeId;

        // Allow admin/manager to set the Responsible User (usuarioId)
        // If not provided or not allowed, default to current user
        const canAssignUser = permissions.isSuperadmin || permissions.gerenciarUsuarios;
        if (canAssignUser && data.usuarioId) {
            // Keep the provided usuarioId
        } else {
            data.usuarioId = user.id;
        }
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

        // Fetch matricula to get attachments
        const matricula = await db.getMatriculaById(id, redeId);
        if (matricula && matricula.anexos && matricula.anexos.length > 0) {
            for (const anexoUrl of matricula.anexos) {
                try {
                    // Extract filename from URL (/uploads/matriculas/filename)
                    const filename = anexoUrl.split('/').pop();
                    if (filename) {
                        const filePath = join(process.cwd(), 'public', 'uploads', 'matriculas', filename);
                        await unlink(filePath);
                    }
                } catch (err) {
                    console.error(`Erro ao deletar arquivo físico ${anexoUrl}:`, err);
                    // Continue even if file delete fails (maybe file doesn't exist)
                }
            }
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
    console.log('[UploadAction] Received request');
    const keys = Array.from(formData.keys());
    console.log('[UploadAction] FormData keys:', keys);

    const debugInfo: any = {
        receivedKeys: keys,
        filesCount: 0,
        fileSizes: []
    };

    try {
        const permissions = await getAuthenticatedUserPermissions();
        if (!permissions.gerenciarMatriculas && !permissions.isSuperadmin) {
            return { success: false, message: 'Sem permissão', files: [], debug: debugInfo };
        }

        const files = formData.getAll('files') as File[];
        debugInfo.filesCount = files.length;
        debugInfo.fileSizes = files.map(f => f.size);

        if (files.length === 0) {
            return { success: true, files: [], debug: debugInfo };
        }

        const uploadedPaths: string[] = [];

        for (const file of files) {
            if (file.size === 0) continue;

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const timestamp = Date.now();
            const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filename = `${timestamp}-${originalName}`;
            const filepath = join(process.cwd(), 'public', 'uploads', 'matriculas', filename);

            await mkdir(dirname(filepath), { recursive: true });
            await writeFile(filepath, buffer);
            uploadedPaths.push(`/uploads/matriculas/${filename}`);
        }

        return { success: true, files: uploadedPaths, debug: debugInfo };
    } catch (e: any) {
        console.error('Erro ao fazer upload:', e);
        return { success: false, message: e.message, files: [], debug: debugInfo };
    }
}
