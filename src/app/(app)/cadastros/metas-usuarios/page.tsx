import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { UserCog } from 'lucide-react';

export default function MetasUsuariosPage() {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Metas de Usuários</CardTitle>
            <CardDescription>Esta funcionalidade está em desenvolvimento.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col h-48 items-center justify-center rounded-md border-2 border-dashed text-center">
                <UserCog className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground mt-4">A tela para gerenciamento de metas individuais de usuários estará disponível em breve.</p>
            </div>
        </CardContent>
    </Card>
  );
}
