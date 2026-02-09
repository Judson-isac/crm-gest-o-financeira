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
        <div className="w-full max-w-4xl mb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                <MultiSelect
                    options={poloOptions}
                    onValueChange={setPolos}
                    defaultValue={polos}
                    placeholder="Todos os Polos"
                    className="w-full bg-slate-800 border-slate-700 text-slate-200"
                    disabled={isPending}
                />

                {processosSafe.length > 0 && (
                    <Select value={processo} onValueChange={setProcesso} disabled={isPending}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                            <SelectValue placeholder="Todos os Processos" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                            <SelectItem value="all">Todos os Processos</SelectItem>
                            {processosSafe.map(p => (
                                <SelectItem key={p.id || p} value={p.id || p}>
                                    {p.nome ? p.nome : (p.numero && p.ano ? `${p.numero}/${p.ano}` : (p.numero || p))}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                    <Button onClick={handleFilterClick} disabled={isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                        {isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
                        {isPending ? "..." : "Filtrar"}
                    </Button>
                    <Button onClick={handleClearClick} variant="outline" disabled={isPending} className="bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
