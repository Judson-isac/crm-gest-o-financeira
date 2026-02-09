'use server';

import * as db from '@/lib/db';
import { Spacepoint, Matricula, ProcessoSeletivo } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/api';

export type SpacepointStats = {
    product: string; // 'EAD', 'HIBRIDO', 'POS', 'PROF', 'TEC', 'TOTAL'
    realized: number;
    target: number;
    gap: number;
    percentage: number;
    spaceTargets: number[]; // Targets for Space 1, Space 2, ...
};

export type SpacepointDashboardData = {
    currentSpaceIndex: number; // 0-based index of the space we are chasing (or just passed?) -> usually next space
    nextSpaceDate: Date | null;
    daysRemaining: number | null;
    dailyTarget: number; // How many per day to reach target?
    stats: SpacepointStats[];
    spaces: Spacepoint[];
};

export async function getSpacepointStatsAction(processoSeletivoId: string, polo?: string): Promise<SpacepointDashboardData | null> {
    const user = await getAuthenticatedUser();
    if (!user || !user.redeId) return null;

    // 1. Get Spacepoints
    const spacepoints = await db.getSpacepoints(user.redeId);
    const processSpacepoints = spacepoints
        .filter(sp => sp.processoSeletivo === processoSeletivoId)
        .sort((a, b) => a.numeroSpace - b.numeroSpace);

    console.log('Found spacepoints:', processSpacepoints.length);

    if (processSpacepoints.length === 0) return null;

    // 2. Determine Current/Next Space
    const today = new Date();
    // Find the first space that is in the future (or today)
    let nextSpaceIndex = processSpacepoints.findIndex(sp => new Date(sp.dataSpace) >= today);
    // If all are in past, maybe use the last one? Or special state?
    if (nextSpaceIndex === -1) nextSpaceIndex = processSpacepoints.length - 1;

    const nextSpace = processSpacepoints[nextSpaceIndex];
    if (!nextSpace) return null; // Handle case where no spaces exist

    const nextSpaceDate = new Date(nextSpace.dataSpace);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.ceil((nextSpaceDate.getTime() - today.getTime()) / msPerDay);

    // 3. Get Matriculas
    // We need to count matriculas for this Processo Seletivo
    // Filter by Polo if provided
    const matriculas = await db.getMatriculas(user.redeId); // optimizing: this gets ALL matriculas. Should filter in DB.
    // Ideally db.getMatriculasByProcesso(processoId, polo)... but reusing getMatriculas for now and filtering in memory or adding params to db function.
    // Given the previous pattern, I'll filter in memory or update db.ts later if performance issue.

    const relevantMatriculas = matriculas.filter(m =>
        m.processoSeletivoId === processoSeletivoId &&
        (!polo || m.polo === polo || polo === 'Todos')
    );

    // 4. Group by Product Type
    // Categories: EAD, HIBRIDO, POS, PROF, TEC
    // Mapping from Matricula 'tipoCursoId' or 'cursoSigla' or 'tipo'?
    // Matricula has 'cursoSigla'. We need to know the Type of the course.
    // We might need to fetch Cursos or Types to map.
    // Or check `tipoCursoId`?
    // Matricula has `tipoCursoId`.
    const tiposCurso = await db.getTiposCurso(user.redeId);
    const typeMap = new Map(tiposCurso.map(t => [t.id, t.nome.toUpperCase()]));

    const counts: Record<string, number> = {
        TOTAL: 0
    };

    const normalizeType = (name: string): string | null => {
        // The typeMap values are already our "Keys" (UpperCase Names)
        // So we can just return the name if it's in the map values, or if we passed the mapped name.
        // Actually, typeMap.get(id) returns the Name.
        return name || null;
    };

    relevantMatriculas.forEach(m => {
        const typeName = m.tipoCursoId ? typeMap.get(m.tipoCursoId) : '';
        const key = normalizeType(typeName || '');
        if (key) {
            if (!counts[key]) counts[key] = 0;
            counts[key]++;
            counts.TOTAL++;
        }
    });

    // 5. Build Stats
    // 5. Build Stats
    const stats: SpacepointStats[] = [];

    // Get all unique product keys from:
    // 1. typeMap (all available course types)
    // 2. keys in nextSpace.metasPorTipo (in case there are historical ones)

    const allProductKeys = new Set<string>();

    // Add from typeMap (the standard types)
    typeMap.forEach(name => allProductKeys.add(name));

    // Add TOTAL
    allProductKeys.add('TOTAL');

    let totalGap = 0;

    Array.from(allProductKeys).sort().forEach(prod => {
        // Skip if it's not a relevant product? 
        // For now show all types found in system + Total.
        if (prod !== 'TOTAL' && !prod) return;

        const realized = counts[prod] || 0;

        // Target lookup:
        // Key in metasPorTipo is Uppercase Name.
        let target = 0;

        if (prod === 'TOTAL') {
            // For total, we can sum specific targets or use the metaTotal field
            target = nextSpace.metaTotal || 0;
        } else {
            target = nextSpace.metasPorTipo?.[prod] || 0;
        }

        const gap = realized - target;
        const percentage = target > 0 ? (realized / target) * 100 : (realized > 0 ? 100 : 0);

        if (prod === 'TOTAL') totalGap = gap;

        // Space targets array for history
        const spaceTargets = processSpacepoints.map(sp => {
            if (prod === 'TOTAL') return sp.metaTotal || 0;
            return sp.metasPorTipo?.[prod] || 0;
        });

        stats.push({
            product: prod,
            realized,
            target,
            gap,
            percentage,
            spaceTargets
        });
    });

    // Move TOTAL to bottom
    const totalStat = stats.find(s => s.product === 'TOTAL');
    const otherStats = stats.filter(s => s.product !== 'TOTAL');

    if (totalStat) otherStats.push(totalStat);


    // Calculate Daily Target (Meta Dia)
    // To close the gap within daysRemaining
    // If gap is negative (behind), we need to cover the gap.
    // Daily Target = Abs(Gap) / Days.
    const dailyTarget = totalGap < 0 && daysRemaining > 0 ? Math.abs(totalGap) / daysRemaining : 0;

    return {
        currentSpaceIndex: nextSpaceIndex,
        nextSpaceDate: nextSpaceDate,
        daysRemaining,
        dailyTarget,
        stats,
        spaces: processSpacepoints
    };
}
