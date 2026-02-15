'use server';

import { WhatsAppUserDashboard } from '@/components/whatsapp/whatsapp-user-dashboard';
import { getWhatsAppInstances } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function WhatsAppPage() {
    const user = await getAuthenticatedUser();

    if (!user || (!user.isSuperadmin && !user.redeId)) {
        redirect('/login');
    }

    // Fetch instances and rede info for the user's network
    const [instances, rede] = await Promise.all([
        getWhatsAppInstances(user.redeId || undefined),
        user.redeId ? (await import('@/lib/db')).getRedeById(user.redeId) : null
    ]);

    return (
        <WhatsAppUserDashboard instances={instances} rede={rede} user={user} />
    );
}
