'use server';

import * as db from '@/lib/db';
import { Filters, Matricula, Polo, Usuario, Canal, TipoCurso } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/api';
import { isSameDay, startOfMonth, subMonths, endOfMonth, eachDayOfInterval, format, isWithinInterval } from 'date-fns';
import { getWorkingDaysBetween, isWorkDay } from '@/lib/utils';

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
    activeSpace?: {
        name: string;
        date: string;
        target: number;
        requiredPace: number;
        currentPace: number;
        daysRemaining: number;
        status: 'success' | 'warning' | 'danger';
    };
};

export async function getEnrollmentDashboardMetricsAction(filters: Filters): Promise<EnrollmentDashboardMetrics | null> {
    const user = await getAuthenticatedUser();
    if (!user || !user.redeId) return null;

    const redeId = user.redeId;

    // 1. Fetch data
    const [matriculas, allUsers, channels, spacepoints] = await Promise.all([
        db.getMatriculas(redeId),
        db.getAllUsuarios(redeId),
        db.getCanais(redeId),
        db.getSpacepoints(redeId)
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
    let pace: PaceDataPoint[] = [];
    let interval: { start: Date, end: Date } | null = null;
    let activeSpaceInfo: any = null;

    // Resolve Interval and Spacepoints
    let relevantSpaces: any[] = [];
    if (filters.processo && filters.processo !== 'all') {
        const processos = await db.getDistinctProcessos(redeId);
        const selected = processos.find(p => p.id === filters.processo || p.numero === filters.processo);
        if (selected) {
            interval = { start: new Date(selected.dataInicial), end: new Date(selected.dataFinal) };
            // FIX: Use ONLY the ID if available, or ONLY the numero. Usually spacepoints table stores the ID (string)
            // but older records might use numero. Let's be precise.
            relevantSpaces = spacepoints.filter(sp => sp.processoSeletivo === selected.id);
            if (relevantSpaces.length === 0) {
                relevantSpaces = spacepoints.filter(sp => sp.processoSeletivo === selected.numero);
            }
        }
    } else if (filters.mes && filters.ano) {
        const startDate = startOfMonth(new Date(filters.ano, filters.mes - 1));
        const endDate = endOfMonth(startDate);
        interval = { start: startDate, end: endDate };
        relevantSpaces = spacepoints.filter(sp => {
            const spDate = new Date(sp.dataSpace);
            return spDate.getMonth() + 1 === filters.mes && spDate.getFullYear() === filters.ano;
        });
    }

    if (interval) {
        // Unified Spacepoint Logic (Matching Attainment Widget)
        let milestones: { date: Date, meta: number }[] = [];
        if (filters.polo && filters.polo !== 'all') {
            const poloFilterArray = Array.isArray(filters.polo) ? filters.polo : [filters.polo];
            const poloSpaces = relevantSpaces.filter(sp => sp.polo && poloFilterArray.includes(sp.polo));

            const grouped: Record<string, { date: Date, meta: number }> = poloSpaces.reduce((acc, sp) => {
                const dayKey = format(new Date(sp.dataSpace), 'yyyy-MM-dd');
                if (!acc[dayKey]) acc[dayKey] = { date: new Date(sp.dataSpace), meta: 0 };
                acc[dayKey].meta += (sp.metaTotal || 0);
                return acc;
            }, {} as Record<string, { date: Date, meta: number }>);
            milestones = Object.values(grouped).sort((a: { date: Date }, b: { date: Date }) => a.date.getTime() - b.date.getTime());
        } else {
            // "Todos" view: Always sum Polo-specific goals (Ignore records with polo=null)
            const spaceNumbers = Array.from(new Set(relevantSpaces.map(sp => sp.numeroSpace))).sort((a, b) => a - b);

            // CARRY FORWARD LOGIC: If a polo is missing a later milestone, use its last known cumulative goal.
            const poloNames = Array.from(new Set(relevantSpaces.filter(sp => !!sp.polo).map(sp => sp.polo!)));
            const lastPoloMetas: Record<string, number> = {};

            milestones = spaceNumbers.map(num => {
                const spacesForNum = relevantSpaces.filter(sp => sp.numeroSpace === num && !!sp.polo);

                // Update last known meta for polos found in this milestone
                spacesForNum.forEach(sp => {
                    if (sp.polo) lastPoloMetas[sp.polo] = sp.metaTotal || 0;
                });

                // Sum all active polos for this process
                const metaSums = poloNames.reduce((acc, p) => acc + (lastPoloMetas[p] || 0), 0);

                // Get date from any record of this milestone (or global fallback)
                const refSpace = spacesForNum[0] || relevantSpaces.find(sp => sp.numeroSpace === num);
                if (!refSpace) return null;

                return {
                    date: new Date(refSpace.dataSpace),
                    meta: metaSums
                };
            }).filter(m => m !== null) as { date: Date, meta: number }[];
            milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
        }

        const days = eachDayOfInterval({ start: interval.start, end: interval.end });
        const today = new Date();
        let cumulative = 0;

        // Calculate current pace (avg per day since start or since today - X)
        const daysElapsedSinceStart = Math.max(1, Math.round((today.getTime() - interval.start.getTime()) / (1000 * 60 * 60 * 24)));
        const realizedUntilToday = filteredMatriculas.filter(m => new Date(m.dataMatricula) <= today).length;
        const currentDailyPace = realizedUntilToday / daysElapsedSinceStart;

        // Calculate Active Spacepoint and Required Pace
        const nextMilestone = milestones.find(m => m.date >= today);

        if (nextMilestone) {
            // Calculate working days (excluding Sundays) using utility
            const daysLeftCorrected = getWorkingDaysBetween(today, nextMilestone.date);

            const gap = nextMilestone.meta - realizedUntilToday;
            const requiredPace = daysLeftCorrected > 0 ? gap / daysLeftCorrected : 0;
            const status = currentDailyPace >= requiredPace ? 'success' : (currentDailyPace >= requiredPace * 0.8 ? 'warning' : 'danger');

            activeSpaceInfo = {
                name: `Space ${milestones.indexOf(nextMilestone) + 1}`,
                date: format(nextMilestone.date, 'dd/MM'),
                target: nextMilestone.meta,
                requiredPace,
                currentPace: currentDailyPace,
                daysRemaining: daysLeftCorrected,
                status
            };
        }

        pace = days.map(day => {
            const dDate = new Date(day);
            const dayCount = filteredMatriculas.filter(m => isSameDay(new Date(m.dataMatricula), dDate)).length;
            cumulative += dayCount;

            // Meta Calculation (Segmented)
            let dailyMeta = 0;
            const targetM = milestones.find(m => m.date >= dDate);
            const prevM = [...milestones].reverse().find(m => m.date < dDate);

            const startVal = prevM ? prevM.meta : 0;
            const startDate = prevM ? prevM.date : interval!.start;
            const endVal = targetM ? targetM.meta : (milestones.length > 0 ? milestones[milestones.length - 1].meta : 0);
            const endDate = targetM ? targetM.date : interval!.end;

            if (endDate > startDate) {
                const totalWorkDays = getWorkingDaysBetween(startDate, endDate);
                if (isWorkDay(dDate)) {
                    const workDaysElap = getWorkingDaysBetween(startDate, dDate);
                    dailyMeta = startVal + (endVal - startVal) * (workDaysElap / totalWorkDays);
                } else {
                    // Weekend: Flat line from last working day
                    const lastWorkDay = new Date(dDate);
                    lastWorkDay.setDate(lastWorkDay.getDate() - 1); // Only excluding Sunday, so Sat is the last workday
                    const workDaysElap = getWorkingDaysBetween(startDate, lastWorkDay);
                    dailyMeta = startVal + (endVal - startVal) * (workDaysElap / totalWorkDays);
                }
            } else {
                dailyMeta = endVal;
            }

            // Projection (if current pace continues)
            const daysFromStart = Math.max(0, Math.round((dDate.getTime() - interval!.start.getTime()) / (1000 * 60 * 60 * 24)));
            const projected = currentDailyPace * daysFromStart;

            return {
                date: format(dDate, 'dd/MM'),
                atual: dDate <= today ? cumulative : undefined as any,
                meta: Math.round(dailyMeta),
                projected: Math.round(projected)
            };
        });
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
        leaderboard,
        activeSpace: activeSpaceInfo
    };
}
