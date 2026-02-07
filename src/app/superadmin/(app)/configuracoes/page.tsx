'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getSystemConfigAction, saveSystemConfigAction } from '@/actions/superadmin';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export default function SystemConfigPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();
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
        const formData = new FormData(e.target as HTMLFormElement);

        // Helper to read file as base64
        const readFile = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        startTransition(async () => {
            let appLogo = config.appLogo;
            const logoFile = formData.get('logoFile') as File;

            if (logoFile && logoFile.size > 0) {
                try {
                    appLogo = await readFile(logoFile);
                } catch (error) {
                    toast({
                        variant: "destructive",
                        title: "Erro ao ler arquivo",
                        description: "Não foi possível processar a imagem selecionada."
                    });
                    return;
                }
            }

            const result = await saveSystemConfigAction({
                appName: config.appName,
                appLogo: appLogo
            });

            if (result.success) {
                setConfig(prev => ({ ...prev, appLogo }));
                toast({
                    title: "Configuração atualizada!",
                    description: "As alterações podem levar alguns instantes para aparecer."
                });
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.message
                });
            }
        });
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
                            <Label htmlFor="appName">Nome da Aplicação</Label>
                            <Input
                                id="appName"
                                name="appName"
                                required
                                value={config.appName}
                                onChange={e => setConfig({ ...config, appName: e.target.value })}
                                placeholder="Ex: Meu CRM"
                            />
                            <p className="text-xs text-muted-foreground">Aparece no título da aba e no cabeçalho.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="logoFile">Logo do Sistema (Upload)</Label>
                            <div className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <Input
                                        id="logoFile"
                                        name="logoFile"
                                        type="file"
                                        accept="image/*"
                                        className="cursor-pointer"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Recomendado: PNG transparente (aprox. 200x50px).</p>
                                </div>
                            </div>
                        </div>

                        {config.appLogo && (
                            <div className="p-4 border rounded-lg bg-slate-50 flex flex-col gap-2 items-center">
                                <span className="text-xs font-medium text-muted-foreground">Pré-visualização Atual</span>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
