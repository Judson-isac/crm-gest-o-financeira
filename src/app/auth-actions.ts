'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateUserCredentials, saveUsuario } from '@/lib/db';
import { findDefaultRouteForUser, generateJwtToken, getAuthenticatedUser } from '@/lib/auth';
import type { Usuario } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const user = await validateUserCredentials(email, password);

    if (user && !user.isSuperadmin) {
        const token = await generateJwtToken(user as Usuario);

        const cookieStore = await cookies();
        cookieStore.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });

        const defaultRoute = await findDefaultRouteForUser(user as Usuario);
        if (defaultRoute) {
            redirect(defaultRoute);
        } else {
            const cookieStore = await cookies();
            cookieStore.delete('auth-token');
            redirect('/login?error=NoPermissions');
        }

    } else {
        redirect('/login?error=InvalidCredentials');
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
    redirect('/login');
}

export async function updateProfileAction(data: { nome: string, email: string, avatarUrl?: string }) {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { success: false, message: 'Não autorizado.' };
    }

    try {
        await saveUsuario({
            id: user.id,
            nome: data.nome,
            email: data.email,
            avatarUrl: data.avatarUrl
        });

        revalidatePath('/', 'layout');
        return { success: true, message: 'Perfil atualizado com sucesso!' };
    } catch (e: any) {
        return { success: false, message: e.message || 'Erro ao atualizar perfil.' };
    }
}
