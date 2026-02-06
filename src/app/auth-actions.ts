'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateUserCredentials } from '@/lib/db';
import { findDefaultRouteForUser, generateJwtToken } from '@/lib/auth';
import { Usuario } from '@/lib/types';

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

        // Pass the full user object to avoid a DB refetch
        const defaultRoute = await findDefaultRouteForUser(user as Usuario);
        if (defaultRoute) {
            redirect(defaultRoute);
        } else {
            // If user has no permissions, log them out and show error.
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
