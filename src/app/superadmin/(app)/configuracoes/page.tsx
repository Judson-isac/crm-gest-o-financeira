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
    appLogoHeight?: string;
    appLogoSidebarWidth?: string;
    appLogoIconHeight?: string;
    appLogoLoginScale?: string;
}

export default function SystemConfigPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();
    const [config, setConfig] = useState<SystemConfig>({
        appName: '',
        appLogo: '',
        appFavicon: '',
        appLogoHeight: '48',
        appLogoSidebarWidth: 'auto',
        appLogoIconHeight: '32',
        appLogoLoginScale: '1',
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
                appFavicon: appFavicon,
                appLogoHeight: config.appLogoHeight,
                appLogoSidebarWidth: config.appLogoSidebarWidth,
                appLogoIconHeight: config.appLogoIconHeight,
                appLogoLoginScale: config.appLogoLoginScale
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

                        <div className="space-y-4 pt-4 border-t">
                            <Label className="text-lg font-semibold">Aparência da Logo</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sidebar Expanded Logo Height (Main Logo) */}
                                <div className="space-y-2">
                                    <Label htmlFor="logoHeight">Altura da Logo - Sidebar Aberta (px)</Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            id="logoHeight"
                                            type="number"
                                            min="20"
                                            max="150"
                                            value={config.appLogoHeight || '48'}
                                            onChange={e => setConfig({ ...config, appLogoHeight: e.target.value })}
                                            className="max-w-[100px]"
                                        />
                                        <input
                                            type="range"
                                            min="20"
                                            max="150"
                                            value={config.appLogoHeight || '48'}
                                            onChange={e => setConfig({ ...config, appLogoHeight: e.target.value })}
                                            className="flex-1"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Define a altura da logo quando o menu lateral está expandido.</p>
                                </div>

                                {/* Sidebar Collapsed Icon Height */}
                                <div className="space-y-2">
                                    <Label htmlFor="iconHeight">Altura do Ícone - Sidebar Fechada (px)</Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            id="iconHeight"
                                            type="number"
                                            min="16"
                                            max="64"
                                            value={config.appLogoIconHeight || '32'}
                                            onChange={e => setConfig({ ...config, appLogoIconHeight: e.target.value })}
                                            className="max-w-[100px]"
                                        />
                                        <input
                                            type="range"
                                            min="16"
                                            max="64"
                                            value={config.appLogoIconHeight || '32'}
                                            onChange={e => setConfig({ ...config, appLogoIconHeight: e.target.value })}
                                            className="flex-1"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Define o tamanho do ícone (vertical) quando o menu está recolhido.</p>
                                </div>

                                {/* Login Logo Scale */}
                                <div className="space-y-2">
                                    <Label htmlFor="loginScale">Escala da Logo no Login</Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            id="loginScale"
                                            type="number"
                                            min="0.5"
                                            max="3"
                                            step="0.1"
                                            value={config.appLogoLoginScale || '1'}
                                            onChange={e => setConfig({ ...config, appLogoLoginScale: e.target.value })}
                                            className="max-w-[100px]"
                                        />
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="3"
                                            step="0.1"
                                            value={config.appLogoLoginScale || '1'}
                                            onChange={e => setConfig({ ...config, appLogoLoginScale: e.target.value })}
                                            className="flex-1"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Ajusta o tamanho da logo na tela de login (1 = Original, 1.5 = 50% maior).</p>
                                </div>

                                {/* Preview Area */}
                                <div className="col-span-1 md:col-span-2">
                                    <Label>Pré-visualização (Aproximada)</Label>
                                    <div className="mt-2 p-4 border rounded-lg bg-slate-50 flex flex-wrap gap-8 items-center justify-center min-h-[100px]">
                                        {config.appLogo && (
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-[10px] text-muted-foreground">Sidebar Aberta</span>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={config.appLogo}
                                                    alt="Logo Sidebar"
                                                    style={{ height: `${config.appLogoHeight || '48'}px` }}
                                                    className="object-contain border border-dashed border-gray-300"
                                                />
                                            </div>
                                        )}
                                        {config.appLogo && (
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-[10px] text-muted-foreground">Login (Escala {config.appLogoLoginScale})</span>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={config.appLogo}
                                                    alt="Logo Login"
                                                    style={{
                                                        height: `${config.appLogoHeight || '48'}px`,
                                                        transform: `scale(${config.appLogoLoginScale || 1})`
                                                    }}
                                                    className="object-contain border border-dashed border-gray-300"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
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
