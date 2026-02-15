'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WhatsAppInstance, Rede } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Square, CheckSquare, Search, Edit2, Trash2, Smartphone, Plus, RefreshCw, Upload, Settings2, Save, Globe } from 'lucide-react';
import { saveWhatsAppInstance, deleteWhatsAppInstance, getWhatsAppProfiles, saveWhatsAppProfile, deleteWhatsAppProfile } from '@/lib/db';
import { syncInstanceData, fetchInstancesFromServer, getQRCode, createInstance, setChatwoot } from '@/lib/evolution';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppClient } from '../whatsapp/whatsapp-client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface WhatsAppManagerProps {
    initialInstances: WhatsAppInstance[];
    redes: Rede[];
}

export function WhatsAppManager({ initialInstances, redes }: WhatsAppManagerProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [instances, setInstances] = useState<WhatsAppInstance[]>(initialInstances);

    // Update local state when server data changes
    useEffect(() => {
        setInstances(initialInstances);
    }, [initialInstances]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importData, setImportData] = useState({ url: '', token: '', redeId: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConnecting, setIsConnecting] = useState<WhatsAppInstance | null>(null);
    const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
    const [selectedRedeId, setSelectedRedeId] = useState<string>('all');
    const [newInstance, setNewInstance] = useState<Partial<WhatsAppInstance>>({
        instanceName: '',
        instanceToken: '',
        apiUrl: '',
        redeId: '',
    });

    const [isChatwootEnabled, setIsChatwootEnabled] = useState(false);
    const [chatwootProfiles, setChatwootProfiles] = useState<{ id: string, name: string, config: any }[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [chatwootConfig, setChatwootConfig] = useState({
        url: '',
        token: '',
        accountId: '',
        nameInbox: '',
        organization: '',
        logo: '',
        signMsg: true,
        signDelimiter: '',
        reopenConversation: true,
        conversationPending: false,
        importContacts: true,
        importMessages: true,
        daysLimitImportMessages: 7,
        autoCreate: true,
        ignoreJids: ''
    });

    const [activeTab, setActiveTab] = useState('geral');
    const [globalProfiles, setGlobalProfiles] = useState<any[]>([]);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<any>(null);

    // Network Setup states
    const [isRedeConfigOpen, setIsRedeConfigOpen] = useState(false);
    const [selectedRedeToConfig, setSelectedRedeToConfig] = useState<Rede | null>(null);
    const [redeConfig, setRedeConfig] = useState({
        enabled: false,
        apiUrl: '',
        apiToken: '',
        profileId: '',
        chatwootConfig: {
            url: '',
            token: '',
            accountId: '',
            nameInbox: '',
            organization: '',
            logo: '',
            signMsg: true,
            signDelimiter: '',
            reopenConversation: true,
            conversationPending: false,
            importContacts: true,
            importMessages: true,
            daysLimitImportMessages: 7,
            autoCreate: true,
            ignoreJids: ''
        }
    });

    // Load persisted import credentials
    useEffect(() => {
        const savedUrl = localStorage.getItem('EVOLUTION_IMPORT_URL');
        const savedToken = localStorage.getItem('EVOLUTION_IMPORT_TOKEN');
        if (savedUrl || savedToken) {
            setImportData(prev => ({
                ...prev,
                url: savedUrl || '',
                token: savedToken || ''
            }));
            setNewInstance(prev => ({
                ...prev,
                apiUrl: savedUrl || '',
                instanceToken: savedToken || ''
            }));
        }

        const savedProfiles = localStorage.getItem('CHATWOOT_PROFILES');
        if (savedProfiles) {
            try {
                const parsed = JSON.parse(savedProfiles);
                setChatwootProfiles(parsed);
                if (parsed.length > 0) {
                    setSelectedProfileId(parsed[0].id);
                    setChatwootConfig(parsed[0].config);
                }
            } catch (e) {
                console.error('Error parsing Chatwoot profiles:', e);
            }
        }
        const fetchGlobalProfiles = async () => {
            try {
                const profiles = await getWhatsAppProfiles();
                setGlobalProfiles(profiles);
            } catch (error) {
                console.error('Error fetching global profiles:', error);
            }
        };
        fetchGlobalProfiles();
    }, []);

    const saveChatwootProfile = (name: string) => {
        if (!chatwootConfig.url || !chatwootConfig.token || !chatwootConfig.accountId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha os dados do Chatwoot antes de salvar o perfil' });
            return;
        }
        const newProfile = { id: Date.now().toString(), name, config: { ...chatwootConfig } };
        const updated = [...chatwootProfiles, newProfile];
        setChatwootProfiles(updated);
        setSelectedProfileId(newProfile.id);
        localStorage.setItem('CHATWOOT_PROFILES', JSON.stringify(updated));
        toast({ title: 'Sucesso', description: `Perfil "${name}" salvo com sucesso` });
    };

    const handleSave = async () => {
        if (!newInstance.instanceName || !newInstance.instanceToken || !newInstance.redeId) {
            setActiveTab('geral');
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha o Nome, o Token e selecione a Rede no cartão Geral' });
            return;
        }

        setIsSaving(true);
        try {
            // Attempt to create in Evolution API
            try {
                await createInstance(
                    newInstance.instanceName!,
                    newInstance.apiUrl,
                    newInstance.instanceToken,
                    isChatwootEnabled ? chatwootConfig : undefined
                );
            } catch (err: any) {
                console.warn('Evolution API creation attempt:', err.message);
            }

            // Persist credentials
            if (newInstance.apiUrl) localStorage.setItem('EVOLUTION_IMPORT_URL', newInstance.apiUrl);
            if (newInstance.instanceToken) localStorage.setItem('EVOLUTION_IMPORT_TOKEN', newInstance.instanceToken);

            const saved = await saveWhatsAppInstance(newInstance);
            setInstances([...instances, saved]);
            setIsAddOpen(false);
            setNewInstance({
                instanceName: '',
                instanceToken: localStorage.getItem('EVOLUTION_IMPORT_TOKEN') || '',
                apiUrl: localStorage.getItem('EVOLUTION_IMPORT_URL') || '',
                redeId: ''
            });
            setActiveTab('geral');

            // Sync with Import state
            setImportData(prev => ({
                ...prev,
                url: newInstance.apiUrl || '',
                token: newInstance.instanceToken || ''
            }));

            toast({ title: 'Sucesso', description: 'Instância salva com sucesso' });
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar instância' });
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveRedeConfig = async () => {
        if (!selectedRedeToConfig) return;

        setIsSaving(true);
        try {
            const { saveRede } = await import('@/lib/db');
            await saveRede({
                ...selectedRedeToConfig,
                whatsapp_enabled: redeConfig.enabled,
                whatsapp_api_url: redeConfig.apiUrl,
                whatsapp_api_token: redeConfig.apiToken,
                whatsapp_chatwoot_config: redeConfig.chatwootConfig,
                whatsapp_profile_id: redeConfig.profileId || null
            });

            toast({ title: 'Sucesso', description: 'Configurações da rede salvas com sucesso' });
            setIsRedeConfigOpen(false);
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar configurações da rede' });
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingInstance) return;

        if (!editingInstance.instanceName || !editingInstance.instanceToken || !editingInstance.redeId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha o Nome, o Token e selecione a Rede' });
            return;
        }

        setIsSaving(true);
        try {
            const saved = await saveWhatsAppInstance(editingInstance);
            setInstances(instances.map(i => i.id === saved.id ? saved : i));
            setEditingInstance(null);
            toast({ title: 'Sucesso', description: 'Instância atualizada' });
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar instância' });
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            for (const instance of instances) {
                await syncInstanceData(instance.id);
            }
            toast({ title: 'Sucesso', description: 'Instâncias sincronizadas!' });
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao sincronizar instâncias' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleImport = async () => {
        if (!importData.url || !importData.token || !importData.redeId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha a URL, a API Key e selecione a Rede' });
            return;
        }

        // Persist credentials
        localStorage.setItem('EVOLUTION_IMPORT_URL', importData.url);
        localStorage.setItem('EVOLUTION_IMPORT_TOKEN', importData.token);

        // Sync with Add Instance state
        setNewInstance(prev => ({
            ...prev,
            apiUrl: importData.url,
            instanceToken: importData.token
        }));

        setIsImporting(true);
        try {
            const serverInstances = await fetchInstancesFromServer(importData.url, importData.token);
            let importedCount = 0;
            let skippedCount = 0;

            for (const si of serverInstances) {
                const name = si.instanceName || si.name;
                const token = si.token || si.instanceToken || importData.token;

                if (!instances.some(i => i.instanceName === name)) {
                    await saveWhatsAppInstance({
                        redeId: importData.redeId,
                        instanceName: name,
                        instanceToken: token,
                        apiUrl: importData.url,
                        status: si.status || 'Disconnected'
                    });
                    importedCount++;
                } else {
                    skippedCount++;
                }
            }

            toast({ title: 'Sucesso', description: `Importado ${importedCount} instâncias (${skippedCount} ignoradas por já existirem).` });
            setIsImportOpen(false);
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao importar do servidor' });
        } finally {
            setIsImporting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Deseja excluir as ${selectedIds.length} instâncias selecionadas?`)) return;

        try {
            for (const id of selectedIds) {
                await deleteWhatsAppInstance(id);
            }
            setInstances(instances.filter(i => !selectedIds.includes(i.id)));
            setSelectedIds([]);
            toast({ title: 'Sucesso', description: 'Instâncias excluídas' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir instâncias' });
        }
    };

    const handleBulkSync = async () => {
        if (selectedIds.length === 0) return;
        setIsSyncing(true);
        try {
            for (const id of selectedIds) {
                await syncInstanceData(id);
            }
            toast({ title: 'Sincronização iniciada', description: 'Status das instâncias selecionadas estão sendo atualizados.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao sincronizar instâncias' });
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredInstances = instances.filter(i => {
        const rede = redes.find(r => r.id === i.redeId);
        const search = searchTerm.toLowerCase();
        const matchesSearch = i.instanceName.toLowerCase().includes(search) ||
            rede?.nome.toLowerCase().includes(search) ||
            (!i.redeId && "sem rede".includes(search));

        const matchesRede = selectedRedeId === 'all' || i.redeId === selectedRedeId;
        return matchesSearch && matchesRede;
    });

    const handleBulkChangeRede = async (newRedeId: string) => {
        if (!newRedeId || newRedeId === 'all') return;
        if (!confirm(`Deseja mover ${selectedIds.length} instâncias para esta rede?`)) return;

        setIsSyncing(true);
        try {
            for (const id of selectedIds) {
                await saveWhatsAppInstance({ id, redeId: newRedeId });
            }
            toast({ title: 'Sucesso', description: `${selectedIds.length} instâncias movidas.` });
            setSelectedIds([]);
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao mover instâncias' });
        } finally {
            setIsSyncing(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredInstances.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredInstances.map(i => i.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta instância?')) return;

        try {
            await deleteWhatsAppInstance(id);
            setInstances(instances.filter(i => i.id !== id));
            toast({ title: 'Sucesso', description: 'Instância excluída' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir instância' });
            console.error(error);
        }
    };

    const handleSaveProfile = async () => {
        if (!editingProfile?.name) {
            toast({ variant: 'destructive', title: 'Erro', description: 'O nome do perfil é obrigatório' });
            return;
        }

        setIsSaving(true);
        try {
            const saved = await saveWhatsAppProfile(editingProfile);
            if (editingProfile.id) {
                setGlobalProfiles(globalProfiles.map(p => p.id === saved.id ? saved : p));
            } else {
                setGlobalProfiles([...globalProfiles, saved]);
            }
            setIsProfileDialogOpen(false);
            setEditingProfile(null);
            toast({ title: 'Sucesso', description: 'Perfil global salvo' });
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar perfil global' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-4 rounded-lg border shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold mr-2">WhatsApp</h1>

                    <div className="flex items-center gap-2">
                        <Select value={selectedRedeId} onValueChange={setSelectedRedeId}>
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Todas as Redes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Redes</SelectItem>
                                {redes.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar instância..."
                            className="pl-9 w-[200px] h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">{selectedIds.length} selecionados</span>
                            <div className="h-4 w-px bg-blue-200 dark:bg-blue-800" />
                            <Select onValueChange={handleBulkChangeRede}>
                                <SelectTrigger className="w-[160px] h-8 text-xs bg-background border-blue-200 dark:border-blue-800 focus:ring-blue-500">
                                    <SelectValue placeholder="Mover p/ Rede..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {redes.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400" onClick={handleBulkSync} disabled={isSyncing}>
                                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:bg-red-50 dark:hover:bg-red-950/30" onClick={handleBulkDelete}>
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    )}

                    <Button variant="outline" size="sm" className="h-9" onClick={handleSyncAll} disabled={isSyncing}>
                        <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar Tudo
                    </Button>

                    <Dialog open={isRedeConfigOpen} onOpenChange={setIsRedeConfigOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Settings2 size={16} /> Configurar Rede
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Configurar Padrões da Rede</DialogTitle>
                                <CardDescription>Defina os padrões de WhatsApp e Chatwoot para instâncias criadas por usuários desta rede.</CardDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Selecione a Rede</Label>
                                    <Select
                                        value={selectedRedeToConfig?.id}
                                        onValueChange={(id) => {
                                            const rede = redes.find(r => r.id === id);
                                            if (rede) {
                                                setSelectedRedeToConfig(rede);

                                                // Fallback to persisted credentials if rede is empty
                                                const finalApiUrl = rede.whatsapp_api_url || importData.url;
                                                const finalApiToken = rede.whatsapp_api_token || importData.token;

                                                setRedeConfig({
                                                    enabled: rede.whatsapp_enabled ?? false,
                                                    apiUrl: finalApiUrl,
                                                    apiToken: finalApiToken,
                                                    profileId: rede.whatsapp_profile_id ?? '',
                                                    chatwootConfig: (rede.whatsapp_chatwoot_config && Object.keys(rede.whatsapp_chatwoot_config).length > 0)
                                                        ? { ...chatwootConfig, ...rede.whatsapp_chatwoot_config }
                                                        : { ...chatwootConfig }
                                                });
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma rede" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {redes.map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedRedeToConfig && (
                                    <>
                                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Liberar Criação para Usuários</Label>
                                                <p className="text-sm text-muted-foreground">Permite que usuários desta rede criem suas próprias instâncias.</p>
                                            </div>
                                            <Switch
                                                checked={redeConfig.enabled}
                                                onCheckedChange={(v) => setRedeConfig({ ...redeConfig, enabled: v })}
                                            />
                                        </div>

                                        <div className="space-y-4 max-h-[40vh] overflow-y-auto px-1">
                                            <div className="space-y-2">
                                                <Label>URL da Evolution API (Padrão)</Label>
                                                <Input
                                                    placeholder="https://api.suaevolution.com"
                                                    value={redeConfig.apiUrl}
                                                    onChange={(e) => setRedeConfig({ ...redeConfig, apiUrl: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Token da Evolution API (Padrão)</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="API Key"
                                                    value={redeConfig.apiToken}
                                                    onChange={(e) => setRedeConfig({ ...redeConfig, apiToken: e.target.value })}
                                                />
                                            </div>

                                            <div className="pt-4 border-t">
                                                <h4 className="font-medium mb-4 text-sm uppercase tracking-wider text-muted-foreground">Configurações Chatwoot (Padrão)</h4>

                                                <div className="space-y-2 mb-4">
                                                    <Label>Perfil Global de Configuração</Label>
                                                    <div className="flex gap-2">
                                                        <Select
                                                            value={redeConfig.profileId}
                                                            onValueChange={(id) => {
                                                                const profile = globalProfiles.find(p => p.id === id);
                                                                if (profile) {
                                                                    setRedeConfig({
                                                                        ...redeConfig,
                                                                        profileId: profile.id,
                                                                        apiUrl: profile.api_url || redeConfig.apiUrl,
                                                                        apiToken: profile.api_token || redeConfig.apiToken,
                                                                        chatwootConfig: { ...redeConfig.chatwootConfig, ...(profile.chatwoot_config || {}) }
                                                                    });
                                                                } else {
                                                                    setRedeConfig({ ...redeConfig, profileId: '' });
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className="flex-1">
                                                                <SelectValue placeholder="Selecione um perfil global" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">Configuração Manual (Sem Perfil)</SelectItem>
                                                                {globalProfiles.map(p => (
                                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {redeConfig.profileId && (
                                                            <Button variant="outline" size="icon" onClick={() => setRedeConfig({ ...redeConfig, profileId: '' })} title="Usar Manual">
                                                                <RefreshCw size={14} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground italic">
                                                        {redeConfig.profileId
                                                            ? "Vinculado a um perfil global. Alterações no perfil refletirão aqui."
                                                            : "Usando configuração manual específica para esta rede."}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Nome da Inbox</Label>
                                                        <Input
                                                            placeholder="Ex: WhatsApp Atendimento"
                                                            value={redeConfig.chatwootConfig.nameInbox}
                                                            onChange={(e) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, nameInbox: e.target.value }
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Organização</Label>
                                                        <Input
                                                            placeholder="Ex: Minha Empresa"
                                                            value={redeConfig.chatwootConfig.organization}
                                                            onChange={(e) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, organization: e.target.value }
                                                            })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div className="space-y-2">
                                                        <Label>URL do Chatwoot</Label>
                                                        <Input
                                                            value={redeConfig.chatwootConfig.url}
                                                            onChange={(e) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, url: e.target.value }
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Account ID</Label>
                                                        <Input
                                                            value={redeConfig.chatwootConfig.accountId}
                                                            onChange={(e) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, accountId: e.target.value }
                                                            })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mt-4">
                                                    <Label>Token do Chatwoot</Label>
                                                    <Input
                                                        type="password"
                                                        value={redeConfig.chatwootConfig.token}
                                                        onChange={(e) => setRedeConfig({
                                                            ...redeConfig,
                                                            chatwootConfig: { ...redeConfig.chatwootConfig, token: e.target.value }
                                                        })}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={redeConfig.chatwootConfig.signMsg}
                                                            onCheckedChange={(v) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, signMsg: v }
                                                            })}
                                                        />
                                                        <Label>Assinar Mensagens</Label>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Separador</Label>
                                                        <Input
                                                            placeholder="\n"
                                                            value={redeConfig.chatwootConfig.signDelimiter}
                                                            onChange={(e) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, signDelimiter: e.target.value }
                                                            })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mt-4">
                                                    <Label>Link do Logo</Label>
                                                    <Input
                                                        placeholder="URL da imagem"
                                                        value={redeConfig.chatwootConfig.logo}
                                                        onChange={(e) => setRedeConfig({
                                                            ...redeConfig,
                                                            chatwootConfig: { ...redeConfig.chatwootConfig, logo: e.target.value }
                                                        })}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={redeConfig.chatwootConfig.conversationPending}
                                                            onCheckedChange={(v) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, conversationPending: v }
                                                            })}
                                                        />
                                                        <Label>Conversa Pendente</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={redeConfig.chatwootConfig.reopenConversation}
                                                            onCheckedChange={(v) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, reopenConversation: v }
                                                            })}
                                                        />
                                                        <Label>Reabrir Conversa</Label>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={redeConfig.chatwootConfig.importContacts}
                                                            onCheckedChange={(v) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, importContacts: v }
                                                            })}
                                                        />
                                                        <Label>Importar Contatos</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={redeConfig.chatwootConfig.importMessages}
                                                            onCheckedChange={(v) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, importMessages: v }
                                                            })}
                                                        />
                                                        <Label>Importar Mensagens</Label>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div className="space-y-2">
                                                        <Label>Limite Dias</Label>
                                                        <Input
                                                            type="number"
                                                            value={redeConfig.chatwootConfig.daysLimitImportMessages}
                                                            onChange={(e) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: {
                                                                    ...redeConfig.chatwootConfig,
                                                                    daysLimitImportMessages: parseInt(e.target.value) || 0
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={redeConfig.chatwootConfig.autoCreate}
                                                            onCheckedChange={(v) => setRedeConfig({
                                                                ...redeConfig,
                                                                chatwootConfig: { ...redeConfig.chatwootConfig, autoCreate: v }
                                                            })}
                                                        />
                                                        <Label>Auto Create (Inbox)</Label>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mt-4">
                                                    <Label>Ignorar JIDs</Label>
                                                    <Input
                                                        placeholder="Ex: 1234567890@s.whatsapp.net"
                                                        value={redeConfig.chatwootConfig.ignoreJids}
                                                        onChange={(e) => setRedeConfig({
                                                            ...redeConfig,
                                                            chatwootConfig: { ...redeConfig.chatwootConfig, ignoreJids: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsRedeConfigOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSaveRedeConfig} disabled={isSaving || !selectedRedeToConfig}>
                                    {isSaving ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                                    Salvar Padrões
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Upload size={16} /> Importar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Importar Instâncias da Evolution</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Rede de Destino</Label>
                                    <Select
                                        value={importData.redeId}
                                        onValueChange={(v) => {
                                            const rede = redes.find(r => r.id === v);
                                            const profile = globalProfiles.find(p => p.id === rede?.whatsapp_profile_id);

                                            setImportData({
                                                ...importData,
                                                redeId: v,
                                                url: profile?.api_url || rede?.whatsapp_api_url || importData.url,
                                                token: profile?.api_token || rede?.whatsapp_api_token || importData.token
                                            });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a rede" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {redes.map(rede => (
                                                <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>URL do Servidor Evolution</Label>
                                    <Input
                                        placeholder="Ex: https://api.suaevolution.com"
                                        value={importData.url}
                                        onChange={(e) => setImportData({ ...importData, url: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Global API Key</Label>
                                    <Input
                                        placeholder="Sua Global API Key"
                                        type="password"
                                        value={importData.token}
                                        onChange={(e) => setImportData({ ...importData, token: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsImportOpen(false)} disabled={isImporting}>Cancelar</Button>
                                <Button onClick={handleImport} disabled={isImporting}>
                                    {isImporting ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                                    {isImporting ? 'Importando...' : 'Importar Agora'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-9 gap-2">
                                <Plus size={16} /> Nova Instância
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nova Instância Evolution</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="geral">Geral</TabsTrigger>
                                        <TabsTrigger value="chatwoot">Chatwoot</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="geral" className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Rede</Label>
                                            <Select
                                                value={newInstance.redeId}
                                                onValueChange={(v) => {
                                                    const rede = redes.find(r => r.id === v);
                                                    const profile = globalProfiles.find(p => p.id === rede?.whatsapp_profile_id);

                                                    const finalApiUrl = profile?.api_url || rede?.whatsapp_api_url || newInstance.apiUrl;
                                                    const finalApiToken = profile?.api_token || rede?.whatsapp_api_token || newInstance.instanceToken;

                                                    const finalChatwootConfig = {
                                                        ...chatwootConfig,
                                                        ...(profile?.chatwoot_config || {}),
                                                        ...(rede?.whatsapp_chatwoot_config || {}),
                                                        nameInbox: chatwootConfig.nameInbox || profile?.chatwoot_config?.nameInbox || rede?.whatsapp_chatwoot_config?.nameInbox || newInstance.instanceName
                                                    };

                                                    setNewInstance({
                                                        ...newInstance,
                                                        redeId: v,
                                                        apiUrl: finalApiUrl,
                                                        instanceToken: finalApiToken
                                                    });

                                                    if (profile || (rede?.whatsapp_chatwoot_config && Object.keys(rede.whatsapp_chatwoot_config).length > 0)) {
                                                        setIsChatwootEnabled(true);
                                                        setChatwootConfig(finalChatwootConfig);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a rede" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {redes.map(rede => (
                                                        <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Nome da Instância</Label>
                                            <Input
                                                placeholder="Ex: rede_conchas"
                                                value={newInstance.instanceName}
                                                onChange={(e) => setNewInstance({ ...newInstance, instanceName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Token da Instância (API Key)</Label>
                                            <Input
                                                placeholder="Sua Global API Key"
                                                type="password"
                                                value={newInstance.instanceToken}
                                                onChange={(e) => setNewInstance({ ...newInstance, instanceToken: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>URL da Evolution API (Opcional)</Label>
                                            <Input
                                                placeholder="Ex: https://api.suaevolution.com"
                                                value={newInstance.apiUrl}
                                                onChange={(e) => setNewInstance({ ...newInstance, apiUrl: e.target.value })}
                                            />
                                            <p className="text-xs text-muted-foreground italic">Se vazio, usará a URL padrão configurada no servidor.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Nome da Inbox (Chatwoot)</Label>
                                            <Input
                                                placeholder="Ex: Comercial, Suporte..."
                                                value={chatwootConfig.nameInbox}
                                                onChange={(e) => setChatwootConfig({ ...chatwootConfig, nameInbox: e.target.value })}
                                            />
                                            <p className="text-xs text-muted-foreground italic">Identificador único da inbox no Chatwoot.</p>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="chatwoot" className="py-4">
                                        <div className="max-h-[60vh] overflow-y-auto px-1 space-y-6 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                                <div className="space-y-0.5">
                                                    <Label className="text-base">Habilitar Chatwoot</Label>
                                                    <p className="text-sm text-muted-foreground">Vincular esta instância a uma conta do Chatwoot</p>
                                                </div>
                                                <Switch
                                                    checked={isChatwootEnabled}
                                                    onCheckedChange={setIsChatwootEnabled}
                                                />
                                            </div>

                                            {isChatwootEnabled && (
                                                <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <Label>Perfil de Credenciais</Label>
                                                        <div className="flex gap-2">
                                                            <Select
                                                                value={selectedProfileId}
                                                                onValueChange={(id) => {
                                                                    setSelectedProfileId(id);
                                                                    const profile = chatwootProfiles.find(p => p.id === id);
                                                                    if (profile) setChatwootConfig(profile.config);
                                                                }}
                                                            >
                                                                <SelectTrigger className="flex-1">
                                                                    <SelectValue placeholder="Selecione um perfil salvo" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {chatwootProfiles.map(p => (
                                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                variant="secondary"
                                                                size="icon"
                                                                title="Salvar como novo perfil"
                                                                onClick={() => {
                                                                    const name = prompt('Nome do Perfil:');
                                                                    if (name) saveChatwootProfile(name);
                                                                }}
                                                            >
                                                                <Save className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Nome da Inbox</Label>
                                                            <Input
                                                                placeholder="Ex: WhatsApp Atendimento"
                                                                value={chatwootConfig.nameInbox}
                                                                onChange={(e) => setChatwootConfig({ ...chatwootConfig, nameInbox: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Organização</Label>
                                                            <Input
                                                                placeholder="Ex: Minha Empresa"
                                                                value={chatwootConfig.organization}
                                                                onChange={(e) => setChatwootConfig({ ...chatwootConfig, organization: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>URL do Chatwoot</Label>
                                                            <Input
                                                                placeholder="https://chat.dominio.com"
                                                                value={chatwootConfig.url}
                                                                onChange={(e) => setChatwootConfig({ ...chatwootConfig, url: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Account ID</Label>
                                                            <Input
                                                                placeholder="Ex: 1"
                                                                value={chatwootConfig.accountId}
                                                                onChange={(e) => setChatwootConfig({ ...chatwootConfig, accountId: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Token do Chatwoot</Label>
                                                        <Input
                                                            placeholder="Seu Token"
                                                            type="password"
                                                            value={chatwootConfig.token}
                                                            onChange={(e) => setChatwootConfig({ ...chatwootConfig, token: e.target.value })}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={chatwootConfig.signMsg}
                                                                onCheckedChange={(v) => setChatwootConfig({ ...chatwootConfig, signMsg: v })}
                                                            />
                                                            <Label>Assinar Mensagens</Label>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Separador da Assinatura</Label>
                                                            <Input
                                                                placeholder="\n"
                                                                value={chatwootConfig.signDelimiter}
                                                                onChange={(e) => setChatwootConfig({ ...chatwootConfig, signDelimiter: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Link do Logo</Label>
                                                        <Input
                                                            placeholder="URL da imagem"
                                                            value={chatwootConfig.logo}
                                                            onChange={(e) => setChatwootConfig({ ...chatwootConfig, logo: e.target.value })}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={chatwootConfig.conversationPending}
                                                                onCheckedChange={(v) => setChatwootConfig({ ...chatwootConfig, conversationPending: v })}
                                                            />
                                                            <Label>Conversa Pendente</Label>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={chatwootConfig.reopenConversation}
                                                                onCheckedChange={(v) => setChatwootConfig({ ...chatwootConfig, reopenConversation: v })}
                                                            />
                                                            <Label>Reabrir Conversa</Label>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={chatwootConfig.importContacts}
                                                                onCheckedChange={(v) => setChatwootConfig({ ...chatwootConfig, importContacts: v })}
                                                            />
                                                            <Label>Importar Contatos</Label>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={chatwootConfig.importMessages}
                                                                onCheckedChange={(v) => setChatwootConfig({ ...chatwootConfig, importMessages: v })}
                                                            />
                                                            <Label>Importar Mensagens</Label>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Limite de Dias (Importação)</Label>
                                                            <Input
                                                                type="number"
                                                                value={chatwootConfig.daysLimitImportMessages}
                                                                onChange={(e) => setChatwootConfig({ ...chatwootConfig, daysLimitImportMessages: parseInt(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={chatwootConfig.autoCreate}
                                                                onCheckedChange={(v) => setChatwootConfig({ ...chatwootConfig, autoCreate: v })}
                                                            />
                                                            <Label>Auto Create (Inbox)</Label>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Ignorar JIDs</Label>
                                                        <Input
                                                            placeholder="Ex: 1234567890@s.whatsapp.net, 0987654321@s.whatsapp.net"
                                                            value={chatwootConfig.ignoreJids}
                                                            onChange={(e) => setChatwootConfig({ ...chatwootConfig, ignoreJids: e.target.value })}
                                                        />
                                                        <p className="text-xs text-muted-foreground italic">Separe múltiplos JIDs por vírgula.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancelar</Button>
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                                    Salvar
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs defaultValue="instances" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="instances">Instâncias Ativas</TabsTrigger>
                    <TabsTrigger value="profiles">Perfis Globais</TabsTrigger>
                </TabsList>

                <TabsContent value="instances" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Instâncias Ativas</CardTitle>
                            <CardDescription>Configure aqui as conexões com a Evolution API para cada rede.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Button variant="ghost" size="icon" onClick={toggleSelectAll}>
                                                {selectedIds.length === filteredInstances.length && filteredInstances.length > 0 ? (
                                                    <CheckSquare className="h-4 w-4" />
                                                ) : (
                                                    <Square className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableHead>
                                        <TableHead>Rede</TableHead>
                                        <TableHead>Nome da Instância</TableHead>
                                        <TableHead>API URL</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Número</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInstances.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                Nenhuma instância encontrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredInstances.map((instance) => {
                                            const rede = redes.find(r => r.id === instance.redeId);
                                            return (
                                                <TableRow key={instance.id} className={selectedIds.includes(instance.id) ? "bg-muted/50" : ""}>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => toggleSelect(instance.id)}>
                                                            {selectedIds.includes(instance.id) ? (
                                                                <CheckSquare className="h-4 w-4" />
                                                            ) : (
                                                                <Square className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={instance.redeId}
                                                            onValueChange={async (newRedeId) => {
                                                                try {
                                                                    const saved = await saveWhatsAppInstance({ id: instance.id, redeId: newRedeId });
                                                                    setInstances(instances.map(i => i.id === saved.id ? saved : i));
                                                                    toast({ title: 'Sucesso', description: 'Rede atualizada' });
                                                                    router.refresh();
                                                                } catch (error) {
                                                                    toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao mudar rede' });
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs w-[160px] bg-transparent border-none hover:bg-muted/50 transition-colors focus:ring-0 px-2 font-medium">
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <div className="h-2 w-2 rounded-full flex-shrink-0 bg-blue-500" />
                                                                    <SelectValue>
                                                                        {rede?.nome || 'Desconhecida'}
                                                                    </SelectValue>
                                                                </div>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {redes.map(r => (
                                                                    <SelectItem key={r.id} value={r.id}>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                                            {r.nome}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10 border">
                                                                <AvatarImage src={instance.profilePicUrl} alt={instance.instanceName} />
                                                                <AvatarFallback className="bg-muted">
                                                                    {instance.profileName ? instance.profileName.substring(0, 2).toUpperCase() : <Smartphone className="h-4 w-4 text-muted-foreground" />}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{instance.instanceName}</span>
                                                                {instance.profileName && (
                                                                    <span className="text-xs text-muted-foreground">{instance.profileName}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="max-w-[150px] truncate" title={instance.apiUrl || 'Padrão'}>
                                                        {instance.apiUrl || 'Padrão'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${instance.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {instance.status === 'open' ? 'Conectado' : 'Desconectado'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{instance.phoneNumber || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" title="Conectar" onClick={() => setIsConnecting(instance)}>
                                                                <Smartphone size={16} className="text-blue-600" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditingInstance(instance)}>
                                                                <Edit2 size={16} className="text-muted-foreground" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDelete(instance.id)}>
                                                                <Trash2 size={16} className="text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="profiles" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Perfis Globais de Configuração</CardTitle>
                                <CardDescription>Gerencie credenciais reutilizáveis para Evolution API e Chatwoot.</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => { setEditingProfile(null); setIsProfileDialogOpen(true); }}>
                                <Plus size={16} className="mr-2" /> Novo Perfil
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome do Perfil</TableHead>
                                        <TableHead>Evolution API</TableHead>
                                        <TableHead>Chatwoot Account</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {globalProfiles.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                Nenhum perfil cadastrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        globalProfiles.map((profile) => (
                                            <TableRow key={profile.id}>
                                                <TableCell className="font-medium">{profile.name}</TableCell>
                                                <TableCell className="text-xs truncate max-w-[200px]">{profile.api_url || 'Nenhum'}</TableCell>
                                                <TableCell className="text-xs">{profile.chatwoot_config?.accountId || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => { setEditingProfile(profile); setIsProfileDialogOpen(true); }}>
                                                            <Edit2 size={16} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                                                            if (confirm('Excluir este perfil? Redes vinculadas perderão o vínculo.')) {
                                                                await deleteWhatsAppProfile(profile.id);
                                                                setGlobalProfiles(globalProfiles.filter(p => p.id !== profile.id));
                                                                toast({ title: 'Perfil excluído' });
                                                            }
                                                        }}>
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isProfileDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsProfileDialogOpen(false);
                    setEditingProfile(null);
                }
            }}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>{editingProfile?.id ? 'Editar Perfil Global' : 'Novo Perfil Global'}</DialogTitle>
                        <CardDescription>Defina credenciais que serão compartilhadas e sincronizadas entre múltiplas redes.</CardDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-1">
                        <div className="space-y-4">
                            <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">Configurações Base</h4>
                            <div className="space-y-2">
                                <Label>Nome do Perfil</Label>
                                <Input
                                    placeholder="Ex: Credenciais Oficiais - Brazao"
                                    value={editingProfile?.name || ''}
                                    onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>URL da Evolution</Label>
                                    <Input
                                        placeholder="https://api..."
                                        value={editingProfile?.api_url || ''}
                                        onChange={(e) => setEditingProfile({ ...editingProfile, api_url: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Token da Evolution</Label>
                                    <Input
                                        type="password"
                                        placeholder="API Key"
                                        value={editingProfile?.api_token || ''}
                                        onChange={(e) => setEditingProfile({ ...editingProfile, api_token: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t space-y-4">
                            <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">Configurações Chatwoot (Global)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome da Inbox</Label>
                                    <Input
                                        value={editingProfile?.chatwoot_config?.nameInbox || ''}
                                        onChange={(e) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, nameInbox: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Organização</Label>
                                    <Input
                                        value={editingProfile?.chatwoot_config?.organization || ''}
                                        onChange={(e) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, organization: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>URL do Chatwoot</Label>
                                    <Input
                                        value={editingProfile?.chatwoot_config?.url || ''}
                                        onChange={(e) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, url: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account ID</Label>
                                    <Input
                                        value={editingProfile?.chatwoot_config?.accountId || ''}
                                        onChange={(e) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, accountId: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Token do Chatwoot</Label>
                                <Input
                                    type="password"
                                    value={editingProfile?.chatwoot_config?.token || ''}
                                    onChange={(e) => setEditingProfile({
                                        ...editingProfile,
                                        chatwoot_config: { ...editingProfile?.chatwoot_config, token: e.target.value }
                                    })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={editingProfile?.chatwoot_config?.signMsg ?? true}
                                        onCheckedChange={(v) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, signMsg: v }
                                        })}
                                    />
                                    <Label>Assinar Mensagens</Label>
                                </div>
                                <div className="space-y-2">
                                    <Label>Separador</Label>
                                    <Input
                                        placeholder="\n"
                                        value={editingProfile?.chatwoot_config?.signDelimiter || ''}
                                        onChange={(e) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, signDelimiter: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={editingProfile?.chatwoot_config?.autoCreate ?? true}
                                        onCheckedChange={(v) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, autoCreate: v }
                                        })}
                                    />
                                    <Label>Auto Create (Inbox)</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={editingProfile?.chatwoot_config?.reopenConversation ?? true}
                                        onCheckedChange={(v) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, reopenConversation: v }
                                        })}
                                    />
                                    <Label>Reabrir Conversa</Label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={editingProfile?.chatwoot_config?.conversationPending ?? false}
                                        onCheckedChange={(v) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, conversationPending: v }
                                        })}
                                    />
                                    <Label>Conversa Pendente</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={editingProfile?.chatwoot_config?.importContacts ?? true}
                                        onCheckedChange={(v) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, importContacts: v }
                                        })}
                                    />
                                    <Label>Importar Contatos</Label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={editingProfile?.chatwoot_config?.importMessages ?? true}
                                        onCheckedChange={(v) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, importMessages: v }
                                        })}
                                    />
                                    <Label>Importar Mensagens</Label>
                                </div>
                                <div className="space-y-2">
                                    <Label>Limite Dias</Label>
                                    <Input
                                        type="number"
                                        value={editingProfile?.chatwoot_config?.daysLimitImportMessages ?? 7}
                                        onChange={(e) => setEditingProfile({
                                            ...editingProfile,
                                            chatwoot_config: { ...editingProfile?.chatwoot_config, daysLimitImportMessages: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Ignorar JIDs</Label>
                                <Input
                                    placeholder="Ex: 1234567890@s.whatsapp.net"
                                    value={editingProfile?.chatwoot_config?.ignoreJids || ''}
                                    onChange={(e) => setEditingProfile({
                                        ...editingProfile,
                                        chatwoot_config: { ...editingProfile?.chatwoot_config, ignoreJids: e.target.value }
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveProfile} disabled={isSaving}>
                            {isSaving ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                            Salvar Perfil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!isConnecting} onOpenChange={(open) => !open && setIsConnecting(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Conectar WhatsApp: {isConnecting?.instanceName}</DialogTitle>
                    </DialogHeader>
                    {isConnecting && (
                        <div className="py-4">
                            <WhatsAppClient instance={isConnecting} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingInstance} onOpenChange={(open) => !open && setEditingInstance(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Instância</DialogTitle>
                    </DialogHeader>
                    {editingInstance && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Rede</Label>
                                <Select
                                    value={editingInstance.redeId}
                                    onValueChange={(v) => setEditingInstance({ ...editingInstance, redeId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a rede" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {redes.map(rede => (
                                            <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nome da Instância</Label>
                                <Input
                                    value={editingInstance.instanceName}
                                    onChange={(e) => setEditingInstance({ ...editingInstance, instanceName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Token da Instância</Label>
                                <Input
                                    value={editingInstance.instanceToken}
                                    onChange={(e) => setEditingInstance({ ...editingInstance, instanceToken: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>URL da Evolution API</Label>
                                <Input
                                    value={editingInstance.apiUrl || ''}
                                    onChange={(e) => setEditingInstance({ ...editingInstance, apiUrl: e.target.value })}
                                    placeholder="Deixe vazio para usar a padrão"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingInstance(null)}>Cancelar</Button>
                        <Button onClick={handleUpdate} disabled={isSaving}>
                            {isSaving ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
