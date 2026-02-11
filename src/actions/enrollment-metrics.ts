'use server';

import * as db from '@/lib/db';
import { Filters, Matricula, Polo, Usuario, Canal, TipoCurso } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/api';
import { isSameDay, startOfMonth, subMonths, endOfMonth, eachDayOfInterval, format, isWithinInterval } from 'date-fns';

export type PaceDataPoint = {
    date: string;
    atual: number;
    meta?: number;
    anterior?: number;
};

export type PoloMetric = {
    name: string;
    total: number;
    meta?: number;
};

export type ChannelMetric = {
    name: string;
    value: number;
};

export type LeaderboardMetric = {
    name: string;
    avatar?: string;
    total: number;
};

export type EnrollmentDashboardMetrics = {
    pace: PaceDataPoint[];
    polos: PoloMetric[];
    channels: ChannelMetric[];
    leaderboard: LeaderboardMetric[];
};

export async function getEnrollmentDashboardMetricsAction(filters: Filters): Promise<EnrollmentDashboardMetrics | null> {
    const user = await getAuthenticatedUser();
    if (!user || !user.redeId) return null;

    const redeId = user.redeId;

    // 1. Fetch data
    const [matriculas, allUsers, channels, spacepoints, tiposcuros] = await Promise.all([
        db.getMatriculas(redeId),
        db.getAllUsuarios(redeId),
        db.getCanais(redeId),
        db.getSpacepoints(redeId),
        db.getTiposCurso(redeId)
    ]);

    // 2. Filter matriculas based on global filters
    const filteredMatriculas = matriculas.filter(m => {
        const d = new Date(m.dataMatricula);
        const mes = d.getMonth() + 1;
        const ano = d.getFullYear();

        if (filters.ano && ano !== filters.ano) return false;
        if (filters.mes && mes !== filters.mes) return false;

        if (filters.polo && filters.polo !== 'all') {
            const poloFilterArray = Array.isArray(filters.polo) ? filters.polo : [filters.polo];
            if (!poloFilterArray.includes(m.polo)) return false;
        }

        if (filters.processo && filters.processo !== 'all') {
            if (m.processoSeletivoId !== filters.processo) return false;
        }

        return true;
    });

    // --- PACE CALCULATION ---
    // We'll show day-by-day accumulation if month is selected
    let pace: PaceDataPoint[] = [];
    if (filters.mes && filters.ano) {
        const startDate = startOfMonth(new Date(filters.ano, filters.mes - 1));
        const endDate = endOfMonth(startDate);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        let cumulative = 0;
        pace = days.map(day => {
            const dayCount = filteredMatriculas.filter(m => isSameDay(new Date(m.dataMatricula), day)).length;
            cumulative += dayCount;
            return {
                date: format(day, 'dd/MM'),
                atual: cumulative
            };
        });

        // Add "Ideal Pace" (Meta Linear) if possible
        // Let's find spacepoints for this month/process
        const monthSpaces = spacepoints.filter(sp => {
            const spDate = new Date(sp.dataSpace);
            return spDate.getMonth() + 1 === filters.mes && spDate.getFullYear() === filters.ano;
        });

        if (monthSpaces.length > 0) {
            const totalMeta = monthSpaces.reduce((acc, curr) => acc + (curr.metaTotal || 0), 0);
            const dailyMeta = totalMeta / days.length;
            let metaCumulative = 0;
            pace = pace.map((p, i) => {
                metaCumulative += dailyMeta;
                return { ...p, meta: Math.round(metaCumulative) };
            });
        }
    }

    // --- POLO PERFORMANCE ---
    const poloCounts: Record<string, number> = {};
    filteredMatriculas.forEach(m => {
        poloCounts[m.polo] = (poloCounts[m.polo] || 0) + 1;
    });

    const redeData = await db.getRedeById(redeId);
    const poloList = redeData?.polos || [];
    const polos: PoloMetric[] = poloList.map(p => ({
        name: p,
        total: poloCounts[p] || 0
    })).sort((a, b) => b.total - a.total);

    // --- CHANNELS ---
    const channelMap = new Map(channels.map(c => [c.id, c.nome]));
    const channelCounts: Record<string, number> = {};
    filteredMatriculas.forEach(m => {
        const name = m.canalId ? channelMap.get(m.canalId) : 'Direto/Outros';
        const key = name || 'Direto/Outros';
        channelCounts[key] = (channelCounts[key] || 0) + 1;
    });

    const channelsData: ChannelMetric[] = Object.entries(channelCounts).map(([name, value]) => ({
        name,
        value
    })).sort((a, b) => b.value - a.value);

    // --- LEADERBOARD ---
    const sellerCounts: Record<string, number> = {};
    filteredMatriculas.forEach(m => {
        if (m.usuarioId) {
            sellerCounts[m.usuarioId] = (sellerCounts[m.usuarioId] || 0) + 1;
        }
    });

    const leaderboard: LeaderboardMetric[] = allUsers
        .filter(u => sellerCounts[u.id] !== undefined)
        .map(u => ({
            name: u.nome,
            avatar: u.avatarUrl,
            total: sellerCounts[u.id]
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return {
        pace,
        polos,
        channels: channelsData,
        leaderboard
    };
}
