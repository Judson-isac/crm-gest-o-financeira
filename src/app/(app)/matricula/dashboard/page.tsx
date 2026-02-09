'use client';

import { SpacepointAttainmentWidget } from '@/components/dashboard/spacepoint-attainment-widget';
import { Button } from '@/components/ui/button';
import { PlusCircle, List } from 'lucide-react';
import Link from 'next/link';

export default function MatriculaDashboardPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard de Matrículas</h1>
                <div className="flex gap-2">
                    <Link href="/matricula/listar">
                        <Button variant="outline">
                            <List className="mr-2 h-4 w-4" />
                            Listar Matrículas
                        </Button>
                    </Link>
                    <Link href="/matricula/nova">
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nova Matrícula
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <SpacepointAttainmentWidget />
            </div>
        </div>
    );
}
