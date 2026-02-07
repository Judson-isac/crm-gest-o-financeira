import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define SystemConfig type based on usage
interface SystemConfig {
    appName: string;
    appLogo: string;
    appFavicon: string;
    appLogoHeight?: string;
    appLogoSidebarWidth?: string;
    appLogoIconHeight?: string;
    appLogoLoginScale?: string;
    appLogoLoginPosition?: 'center' | 'left' | 'right';
    appLogoSidebarPosition?: 'left' | 'center' | 'right';
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
        appLogoLoginPosition: 'center',
        appLogoSidebarPosition: 'left',
    });

    // ... (useEffect and handleSubmit unchanged up to default values) ...
    // Note: I will need to replace the entire component or careful chunks to avoid context loss.
    // Ideally, I should just update the interface and the JSX.

    // ... inside handleSubmit ...
    const result = await saveSystemConfigAction({
        appName: config.appName,
        appLogo: appLogo,
        appFavicon: appFavicon,
        appLogoHeight: config.appLogoHeight,
        appLogoSidebarWidth: config.appLogoSidebarWidth,
        appLogoIconHeight: config.appLogoIconHeight,
        appLogoLoginScale: config.appLogoLoginScale,
        appLogoLoginPosition: config.appLogoLoginPosition,
        appLogoSidebarPosition: config.appLogoSidebarPosition
    });
    // ...

    // ... inside JSX ...
    {/* Login Logo Scale */ }
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
        <p className="text-xs text-muted-foreground">Ajusta o tamanho da logo na tela de login.</p>
    </div>

    {/* Login Logo Position */ }
    <div className="space-y-2">
        <Label>Posição da Logo no Login</Label>
        <Select
            value={config.appLogoLoginPosition || 'center'}
            onValueChange={(val: any) => setConfig({ ...config, appLogoLoginPosition: val })}
        >
            <SelectTrigger>
                <SelectValue placeholder="Selecione a posição" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
        </Select>
    </div>

    {/* Sidebar Logo Position */ }
    <div className="space-y-2">
        <Label>Posição da Logo na Sidebar</Label>
        <Select
            value={config.appLogoSidebarPosition || 'left'}
            onValueChange={(val: any) => setConfig({ ...config, appLogoSidebarPosition: val })}
        >
            <SelectTrigger>
                <SelectValue placeholder="Selecione a posição" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Alinhamento da logo quando a sidebar está aberta.</p>
    </div>

    {/* Preview Area */ }
    <div className="col-span-1 md:col-span-2">
        <Label>Pré-visualização (Aproximada)</Label>
        <div className="mt-2 p-4 border rounded-lg bg-slate-50 flex flex-col gap-6">
            {config.appLogo && (
                <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Sidebar Aberta ({config.appLogoSidebarPosition === 'left' ? 'Esquerda' : config.appLogoSidebarPosition === 'center' ? 'Centro' : 'Direita'})</span>
                    <div className={`flex w-64 border border-dashed border-gray-300 p-2 bg-white ${config.appLogoSidebarPosition === 'center' ? 'justify-center' :
                            config.appLogoSidebarPosition === 'right' ? 'justify-end' : 'justify-start'
                        }`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={config.appLogo}
                            alt="Logo Sidebar"
                            style={{ height: `${config.appLogoHeight || '48'}px` }}
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
            {config.appLogo && (
                <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Login ({config.appLogoLoginPosition === 'left' ? 'Esquerda' : config.appLogoLoginPosition === 'center' ? 'Centro' : 'Direita'})</span>
                    <div className={`flex w-full border border-dashed border-gray-300 p-4 bg-white ${config.appLogoLoginPosition === 'center' ? 'justify-center' :
                            config.appLogoLoginPosition === 'right' ? 'justify-end' : 'justify-start'
                        }`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={config.appLogo}
                            alt="Logo Login"
                            style={{
                                height: `${config.appLogoHeight || '48'}px`,
                                transform: `scale(${config.appLogoLoginScale || 1})`
                            }}
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    </div>
