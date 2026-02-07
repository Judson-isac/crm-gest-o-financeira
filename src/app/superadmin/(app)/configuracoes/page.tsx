'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getSystemConfigAction, saveSystemConfigAction } from '@/actions/superadmin';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

// Define SystemConfig type based on usage
interface SystemConfig {
    appName: string;
    appLogo: string;
    appFavicon: string;
}

export default function SystemConfigPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();
    const [config, setConfig] = useState<SystemConfig>({
        appName: '',
        appLogo: '',
        appFavicon: '',
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
            let appFavicon = config.appFavicon;

            const logoFile = formData.get('logoFile') as File;
            const faviconFile = formData.get('faviconFile') as File;

            if (logoFile && logoFile.size > 0) {
                try {
                    appLogo = await readFile(logoFile);
                } catch (error) {
                    toast({ variant: "destructive", title: "Erro ao ler logo", description: "Falha ao processar arquivo da logo." });
                    return;
                }
            }

            if (faviconFile && faviconFile.size > 0) {
                try {
                    appFavicon = await readFile(faviconFile);
                } catch (error) {
                    toast({ variant: "destructive", title: "Erro ao ler favicon", description: "Falha ao processar arquivo do favicon." });
                    return;
                }
            }

            const result = await saveSystemConfigAction({
                appName: config.appName,
                appLogo: appLogo,
                appFavicon: appFavicon
            });

            if (result.success) {
                setConfig(prev => ({ ...prev, appLogo, appFavicon }));
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
                                value={config.appName}
                                onChange={e => setConfig({ ...config, appName: e.target.value })}
                                placeholder="Ex: Meu CRM (Deixe em branco para nenhum)"
                            />
                            <p className="text-xs text-muted-foreground">Opcional. Aparece no título da aba e no cabeçalho.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="logoFile">Logo do Sistema</Label>
                                <Input
                                    id="logoFile"
                                    name="logoFile"
                                    type="file"
                                    accept="image/*"
                                    className="cursor-pointer"
                                />
                                <p className="text-xs text-muted-foreground mt-1">PNG transparente (200x50px).</p>
                                {config.appLogo && (
                                    <div className="mt-2 p-2 border rounded bg-slate-50 flex justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={config.appLogo} alt="Logo" className="h-8 object-contain" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="faviconFile">Favicon (Ícone da Aba)</Label>
                                <Input
                                    id="faviconFile"
                                    name="faviconFile"
                                    type="file"
                                    accept="image/*"
                                    className="cursor-pointer"
                                />
                                <p className="text-xs text-muted-foreground mt-1">PNG quadrado (32x32px ou 64x64px).</p>
                                {config.appFavicon && (
                                    <div className="mt-2 p-2 border rounded bg-slate-50 flex justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={config.appFavicon} alt="Favicon" className="h-8 w-8 object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>

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
