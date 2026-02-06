'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getSystemConfigAction, saveSystemConfigAction } from '@/actions/superadmin';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SystemConfigPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState({
        appName: '',
        appLogo: '',
    });

    useEffect(() => {
        const load = async () => {
            const result = await getSystemConfigAction();
            if (result.success && result.data) {
                setConfig(result.data);
            }
            setIsLoading(false);
        };
        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const result = await saveSystemConfigAction(config);
        if (result.success) {
            toast({
                title: "Configuração atualizada!",
                description: "As alterações podem levar alguns instantes para aparecer."
            });
            // Force refresh to update layout if needed, though revalidatePath handles server side.
            // Client side layout might need window reload to see logo change immediately if it relies on server fetch.
            setTimeout(() => window.location.reload(), 1000);
        } else {
            toast({
                variant: "destructive",
                title: "Erro",
                description: result.message
            });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h2>
                <p className="text-muted-foreground">Personalize a identidade visual do CRM.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>White-labeling</CardTitle>
                    <CardDescription>Altere o nome e a logo que aparecem em todo o sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nome da Aplicação</label>
                            <Input
                                required
                                value={config.appName}
                                onChange={e => setConfig({ ...config, appName: e.target.value })}
                                placeholder="Ex: Meu CRM"
                            />
                            <p className="text-xs text-muted-foreground">Aparece no título da aba e no cabeçalho.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Logo URL</label>
                            <Input
                                value={config.appLogo}
                                onChange={e => setConfig({ ...config, appLogo: e.target.value })}
                                placeholder="https://..."
                            />
                            <p className="text-xs text-muted-foreground">URL direta para a imagem da logo (PNG/SVG transparente recomendado).</p>
                        </div>

                        {config.appLogo && (
                            <div className="p-4 border rounded-lg bg-slate-50 flex flex-col gap-2 items-center">
                                <span className="text-xs font-medium text-muted-foreground">Pré-visualização</span>
                                <img src={config.appLogo} alt="Logo Preview" className="h-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            </div>
                        )}

                        <div className="pt-4">
                            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
