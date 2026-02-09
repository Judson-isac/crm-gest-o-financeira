'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Filter, X, Loader2 } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';

type RankingFilterControlsProps = {
    distinctValues: { polos: string[]; anos: number[]; processos?: any[] };
};

export function RankingFilterControls({ distinctValues }: RankingFilterControlsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const [polos, setPolos] = useState<string[]>(searchParams.get('polo')?.split(',') || []);
    const [processo, setProcesso] = useState(searchParams.get('processo') || 'all');

    // Sync state with URL if URL changes externally (e.g. back button)
    useEffect(() => {
        setPolos(searchParams.get('polo')?.split(',') || []);
        setProcesso(searchParams.get('processo') || 'all');
    }, [searchParams]);

    const handleFilterClick = () => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());

            if (polos.length > 0) {
                params.set('polo', polos.join(','));
            } else {
                params.delete('polo');
            }

            if (processo && processo !== 'all') {
                params.set('processo', processo);
            } else {
                params.delete('processo');
            }

            router.replace(`${pathname}?${params.toString()}`);
        });
    };

    const handleClearClick = () => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('polo');
            params.delete('processo');
            router.replace(`${pathname}?${params.toString()}`);

            setPolos([]);
            setProcesso('all');
        });
    };

    const polosSafe = distinctValues?.polos || [];
    const processosSafe = distinctValues?.processos || [];
    const poloOptions = polosSafe.map(p => ({ label: p, value: p }));

    return (
        <div className="flex flex-col gap-5 p-1">
            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Polo
                        </label>
                        {polos.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    </div>
                    <MultiSelect
                        options={poloOptions}
                        onValueChange={setPolos}
                        defaultValue={polos}
                        placeholder="Todos os Polos"
                        className={cn(
                            "w-full bg-slate-900/50 border-slate-800 text-slate-200 transition-all",
                            polos.length > 0 && "border-blue-500/50 bg-blue-500/5"
                        )}
                        popoverContentClassName="z-[75]"
                        disabled={isPending}
                    />
                </div>

                {processosSafe.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Processo Seletivo
                            </label>
                            {processo !== 'all' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                        </div>
                        <Select value={processo} onValueChange={setProcesso} disabled={isPending}>
                            <SelectTrigger className={cn(
                                "bg-slate-900/50 border-slate-800 text-slate-200 transition-all",
                                processo !== 'all' && "border-blue-500/50 bg-blue-500/5"
                            )}>
                                <SelectValue placeholder="Todos os Processos" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 z-[70]">
                                <SelectItem value="all">Todos os Processos</SelectItem>
                                {processosSafe.map(p => (
                                    <SelectItem key={p.id || p} value={p.id || p}>
                                        {p.nome ? p.nome : (p.numero && p.ano ? `${p.numero}/${p.ano}` : (p.numero || p))}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800/50">
                <Button
                    onClick={handleClearClick}
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    className="flex-1 bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                    Limpar
                </Button>
                <Button
                    onClick={handleFilterClick}
                    size="sm"
                    disabled={isPending}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                    {isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
                    Aplicar
                </Button>
            </div>
        </div>
    );
}
