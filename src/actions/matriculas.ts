'use server';

import * as db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { Matricula } from '@/lib/types';
import { getAuthenticatedUserPermissions, getAuthenticatedUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

// ... (keep saveMatriculaAction and deleteMatriculaAction as is) ...

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
            const filename = `${timestamp}-${originalName}`;
            const filepath = join(process.cwd(), 'public', 'uploads', 'matriculas', filename);

            await mkdir(dirname(filepath), { recursive: true });
            await writeFile(filepath, buffer);
            uploadedPaths.push(`/uploads/matriculas/${filename}`);
        }

        return { success: true, files: uploadedPaths };
    } catch (e: any) {
        console.error('Erro ao fazer upload:', e);
        return { success: false, message: e.message, files: [] };
    }
}
