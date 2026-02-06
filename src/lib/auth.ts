'use server';
import { NextRequest } from 'next/server';
import * as db from './db';
import type { Permissoes, Usuario, UserPermissions } from './types';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const permissionRouteMap: { permission: keyof Permissoes, route: string }[] = [
    { permission: 'verDashboard', route: '/dashboard' },
    { permission: 'gerenciarMatriculas', route: '/matricula/nova' },
    { permission: 'verRelatoriosFinanceiros', route: '/' },
    { permission: 'realizarImportacoes', route: '/importacao/nead' },
    { permission: 'gerenciarCadastrosGerais', route: '/cadastros' },
    { permission: 'gerenciarUsuarios', route: '/usuarios' },
    { permission: 'verRanking', route: '/ranking' },
];

function getJwtSecretKey(): Uint8Array {
    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) {
        throw new Error('JWT_SECRET_KEY is not set in environment variables!');
    }
    return new TextEncoder().encode(secret);
}

// At login, get permissions and store the booleans in the token.
export async function generateJwtToken(user: Usuario) {
    const permissions = await db.getUserPermissionsById(user.id, user);
    // Exclude polos from JWT to keep it small
    const { polos, ...permissionsToStore } = permissions;

    const token = await new SignJWT({
        userId: user.id,
        // Store permissions in the token
        permissions: permissionsToStore,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // Increased to 24 hours
        .sign(getJwtSecretKey());

    return token;
}

type DecodedJwtPayload = {
    userId: string;
    permissions: Omit<UserPermissions, 'polos'>
}

// Helper to get raw payload from token. NO DB CALLS.
async function getJwtPayload(token: string | undefined): Promise<DecodedJwtPayload | null> {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, getJwtSecretKey());
        return {
            userId: payload.userId as string,
            permissions: payload.permissions as Omit<UserPermissions, 'polos'>
        };
    } catch (error) {
        // Don't log on server for every failed verification, it's noisy.
        // console.error("JWT Verification failed:", error);
        return null;
    }
}

// For middleware. FAST. NO DB CALLS.
export async function verifyJwtToken(request: NextRequest): Promise<DecodedJwtPayload | null> {
    const token = request.cookies.get('auth-token')?.value;
    return getJwtPayload(token);
}

// For Server Components/Actions. FAST. NO DB CALLS.
async function getSession(): Promise<DecodedJwtPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    return getJwtPayload(token);
}

// For Server Components/Actions that need the full user object.
export async function getAuthenticatedUser(): Promise<Omit<Usuario, 'senha'> | null> {
    const session = await getSession();
    if (!session?.userId) return null;

    const user = await db.getUserById(session.userId);
    if (!user) return null;

    const { senha, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

// For Server Components/Actions that need the FULL permissions object including the list of polos.
// This is now the ONLY function that should call the heavy db.getUserPermissionsById.
export async function getAuthenticatedUserPermissions(): Promise<UserPermissions> {
    const session = await getSession();
    if (!session?.userId) {
        return {
            verDashboard: false, gerenciarMatriculas: false, verRelatoriosFinanceiros: false,
            gerenciarCadastrosGerais: false, gerenciarUsuarios: false, realizarImportacoes: false,
            verRanking: false,
            polos: [], isSuperadmin: false, redeId: null,
        };
    }
    return await db.getUserPermissionsById(session.userId);
}

// For middleware. FAST. Checks permissions from the token.
export async function checkUserPermissionForPath(request: NextRequest): Promise<boolean> {
    const { pathname } = request.nextUrl;
    const session = await verifyJwtToken(request);

    // Unauthenticated users or those with invalid tokens have no permission for protected routes
    if (!session?.userId || !session.permissions) {
        return false;
    }

    // Superadmin check for /superadmin routes
    const isSuperAdminPath = pathname.startsWith('/superadmin');
    if (isSuperAdminPath) {
        const isSuper = session.permissions.isSuperadmin === true;
        if (!isSuper) {
            console.log(`[Middleware] Access denied to ${pathname}. isSuperadmin=${session.permissions.isSuperadmin}`, session);
        }
        return isSuper;
    }
    // If a superadmin tries to access a regular user path, deny it.
    if (session.permissions.isSuperadmin) {
        // Exception: Super admins might need to see ranking or base paths? 
        // For now keep strict, but logging might reveal if they are blocked elsewhere.
        return false;
    }

    const permissionMap: { [key: string]: keyof Permissoes } = {
        '/dashboard': 'verDashboard',
        '/matricula': 'gerenciarMatriculas',
        '/': 'verRelatoriosFinanceiros',
        '/despesas': 'verRelatoriosFinanceiros',
        '/cadastros': 'gerenciarCadastrosGerais',
        '/usuarios': 'gerenciarUsuarios',
        '/importacao': 'realizarImportacoes',
        '/ranking': 'verRanking',
    };

    const requiredPermissionKey = Object.keys(permissionMap)
        .sort((a, b) => b.length - a.length)
        .find(prefix => pathname.startsWith(prefix));

    if (!requiredPermissionKey) {
        return false; // No permission defined for this path prefix, deny access.
    }

    const permission = permissionMap[requiredPermissionKey];

    return session.permissions[permission];
}

// Called once on login. It's okay for this to be slower.
export async function findDefaultRouteForUser(user: Usuario): Promise<string | null> {
    if (!user) return null;

    if (user.isSuperadmin) return '/superadmin';

    const userPermissions = await db.getUserPermissionsById(user.id, user);

    for (const item of permissionRouteMap) {
        if (userPermissions[item.permission]) {
            return item.route;
        }
    }

    return null;
}
