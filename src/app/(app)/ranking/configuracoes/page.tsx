'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getRankingAction, saveRankingConfigAction, triggerRankingAlertAction } from '@/actions/ranking';
import { Volume2, VolumeX, Zap, Siren, Save, Send, Music, Play, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SoundLibrarySelector } from "@/components/SoundLibrarySelector";

export default function RankingSettingsPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState({
        voiceEnabled: true,
        voiceSpeed: 1.1,
        soundEnabled: true,
        alertMode: 'confetti',
        soundUrl: '',
        manualAlertSoundUrl: '' // Som separado para disparo manual
    });
    const [message, setMessage] = useState('');
    const [isTestingVoice, setIsTestingVoice] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const result = (await getRankingAction('today')) as any; // Cast to access config
        if (result.success && result.config) {
            setSettings({
                voiceEnabled: result.config.voiceEnabled,
                voiceSpeed: parseFloat(result.config.voiceSpeed),
                soundEnabled: result.config.soundEnabled,
                alertMode: result.config.alertMode,
                soundUrl: result.config.soundUrl || '',
                manualAlertSoundUrl: result.config.manualAlertSoundUrl || ''
            });
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        console.log('💾 [Save] Salvando configurações...');
        console.log('💾 [Save] soundUrl length:', settings.soundUrl?.length || 0);
        console.log('💾 [Save] manualAlertSoundUrl length:', settings.manualAlertSoundUrl?.length || 0);
        console.log('💾 [Save] soundUrl preview:', settings.soundUrl?.substring(0, 50));
        console.log('💾 [Save] manualAlertSoundUrl preview:', settings.manualAlertSoundUrl?.substring(0, 50));

        const result = await saveRankingConfigAction(settings);
        if (result.success) {
            toast({ title: "Sucesso", description: "Configurações salvas!" });
            console.log('✅ [Save] Configurações salvas com sucesso!');
        } else {
            toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
            console.error('❌ [Save] Falha ao salvar:', result.message);
        }
    };

    const handleTestVoice = () => {
        if (!settings.voiceEnabled) {
            toast({ title: "Aviso", description: "Voz sintética está desabilitada.", variant: "destructive" });
            return;
        }
        setIsTestingVoice(true);
        const testMessage = message.trim() || "Este é um teste de voz sintética. BATERAM A META! PARABÉNS TIME!";

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(testMessage);
            utterance.lang = 'pt-BR';
            utterance.rate = settings.voiceSpeed;
            utterance.onend = () => setIsTestingVoice(false);
            utterance.onerror = () => {
                setIsTestingVoice(false);
                toast({ title: "Erro", description: "Falha ao testar voz.", variant: "destructive" });
            };
            window.speechSynthesis.speak(utterance);
            toast({ title: "Testando Voz", description: `Velocidade: ${settings.voiceSpeed}x` });
        } else {
            setIsTestingVoice(false);
            toast({ title: "Erro", description: "Navegador não suporta voz sintética.", variant: "destructive" });
        }
    };






    const handleTriggerMessage = async () => {
        if (!message.trim()) return;
        const result = await triggerRankingAlertAction(message);
        if (result.success) {
            toast({ title: "Sucesso", description: "Alerta enviado para o Ranking!" });
            setMessage('');
        } else {
            toast({ title: "Erro", description: "Falha ao enviar.", variant: "destructive" });
        }
    };

    if (isLoading) return <div>Carregando...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Configuração do Ranking</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Visual & Audio Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Audiovisual</CardTitle>
                        <CardDescription>Personalize a experiência da TV</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Alert Mode */}
                        <div className="space-y-3">
                            <Label>Modo de Celebração</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setSettings(s => ({ ...s, alertMode: 'confetti' }))}
                                    className={cn(
                                        "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                                        settings.alertMode === 'confetti'
                                            ? "bg-blue-50 border-blue-500 text-blue-600"
                                            : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    <Zap size={32} />
                                    <span className="font-bold">Festa (Confetes)</span>
                                </button>
                                <button
                                    onClick={() => setSettings(s => ({ ...s, alertMode: 'alert' }))}
                                    className={cn(
                                        "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                                        settings.alertMode === 'alert'
                                            ? "bg-red-50 border-red-500 text-red-600"
                                            : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    <Siren size={32} />
                                    <span className="font-bold">Plantão (Alerta)</span>
                                </button>
                            </div>
                        </div>

                        {/* Voice Settings */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    {settings.voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                    Voz Sintética
                                </Label>
                                <Switch
                                    checked={settings.voiceEnabled}
                                    onCheckedChange={(checked) => setSettings(s => ({ ...s, voiceEnabled: checked }))}
                                />
                            </div>

                            {settings.voiceEnabled && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Lenta (0.5x)</span>
                                        <span>Rápida (2.0x)</span>
                                    </div>
                                    <Slider
                                        min={0.5} max={2.0} step={0.1}
                                        value={[settings.voiceSpeed]}
                                        onValueChange={([val]) => setSettings(s => ({ ...s, voiceSpeed: val }))}
                                    />
                                    <div className="text-center text-xs text-slate-400">Velocidade Atual: {settings.voiceSpeed}x</div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTestVoice}
                                        disabled={isTestingVoice}
                                        className="w-full gap-2"
                                    >
                                        <Play size={14} />
                                        {isTestingVoice ? "Testando..." : "Testar Voz"}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Sound Settings */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <Music size={16} />
                                    Efeitos Sonoros
                                </Label>
                                <Switch
                                    checked={settings.soundEnabled}
                                    onCheckedChange={(checked) => setSettings(s => ({ ...s, soundEnabled: checked }))}
                                />
                            </div>
                            {settings.soundEnabled && (
                                <div className="space-y-3">
                                    <SoundLibrarySelector
                                        label="Som para Matrículas"
                                        value={settings.soundUrl}
                                        onSelect={(url) => setSettings(s => ({ ...s, soundUrl: url }))}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Manual Alert Sound Settings */}
                        <div className="space-y-4 pt-4 border-t">
                            <Label className="flex items-center gap-2">
                                <Siren size={16} />
                                Som do Disparo Manual
                            </Label>
                            {settings.soundEnabled && (
                                <div className="space-y-3">
                                    <SoundLibrarySelector
                                        label="Som para Disparo Manual"
                                        value={settings.manualAlertSoundUrl}
                                        onSelect={(url) => setSettings(s => ({ ...s, manualAlertSoundUrl: url }))}
                                    />
                                </div>
                            )}
                        </div>

                        <Button onClick={handleSave} className="w-full gap-2">
                            <Save size={16} /> Salvar Configurações
                        </Button>
                    </CardContent>
                </Card>

                {/* Manual Trigger */}
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardHeader>
                        <CardTitle className="text-amber-800 flex items-center gap-2">
                            <Siren className="text-amber-600" /> Disparo Manual
                        </CardTitle>
                        <CardDescription className="text-amber-700">
                            Envie uma mensagem de alerta instantânea para todas as telas de ranking.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Current Settings Preview */}
                        <div className="p-3 rounded-lg bg-white/60 border border-amber-200 space-y-2">
                            <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Configurações Ativas:</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className={cn(
                                    "px-2 py-1 rounded-full font-medium",
                                    settings.voiceEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                )}>
                                    {settings.voiceEnabled ? `🔊 Voz ${settings.voiceSpeed}x` : "🔇 Voz Desabilitada"}
                                </span>
                                <span className={cn(
                                    "px-2 py-1 rounded-full font-medium",
                                    settings.soundEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                )}>
                                    {settings.soundEnabled ? (settings.soundUrl ? "🎵 Som Customizado" : "🚨 Siren Padrão") : "🔇 Som Desabilitado"}
                                </span>
                                <span className="px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                                    {settings.alertMode === 'confetti' ? '🎉 Modo Festa' : '🚨 Modo Alerta'}
                                </span>
                            </div>
                        </div>

                        <Textarea
                            placeholder="Ex: BATERAM A META! PARABÉNS TIME!"
                            className="text-lg font-bold min-h-[120px] bg-white border-amber-200 focus:border-amber-400"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <Button
                            onClick={handleTriggerMessage}
                            disabled={!message.trim()}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2 font-bold"
                        >
                            <Send size={16} /> DISPARAR ALERTA
                        </Button>
                        <p className="text-xs text-amber-600/80 text-center">
                            Isso irá interromper o ranking e exibir o alerta em tela cheia por 10 segundos.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
