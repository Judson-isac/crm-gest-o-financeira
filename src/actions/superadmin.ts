'use server';

import { getAllSuperAdmins, saveUsuario, deleteUsuario, getSystemConfig, saveSystemConfig, SystemConfig } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { Usuario } from '@/lib/types';

// --- Super Admin Management ---

export async function getSuperAdminsAction() {
    try {
        const user = await getAuthenticatedUser();
        if (!user?.isSuperadmin) return { success: false, message: "Acesso negado" };

        const admins = await getAllSuperAdmins();
        return { success: true, data: admins };
    } catch (e) {
        return { success: false, message: "Erro ao buscar administradores" };
    }
}

export async function saveSuperAdminAction(data: Partial<Usuario>) {
    try {
        const user = await getAuthenticatedUser();
        if (!user?.isSuperadmin) return { success: false, message: "Acesso negado" };

        const adminData: Partial<Usuario> = {
            ...data,
            isSuperadmin: true,
            redeId: 'rede_default', // Super Admins need a network (database constraint)
            funcao: 'Superadmin',
            polos: [], // Usually global
            status: data.status || 'Ativo'
        };

        if (data.senha && data.senha.length < 6) {
            return { success: false, message: "A senha deve ter no mínimo 6 caracteres" };
        }

        await saveUsuario(adminData);
        revalidatePath('/superadmin/administradores');
        return { success: true, message: "Administrador salvo com sucesso" };
    } catch (e: any) {
        console.error(e);
        return { success: false, message: e.message || "Erro ao salvar administrador" };
    }
}

export async function deleteSuperAdminAction(id: string) {
    try {
        const user = await getAuthenticatedUser();
        if (!user?.isSuperadmin) return { success: false, message: "Acesso negado" };

        if (user.id === id) return { success: false, message: "Você não pode se excluir" };

        await deleteUsuario(id);
        revalidatePath('/superadmin/administradores');
        return { success: true, message: "Administrador removido" };
    } catch (e) {
        return { success: false, message: "Erro ao remover administrador" };
    }
}

// --- System Configuration ---

export async function getSystemConfigAction() {
    try {
        // Allow public read? Or at least authenticated.
        // Usually system config acts as public metadata for the app shell.
        const config = await getSystemConfig();
        return { success: true, data: config };
    } catch (e) {
        return { success: false, message: "Erro ao carregar configuração" };
    }
}

export async function saveSystemConfigAction(config: SystemConfig) {
    try {
        const user = await getAuthenticatedUser();
        if (!user?.isSuperadmin) return { success: false, message: "Acesso negado" };

        await saveSystemConfig(config);
        revalidatePath('/', 'layout'); // Revalidate global layout
        return { success: true, message: "Configuração salva com sucesso" };
    } catch (e) {
        return { success: false, message: "Erro ao salvar configuração" };
    }
}
