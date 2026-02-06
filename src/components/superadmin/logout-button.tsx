'use client';

import { logoutAction } from '@/app/superadmin/actions';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
    return (
        <form action={logoutAction}>
            <Button variant="outline" type="submit">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
            </Button>
        </form>
    );
}
