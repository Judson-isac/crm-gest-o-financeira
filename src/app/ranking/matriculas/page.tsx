'use client';

// Force dynamic rendering (no static generation during build)
export const dynamic = 'force-dynamic';

import { RankingFilterControls } from '@/components/ranking/ranking-filters';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getRankingAction, saveRankingConfigAction } from '@/actions/ranking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Crown, Volume2, VolumeX, Filter, Settings2, SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type RankingItem = {
    userId: string;
    nome: string;
    avatarUrl?: string;
    count: number;
    position: number;
};

type DailyStats = {
    total: number;
    byType: { name: string; count: number }[];
    byPolo: {
        polo: string;
        total: number;
        users: {
            nome: string;
            count: number;
            types: string[];
        }[];
    }[];
};

type AppSettings = {
    voiceEnabled: boolean;
    voiceSpeed: number;
    soundEnabled: boolean;
    alertMode: 'confetti' | 'alert';
    soundUrl?: string; // Som para matrículas
    manualAlertSoundUrl?: string; // Som para disparo manual
};

const DEFAULT_SETTINGS: AppSettings = {
    voiceEnabled: true,
    voiceSpeed: 1.1,
    soundEnabled: true,
    alertMode: 'confetti',
    soundUrl: '',
    manualAlertSoundUrl: ''
};

export default function RankingPage() {
    const searchParams = useSearchParams();
    const [ranking, setRanking] = useState<RankingItem[]>([]);
    const [period, setPeriod] = useState<'today' | 'month'>('today');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [distinctValues, setDistinctValues] = useState<{ polos: string[]; anos: number[]; processos?: any[] }>({ polos: [], anos: [] });
    const [stats, setStats] = useState<DailyStats | null>(null);
    const [redeId, setRedeId] = useState<string>('');
    const [redeNome, setRedeNome] = useState<string>('');
    const [lastSeenEnrollmentId, setLastSeenEnrollmentId] = useState<string | null>(null);
    const [currentMessage, setCurrentMessage] = useState<string>('');

    // Settings State - Now synced from server
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isRedAlert, setIsRedAlert] = useState(false);
    const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);

    // Removed localStorage logic

    // Web Audio API Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const manualAlertBufferRef = useRef<AudioBuffer | null>(null);
    const celebrationBufferRef = useRef<AudioBuffer | null>(null);

    // Initialize AudioContext on Mount
    useEffect(() => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioContextRef.current = new AudioContext();
        }
    }, []);

    // PERSISTENT HTML5 Audio Refs - Stay authorized after click
    const manualAlertAudioRef = useRef<HTMLAudioElement | null>(null);
    const celebrationAudioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize HTML5 Audio Elements
    useEffect(() => {
        manualAlertAudioRef.current = new Audio();
        celebrationAudioRef.current = new Audio();
    }, []);

    // Update audio src when settings change
    useEffect(() => {
        if (manualAlertAudioRef.current && settings.manualAlertSoundUrl) {
            manualAlertAudioRef.current.src = settings.manualAlertSoundUrl;
            manualAlertAudioRef.current.load();
        }
        if (celebrationAudioRef.current && settings.soundUrl) {
            celebrationAudioRef.current.src = settings.soundUrl;
            celebrationAudioRef.current.load();
        }
    }, [settings.manualAlertSoundUrl, settings.soundUrl]);

    // Helper: Decode Base64 to AudioBuffer
    const decodeAudio = async (base64Url: string): Promise<AudioBuffer | null> => {
        if (!audioContextRef.current) return null;
        try {
            const response = await fetch(base64Url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContextRef.current.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error("❌ Falha ao decodificar áudio:", e);
            return null;
        }
    };

    // Helper: Play Buffer
    const playBuffer = (buffer: AudioBuffer) => {
        if (!audioContextRef.current) return;

        // Ensure context is running (iOS requires this check/resume)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
    };

    // Load/Update Buffers when Settings Change
    useEffect(() => {
        const loadBuffers = async () => {
            // Celebration
            if (settings.soundUrl && settings.soundUrl.startsWith('data:audio/')) {
                celebrationBufferRef.current = await decodeAudio(settings.soundUrl);
            }
            // Manual Alert
            if (settings.manualAlertSoundUrl && settings.manualAlertSoundUrl.startsWith('data:audio/')) {
                manualAlertBufferRef.current = await decodeAudio(settings.manualAlertSoundUrl);
            }
        };
        loadBuffers();
    }, [settings.soundUrl, settings.manualAlertSoundUrl]);

    // Race Condition Guards
    const isFetchingRef = useRef(false);
    const lastSeenMessageIdRef = useRef<string | null>(null);
    const lastSeenEnrollmentIdRef = useRef<string | null>(null);

    // Sync Ref with State on Mount/Update (to handle initial load correctly)
    useEffect(() => {
        if (lastSeenMessageId) lastSeenMessageIdRef.current = lastSeenMessageId;
    }, [lastSeenMessageId]);

    useEffect(() => {
        if (lastSeenEnrollmentId) lastSeenEnrollmentIdRef.current = lastSeenEnrollmentId;
    }, [lastSeenEnrollmentId]);

    const fetchData = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            // Read filters from URL
            const polosParam = searchParams.get('polo');
            const polos = polosParam ? polosParam.split(',') : undefined;
            const processo = searchParams.get('processo') || undefined;

            const result = await getRankingAction(period, {
                polos,
                processo
            });

            if (result.success && result.data) {
                setRanking(result.data);
                if (result.stats) {
                    setStats(result.stats);
                }
                if (result.distinctValues) {
                    setDistinctValues(result.distinctValues);
                }
                if ((result as any).redeId) {
                    setRedeId((result as any).redeId);
                }
                if ((result as any).redeNome) {
                    setRedeNome((result as any).redeNome);
                }

                // ... Sync Settings code ...
                let currentSettings = settings;
                if (result.config) {
                    currentSettings = {
                        ...result.config,
                        voiceSpeed: parseFloat(result.config.voiceSpeed as any) || 1.1
                    };
                    setSettings(currentSettings);
                }

                // ... Celebration Logic code ...
                const latest = (result as any).latestEnrollment;
                if (latest && latest.id !== lastSeenEnrollmentIdRef.current) {
                    if (lastSeenEnrollmentIdRef.current !== null) { // Don't celebrate on initial load
                        triggerCelebration(latest, currentSettings);
                    }
                    setLastSeenEnrollmentId(latest.id);
                    lastSeenEnrollmentIdRef.current = latest.id;
                } else if (latest) {
                    // Ensure ref is synced if it was null (initial load)
                    lastSeenEnrollmentIdRef.current = latest.id;
                }

                // ... Manual Message Logic code ...
                const latestMsg = (result as any).latestMessage;
                if (latestMsg && latestMsg.id !== lastSeenMessageIdRef.current) {
                    if (lastSeenMessageIdRef.current !== null) {
                        triggerMessageAlert(latestMsg.message, currentSettings);
                    }
                    setLastSeenMessageId(latestMsg.id);
                    lastSeenMessageIdRef.current = latestMsg.id;
                } else if (latestMsg) {
                    // Ensure ref is synced
                    lastSeenMessageIdRef.current = latestMsg.id;
                }

                setLastUpdated(new Date());
            }
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    };

    // Use a ref to access the latest fetchData in the interval
    const fetchDataRef = useRef(fetchData);
    useEffect(() => {
        fetchDataRef.current = fetchData;
    });

    useEffect(() => {
        fetchData(); // Initial load
        const interval = setInterval(() => {
            fetchDataRef.current();
        }, 3000);
        return () => clearInterval(interval);
    }, [period, searchParams]); // Re-run if period or URL params change

    // Check Autoplay Permission on Mount
    useEffect(() => {
        // Assume blocked initially - user must click to authorize
        setIsAudioBlocked(true);
    }, []);

    const [isAudioBlocked, setIsAudioBlocked] = useState(false);

    const toggleSound = async () => {
        // 1. If blocked, UNLOCK (Resume Web Audio Context)
        if (isAudioBlocked) {
            const promises = [];

            if (manualAlertAudioRef.current) {
                promises.push(
                    manualAlertAudioRef.current.play()
                        .then(() => {
                            manualAlertAudioRef.current!.pause();
                            manualAlertAudioRef.current!.currentTime = 0;
                        })
                        .catch(console.error)
                );
            }

            if (celebrationAudioRef.current) {
                promises.push(
                    celebrationAudioRef.current.play()
                        .then(() => {
                            celebrationAudioRef.current!.pause();
                            celebrationAudioRef.current!.currentTime = 0;
                        })
                        .catch(console.error)
                );
            }

            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
            }

            await Promise.all(promises);
            setIsAudioBlocked(false);
            return;
        }

        // 2. If unlocked, TOGGLE MUTE (Persist to Server)
        const newStatus = !settings.soundEnabled;

        // Optimistic Update
        const newSettings = { ...settings, soundEnabled: newStatus };
        setSettings(newSettings);

        try {
            await saveRankingConfigAction({ ...newSettings, redeId: redeId });
        } catch (error) {
            console.error("Falha ao salvar som:", error);
            setSettings({ ...settings, soundEnabled: !newStatus });
        }
    };

    const triggerMessageAlert = (msg: string, currentSettings: AppSettings = settings) => {
        setCurrentMessage(msg);
        setIsRedAlert(true);

        // Sound - Play IMMEDIATELY
        if (currentSettings.soundEnabled && manualAlertAudioRef.current) {
            manualAlertAudioRef.current.currentTime = 0;
            manualAlertAudioRef.current.play().catch(e => console.error("Som:", e));
        }

        // Voice - 3 SECOND DELAY (som toca primeiro!)
        if (currentSettings.voiceEnabled && 'speechSynthesis' in window) {
            setTimeout(() => {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(msg);
                utterance.lang = 'pt-BR';
                utterance.rate = currentSettings.voiceSpeed;
                window.speechSynthesis.speak(utterance);
            }, 3000);
        }

        setTimeout(() => {
            setIsRedAlert(false);
            setCurrentMessage('');
        }, 10000);
    };

    const triggerCelebration = (enrollment: any, currentSettings: AppSettings = settings) => {
        // RESET Message 
        setCurrentMessage('');

        // Sound - Play IMMEDIATELY (Regardless of mode)
        if (currentSettings.soundEnabled && celebrationAudioRef.current) {
            celebrationAudioRef.current.currentTime = 0;
            celebrationAudioRef.current.play().catch(e => console.error("Som celebração:", e));
        }

        // RED ALERT MODE
        if (currentSettings.alertMode === 'alert') {
            setIsRedAlert(true);
            setTimeout(() => setIsRedAlert(false), 5000);
        }
        // CONFETTI MODE
        else {
            import('canvas-confetti').then((confetti) => {
                const duration = 5 * 1000;
                const animationEnd = Date.now() + duration;
                const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

                const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

                const interval: any = setInterval(function () {
                    const timeLeft = animationEnd - Date.now();

                    if (timeLeft <= 0) {
                        return clearInterval(interval);
                    }

                    const particleCount = 50 * (timeLeft / duration);

                    confetti.default({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                    confetti.default({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
                }, 250);
            });
        }

        // Text to Speech
        if (currentSettings.voiceEnabled && 'speechSynthesis' in window) {
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(
                    `Nova matrícula! ${enrollment.usuarioNome} acabou de vender ${enrollment.curso} em ${enrollment.polo}!`
                );
                utterance.lang = 'pt-BR';
                utterance.rate = currentSettings.voiceSpeed;
                window.speechSynthesis.speak(utterance);
            }, 3000);
        }

        // Visual Notification (Simple Toast Overlay)
        // Only show toast if NOT in Red Alert (since Red Alert covers screen) or maybe show anyway?
        // Let's hide valid toast if Red Alert is active to enforce the style
        if (currentSettings.alertMode !== 'alert') {
            const toast = document.createElement('div');
            toast.className = 'fixed top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-full shadow-2xl z-50 flex items-center gap-4 text-2xl font-bold animate-bounce';
            toast.innerHTML = `
                <span>🎉</span>
                <div>
                    <div class="text-sm font-normal opacity-90">NOVA MATRÍCULA</div>
                    <div>${enrollment.usuarioNome} - ${enrollment.polo.split(' - ')[0]}</div>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 6000);
        }
    };

    // Removed duplicate polling logic

    const topThree = ranking.filter(r => r.position <= 3);
    const others = ranking.filter(r => r.position > 3);

    // Active Filters Logic
    const activePolosCount = searchParams.get('polo')?.split(',').length || 0;
    const isProcessoActive = searchParams.get('processo') && searchParams.get('processo') !== 'all';
    const activeFiltersCount = activePolosCount + (isProcessoActive ? 1 : 0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto">
                {/* Header */}
                <div className="w-full max-w-7xl flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Ranking de Matrículas
                        </h1>
                        <p className="text-slate-400 mt-2" suppressHydrationWarning>
                            Atualizado em tempo real • Última: {lastUpdated.toLocaleTimeString()}
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={toggleSound}
                            className={cn(
                                "p-2 rounded-full font-medium transition-all mr-2",
                                isAudioBlocked
                                    ? "bg-red-500/20 text-red-500 animate-pulse hover:bg-red-500/30"
                                    : settings.soundEnabled
                                        ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                                        : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                            )}
                            title={isAudioBlocked ? "Som bloqueado! Clique para ativar." : settings.soundEnabled ? "Som Ativado" : "Som Desativado"}
                        >
                            {isAudioBlocked ? <VolumeX className="w-5 h-5" /> : (
                                settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />
                            )}
                        </button>

                        <button
                            onClick={() => setPeriod('today')}
                            className={cn(
                                "px-6 py-2 rounded-full font-medium transition-all",
                                period === 'today'
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            )}
                        >
                            Hoje
                        </button>
                        Este Mês
                    </button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    "relative flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ml-2 border outline-none",
                                    activeFiltersCount > 0
                                        ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                                        : "bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700"
                                )}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                <span>Filtros</span>
                                {activeFiltersCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-950">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 bg-slate-950/95 backdrop-blur-md border-slate-800 p-6 shadow-2xl z-[110]">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/50">
                                    <Settings2 className="w-4 h-4 text-blue-400" />
                                    <h3 className="font-bold text-sm uppercase tracking-widest text-slate-200">Configurar Filtros</h3>
                                </div>
                                <RankingFilterControls distinctValues={distinctValues} />
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Podium Section */}
            <div className="flex justify-center items-end gap-6 mb-16 w-full max-w-5xl h-[400px]">
                <AnimatePresence mode='popLayout'>
                    {/* 2nd Place */}
                    {topThree.find(r => r.position === 2) && (
                        <PodiumItem key="2nd" item={topThree.find(r => r.position === 2)!} color="silver" height="h-[280px]" />
                    )}

                    {/* 1st Place */}
                    {topThree.find(r => r.position === 1) && (
                        <PodiumItem key="1st" item={topThree.find(r => r.position === 1)!} color="gold" height="h-[340px]" isFirst />
                    )}

                    {/* 3rd Place */}
                    {topThree.find(r => r.position === 3) && (
                        <PodiumItem key="3rd" item={topThree.find(r => r.position === 3)!} color="bronze" height="h-[240px]" />
                    )}
                </AnimatePresence>

                {topThree.length === 0 && !isLoading && (
                    <div className="text-slate-500 text-xl">Nenhuma matrícula registrada ainda.</div>
                )}
            </div>

            {/* List Section */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                {others.map((item) => (
                    <motion.div
                        key={item.userId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-slate-500 w-8">#{item.position}</span>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-slate-700">
                                    <AvatarFallback className="bg-slate-800 text-slate-300">
                                        {item.nome.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-lg">{item.nome}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-white">{item.count}</span>
                            <span className="text-sm text-slate-500 uppercase tracking-wider">Vendas</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>

            {/* Premium Sidebar Stats Panel */ }
    {/* Red Alert Overlay */ }
    <AnimatePresence>
        {isRedAlert && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-red-600 flex items-center justify-center overflow-hidden pointer-events-none"
            >
                <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="absolute inset-0 bg-red-900"
                />
                <div className="relative z-10 text-center px-8">
                    <motion.h1
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="text-[80px] md:text-[120px] font-black text-white uppercase tracking-tighter leading-none drop-shadow-[0_10px_50px_rgba(0,0,0,0.5)] break-words w-full"
                    >
                        {currentMessage ? (
                            <>
                                {currentMessage.split(' ').map((word, i) => (
                                    <span key={i} className="block">{word}</span>
                                ))}
                            </>
                        ) : (
                            <>NOVA<br />MATRÍCULA</>
                        )}
                    </motion.h1>
                    {!currentMessage && (
                        <div className="text-4xl font-bold text-red-200 mt-8 animate-bounce uppercase tracking-[1em]">
                            Atenção Total
                        </div>
                    )}
                </div>
            </motion.div>
        )}
    </AnimatePresence>

    {
        stats && (
            <div className="w-[420px] bg-slate-900 border-l border-white/10 p-8 flex flex-col gap-8 shadow-2xl z-20 overflow-hidden relative">
                {/* Background Gradient Effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] pointer-events-none" />

                {/* Header */}
                <div className="relative">
                    <h2 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent uppercase tracking-tight leading-none mb-2 break-words">
                        {redeNome || 'Minha Rede'}
                    </h2>
                    <div className="flex items-center gap-2 text-slate-400 font-medium text-sm pl-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </div>
                </div>

                {/* Summary by Type */}
                <div className="space-y-3 relative">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Resumo por Categoria</div>
                    <div className="grid grid-cols-1 gap-2">
                        {/* Ensure we map over ALL types returned by DB, including 0 counts */}
                        {stats.byType?.map((t, i) => (
                            <div key={i} className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-1 h-8 rounded-full",
                                        t.count > 0 ? "bg-blue-500" : "bg-slate-700"
                                    )} />
                                    <span className={cn(
                                        "font-semibold text-sm uppercase tracking-wide",
                                        t.count > 0 ? "text-slate-200" : "text-slate-600"
                                    )}>
                                        {t.name}
                                    </span>
                                </div>
                                <span className={cn(
                                    "text-xl font-bold tabular-nums",
                                    t.count > 0 ? "text-white" : "text-slate-700"
                                )}>
                                    {String(t.count).padStart(2, '0')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Total Card */}
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-900/20 flex items-center justify-between">
                        <span className="font-bold text-sm uppercase tracking-widest opacity-80">Total Geral</span>
                        <span className="text-4xl font-black">{String(stats.total).padStart(2, '0')}</span>
                    </div>
                </div>

                <div className="h-px bg-white/10 w-full" />

                {/* Detailed List */}
                <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 sticky top-0 bg-slate-900 pb-2 z-10">
                        Detalhamento por Polo
                    </div>

                    {stats.byPolo?.map((polo, i) => (
                        <div key={i} className="group">
                            <div className="flex items-center justify-between mb-3 pl-1 border-l-2 border-amber-500/50 pl-3">
                                <h3 className="text-amber-400 font-bold uppercase text-sm tracking-widest truncate max-w-[240px]">
                                    {polo.polo.split(' - ')[0]}
                                </h3>
                                <span className="text-xs font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
                                    {String(polo.total).padStart(2, '0')}
                                </span>
                            </div>

                            <div className="space-y-1 pl-4">
                                {polo.users.map((u, j) => (
                                    <div key={j} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
                                                {String(u.count).padStart(2, '0')}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-200 text-sm font-medium leading-none">
                                                    {u.nome.split(' ')[0]}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                    {Array.isArray(u.types) ? u.types.join(' • ') : u.types}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {stats.byPolo?.length === 0 && (
                        <div className="text-center py-10 text-slate-600">
                            <span className="block text-4xl mb-2 opacity-20">📭</span>
                            <span className="text-sm italic">Nenhum lançamento hoje.</span>
                        </div>
                    )}
                </div>
            </div>
        )
    }
        </div >
    );
}

function PodiumItem({ item, color, height, isFirst }: { item: RankingItem, color: 'gold' | 'silver' | 'bronze', height: string, isFirst?: boolean }) {
    const colors = {
        gold: { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-400/30', glow: 'shadow-yellow-500/20' },
        silver: { bg: 'bg-slate-300', text: 'text-slate-300', border: 'border-slate-300/30', glow: 'shadow-slate-500/20' },
        bronze: { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600/30', glow: 'shadow-amber-500/20' }
    };

    const style = colors[color];

    return (
        <motion.div
            layoutId={item.userId}
            className="flex flex-col items-center group relative w-1/3 max-w-[280px]"
        >
            {/* Avatar & Crown */}
            <div className="relative mb-6">
                {isFirst && (
                    <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-lg z-10"
                    >
                        <Crown size={48} fill="currentColor" />
                    </motion.div>
                )}
                <Avatar className={cn(
                    "h-24 w-24 border-4 shadow-2xl transition-transform group-hover:scale-105",
                    style.border,
                    isFirst ? "h-32 w-32" : ""
                )}>
                    <AvatarFallback className="bg-slate-800 text-slate-200 text-2xl font-bold">
                        {item.nome.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className={cn(
                    "absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-bold bg-slate-900 border shadow-lg whitespace-nowrap",
                    style.border,
                    style.text
                )}>
                    {item.nome.split(' ')[0]}
                </div>
            </div>

            {/* Bar */}
            <motion.div
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
                className={cn(
                    "w-full rounded-t-2xl flex flex-col justify-between items-center p-6 relative overflow-hidden backdrop-blur-sm bg-gradient-to-b from-slate-800/80 to-slate-900/80 border-t border-x",
                    height,
                    style.border
                )}
            >
                <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-b", style.bg, "to-transparent")} />

                <div className="relative z-10 flex flex-col items-center gap-1">
                    <span className={cn("text-5xl font-black tabular-nums tracking-tighter drop-shadow-xl", style.text)}>
                        {item.count}
                    </span>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Vendas</span>
                </div>

                <div className="relative z-10">
                    {color === 'gold' && <Trophy size={48} className={style.text} strokeWidth={1} />}
                    {color === 'silver' && <Medal size={40} className={style.text} strokeWidth={1} />}
                    {color === 'bronze' && <Medal size={40} className={style.text} strokeWidth={1} />}
                </div>
            </motion.div>
        </motion.div>
    );
}
