'use server';

import { WhatsAppClient } from '@/components/whatsapp/whatsapp-client';
import { getWhatsAppInstances } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function WhatsAppPage() {
    const user = await getAuthenticatedUser();

    if (!user || (!user.isSuperadmin && !user.redeId)) {
        redirect('/login');
    }

    // Fetch instances for the user's network
    // If superadmin, they can see all but usually this page is for the specific network operation
    const instances = await getWhatsAppInstances(user.redeId || undefined);

    // For now, we take the first instance assigned to the network
    const instance = instances[0] || null;

    return (
        <div className="container mx-auto py-10">
            <WhatsAppClient instance={instance} />
        </div>
    );
}
