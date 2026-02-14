'use server';

import { WhatsAppManager } from '@/components/superadmin/whatsapp-manager';
import { getWhatsAppInstances, getRedes } from '@/lib/db';

export default async function SuperAdminWhatsAppPage() {
    const [instances, redes] = await Promise.all([
        getWhatsAppInstances(),
        getRedes(),
    ]);

    return (
        <div className="container mx-auto py-10">
            <WhatsAppManager initialInstances={instances} redes={redes} />
        </div>
    );
}
