'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateUserCredentials } from '@/lib/db';
import { generateJwtToken } from '@/lib/auth';
import { Usuario } from '@/lib/types';

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const user = await validateUserCredentials(email, password);

    // CORREÇÃO: Troca a verificação de 'user.funcao' para 'user.isSuperadmin'
    if (user && user.isSuperadmin) {
        const token = await generateJwtToken(user as Usuario);

        const cookieStore = await cookies();
        cookieStore.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60, // 1 hour
            path: '/',
        });
        redirect('/superadmin/redes');
    } else {
        redirect('/superadmin/login?error=InvalidCredentials');
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
    redirect('/superadmin/login');
}
