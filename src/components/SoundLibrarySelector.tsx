'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Trash2, Play, Pause, Upload, Plus, Music } from 'lucide-react';
import { getSavedSoundsAction, saveSoundAction, deleteSoundAction } from '@/actions/ranking';
import { SavedSound } from '@/lib/db';

interface SoundLibrarySelectorProps {
    value?: string;
    onSelect: (url: string) => void;
    label: string;
}

export function SoundLibrarySelector({ value, onSelect, label }: SoundLibrarySelectorProps) {
    const [sounds, setSounds] = useState<SavedSound[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState<string | null>(null);
    const [uploadMode, setUploadMode] = useState(false);
    const [newSoundName, setNewSoundName] = useState('');
    const [newSoundFile, setNewSoundFile] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initial load
    useEffect(() => {
        loadSounds();
    }, []);

    const loadSounds = async () => {
        setIsLoading(true);
        const result = await getSavedSoundsAction();
        if (result.success && result.data) {
            setSounds(result.data);
        }
        setIsLoading(false);
    };

    const handlePlay = (url: string, id: string) => {
        if (isPlaying === id) {
            audioRef.current?.pause();
            setIsPlaying(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => setIsPlaying(null);
            audio.play();
            setIsPlaying(id);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            toast({ title: "Erro", description: "Apenas arquivos de áudio.", variant: "destructive" });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Erro", description: "Máximo 5MB.", variant: "destructive" });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setNewSoundFile(base64);
            // Default name from filename without extension
            if (!newSoundName) {
                setNewSoundName(file.name.replace(/\.[^/.]+$/, ""));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSaveNewSound = async () => {
        if (!newSoundName || !newSoundFile) return;

        setIsLoading(true);
        const result = await saveSoundAction(newSoundName, newSoundFile);
        if (result.success) {
            toast({ title: "Sucesso", description: "Som salvo na biblioteca!" });
            setUploadMode(false);
            setNewSoundFile(null);
            setNewSoundName('');
            loadSounds();
            // Auto-select the new sound
            if (result.data) {
                onSelect(result.data.url);
            }
        } else {
            toast({ title: "Erro", description: "Falha ao salvar som.", variant: "destructive" });
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este som?')) return;

        const result = await deleteSoundAction(id);
        if (result.success) {
            toast({ title: "Sucesso", description: "Som excluído." });
            loadSounds();
            // Deselect if currently selected
            const deletedSound = sounds.find(s => s.id === id);
            if (deletedSound && deletedSound.url === value) {
                onSelect('');
            }
        } else {
            toast({ title: "Erro", description: "Falha ao excluir." });
        }
    };

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-card text-card-foreground shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <Label>{label}</Label>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadMode(!uploadMode)}
                    className="text-xs"
                >
                    {uploadMode ? 'Cancelar' : <><Plus className="w-3 h-3 mr-1" /> Adicionar Novo</>}
                </Button>
            </div>

            {uploadMode && (
                <div className="p-4 rounded-lg border bg-muted/50 space-y-4 mb-4">
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Nome do Som</Label>
                        <Input
                            value={newSoundName}
                            onChange={(e) => setNewSoundName(e.target.value)}
                            placeholder="Ex: Sirene Alerta"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Arquivo de Áudio (Máx 5MB)</Label>
                        <div className="flex gap-2">
                            <Input
                                type="file"
                                accept="audio/*"
                                onChange={handleFileUpload}
                                className="cursor-pointer file:cursor-pointer"
                            />
                        </div>
                    </div>
                    {newSoundFile && (
                        <div className="flex justify-end">
                            <Button onClick={handleSaveNewSound} disabled={isLoading || !newSoundName}>
                                {isLoading ? 'Salvando...' : 'Salvar na Biblioteca'}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {isLoading && sounds.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">Carregando biblioteca...</div>
                ) : sounds.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">Nenhum som salvo. Adicione um novo!</div>
                ) : (
                    sounds.map((sound) => (
                        <div
                            key={sound.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${value === sound.url
                                    ? 'bg-primary/10 border-primary/50 hover:bg-primary/20'
                                    : 'bg-background hover:bg-accent'
                                }`}
                            onClick={() => onSelect(sound.url)}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlay(sound.url, sound.id);
                                    }}
                                >
                                    {isPlaying === sound.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                </Button>
                                <div className="min-w-0">
                                    <p className={`text-sm font-medium truncate ${value === sound.url ? 'text-primary' : 'text-foreground'}`}>
                                        {sound.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {new Date(sound.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {value === sound.url && (
                                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center">
                                        Selecionado
                                    </span>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => handleDelete(sound.id, e)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
