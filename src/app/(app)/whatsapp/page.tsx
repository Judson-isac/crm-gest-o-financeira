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

    // Fetch instances for the user's network
    const instances = await getWhatsAppInstances(user.redeId || undefined);

    return (
        <WhatsAppUserDashboard instances={instances} />
    );
}
