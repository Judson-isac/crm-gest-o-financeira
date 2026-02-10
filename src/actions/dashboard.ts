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
    spaceRealized: number[]; // Realized for Space 1, Space 2, ... (Historical)
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

    // Filter relevant spacepoints for the process
    const processSpacepointsRaw = spacepoints.filter(sp => sp.processoSeletivo === processoSeletivoId);

    let processSpacepoints: Spacepoint[] = [];

    if (polo && polo !== 'Todos') {
        // Specific polo requested
        processSpacepoints = processSpacepointsRaw
            .filter(sp => sp.polo === polo)
            .sort((a, b) => a.numeroSpace - b.numeroSpace);

        // Fallback to global if no specific goals for this polo
        if (processSpacepoints.length === 0) {
            processSpacepoints = processSpacepointsRaw
                .filter(sp => !sp.polo)
                .sort((a, b) => a.numeroSpace - b.numeroSpace);
        }
    } else {
        // "Todos" or no polo selected - Aggregate mode
        // Find all unique space numbers for this process
        const spaceNumbers = Array.from(new Set(processSpacepointsRaw.map(sp => sp.numeroSpace))).sort((a, b) => a - b);

        if (spaceNumbers.length > 0) {
            processSpacepoints = spaceNumbers.map(num => {
                const spacesForNum = processSpacepointsRaw.filter(sp => sp.numeroSpace === num);

                // If there are specific polo goals for this space number, we AGGREGATE them.
                // NOTE: If a polo DOES NOT have a goal for this space, it contributes 0.
                // We decide whether to include the "Global" (!sp.polo) goal in the sum 
                // ONLY if there are NO specific polo goals for that space. 
                // BUT usually "Global" is a separate configuration.
                // Best approach: If ANY polo has a goal, sum only polo goals. 
                // If NO polo has a goal, use the Global one if it exists.

                const poloSpaces = spacesForNum.filter(sp => !!sp.polo);
                const globalSpace = spacesForNum.find(sp => !sp.polo);

                if (poloSpaces.length > 0) {
                    // SUM POLO GOALS
                    const aggregatedMetas: Record<string, number> = {};
                    let aggregatedTotal = 0;

                    poloSpaces.forEach(ps => {
                        aggregatedTotal += ps.metaTotal || 0;
                        if (ps.metasPorTipo) {
                            Object.entries(ps.metasPorTipo).forEach(([type, val]) => {
                                aggregatedMetas[type] = (aggregatedMetas[type] || 0) + val;
                            });
                        }
                    });

                    return {
                        ...poloSpaces[0], // Copy metadata from first one
                        id: `agg-${num}`,
                        polo: undefined,
                        metaTotal: aggregatedTotal,
                        metasPorTipo: aggregatedMetas,
                        dataSpace: globalSpace?.dataSpace || poloSpaces[0].dataSpace // Prefer global date if available
                    } as Spacepoint;
                } else if (globalSpace) {
                    return globalSpace;
                }
                return null;
            }).filter(sp => sp !== null) as Spacepoint[];
        }
    }

    console.log('Processed spacepoints:', processSpacepoints.length);

    if (processSpacepoints.length === 0) return null;

    // 2. Determine Current/Next Space
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to midnight

    // Find the first space that is in the future (or today)
    let nextSpaceIndex = processSpacepoints.findIndex(sp => {
        const spDate = new Date(sp.dataSpace);
        spDate.setHours(0, 0, 0, 0); // Normalize space date to midnight
        return spDate >= today;
    });
    // If all are in past, maybe use the last one? Or special state?
    if (nextSpaceIndex === -1) nextSpaceIndex = processSpacepoints.length - 1;

    const nextSpace = processSpacepoints[nextSpaceIndex];
    if (!nextSpace) return null; // Handle case where no spaces exist

    const nextSpaceDate = new Date(nextSpace.dataSpace);

    // Calculate working days (excluding Sundays)
    let daysRemaining = 0;
    const tempDate = new Date(today);
    tempDate.setHours(0, 0, 0, 0); // Start from beginning of today

    // If today is Sunday, start counting from tomorrow? 
    // Or just iterate. The user said "nobody works sunday". 
    // Assumption: Sales happen on Saturdays but not Sundays.

    const targetDate = new Date(nextSpaceDate);
    targetDate.setHours(0, 0, 0, 0);

    while (tempDate < targetDate) {
        // Increment date first or check first?
        // If today is Monday and target is Tuesday, diff is 1 day.
        // We want the number of working days *available* to hit the target.
        // If today (Mon) is already "spent" or assuming we have today?
        // Usually "days remaining" includes today if the day is not over, or starts from tomorrow.
        // Let's assume we count days forward.

        tempDate.setDate(tempDate.getDate() + 1);
        if (tempDate.getDay() !== 0) { // 0 is Sunday
            daysRemaining++;
        }
    }

    // Edge case: if today is the target day or passed, daysRemaining = 0.
    if (daysRemaining < 0) daysRemaining = 0;

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
    const stats: SpacepointStats[] = [];

    // Get all unique product keys
    const allProductKeys = new Set<string>();
    typeMap.forEach(name => allProductKeys.add(name));
    allProductKeys.add('TOTAL');

    let totalGap = 0;

    Array.from(allProductKeys).sort().forEach(prod => {
        if (prod !== 'TOTAL' && !prod) return;

        // Current Realized (Total for this Processo)
        const realized = counts[prod] || 0;

        // Next Space Target
        let target = 0;
        if (prod === 'TOTAL') {
            target = nextSpace.metaTotal || 0;
        } else {
            target = nextSpace.metasPorTipo?.[prod] || 0;
        }

        const gap = realized - target;
        const percentage = target > 0 ? (realized / target) * 100 : (realized > 0 ? 100 : 0);

        if (prod === 'TOTAL') totalGap = gap;

        // Calculate Targets AND Realized for EACH Space (History)
        const spaceTargets = processSpacepoints.map(sp => {
            if (prod === 'TOTAL') return sp.metaTotal || 0;
            return sp.metasPorTipo?.[prod] || 0;
        });

        const spaceRealized = processSpacepoints.map(sp => {
            // Count matriculas created BEFORE or ON the space date
            // We need to filter relevantMatriculas based on sp.dataSpace
            // Note: This is an O(N*M) operation in loop, but N (matriculas) and M (spaces) are likely small enough here.

            const spDate = new Date(sp.dataSpace);
            spDate.setHours(23, 59, 59, 999); // End of the space date

            // Filter relevant matriculas
            // We need to count based on the specific product 'prod'

            let count = 0;
            relevantMatriculas.forEach(m => {
                // Check Product Match
                const typeName = m.tipoCursoId ? typeMap.get(m.tipoCursoId) : '';
                const key = normalizeType(typeName || '');

                const isMatch = (prod === 'TOTAL') || (key === prod);

                if (isMatch) {
                    // Check Date Match
                    const mDate = new Date(m.dataMatricula || m.criadoEm || new Date());
                    if (mDate <= spDate) {
                        count++;
                    }
                }
            });
            return count;
        });

        stats.push({
            product: prod,
            realized,
            target,
            gap,
            percentage,
            spaceTargets,
            spaceRealized // New field
        } as SpacepointStats);
    });

    // Move TOTAL to bottom
    const totalStat = stats.find(s => s.product === 'TOTAL');
    const otherStats = stats.filter(s => s.product !== 'TOTAL');

    if (totalStat) otherStats.push(totalStat);


    // Calculate Daily Target (Meta Dia)
    const dailyTarget = totalGap < 0 && daysRemaining > 0 ? Math.abs(totalGap) / daysRemaining : 0;

    return {
        currentSpaceIndex: nextSpaceIndex,
        nextSpaceDate: nextSpaceDate,
        daysRemaining,
        dailyTarget,
        stats: otherStats,
        spaces: processSpacepoints
    };
}

export type SpacepointCompositionData = {
    spaceNumber: number;
    totalTarget: number;
    totalRealized: number;
    polos: {
        name: string;
        target: number;
        realized: number;
        percentage: number;
    }[];
};

export async function getSpacepointCompositionAction(processoSeletivoId: string): Promise<SpacepointCompositionData | null> {
    const user = await getAuthenticatedUser();
    if (!user || !user.redeId) return null;

    const spacepoints = await db.getSpacepoints(user.redeId);
    const processSpacepoints = spacepoints.filter(sp => sp.processoSeletivo === processoSeletivoId);
    if (processSpacepoints.length === 0) return null;

    // 1. Find Current Space
    const now = new Date();
    const sortedSpaces = Array.from(new Set(processSpacepoints.map(sp => sp.numeroSpace))).sort((a, b) => a - b);

    // Find shared dates for each space number
    const dateMap: Record<number, Date> = {};
    processSpacepoints.forEach(sp => {
        if (!dateMap[sp.numeroSpace]) dateMap[sp.numeroSpace] = new Date(sp.dataSpace);
    });

    let currentSpaceNum = sortedSpaces[0];
    for (const num of sortedSpaces) {
        const d = dateMap[num];
        if (d && d >= now) {
            currentSpaceNum = num;
            break;
        }
        currentSpaceNum = num; // Fallback to last if all past
    }

    const currentSpaceDate = dateMap[currentSpaceNum];
    const spDate = new Date(currentSpaceDate);
    spDate.setHours(23, 59, 59, 999);

    // 2. Get Matriculas
    const matriculas = await db.getMatriculas(user.redeId);
    const relevantMatriculas = matriculas.filter(m => m.processoSeletivoId === processoSeletivoId);

    // 3. Calculate for each Polo
    const rede = await db.getRedeById(user.redeId);
    const poloList = rede?.polos || [];

    // Include 'GLOBAL' logic? Usually Global is just the sum. 
    // But the user has entries for GLOBAL in the DB.
    // Let's stick to Polo list from Rede + Global if records exist.
    const uniquePolosInDb = Array.from(new Set(processSpacepoints.map(sp => sp.polo).filter(Boolean))) as string[];
    const allPolos = Array.from(new Set([...poloList, ...uniquePolosInDb]));

    const poloResults = allPolos.map(poloName => {
        const poloSp = processSpacepoints.find(sp => sp.polo === poloName && sp.numeroSpace === currentSpaceNum);
        const target = poloSp?.metaTotal || 0;

        const realized = relevantMatriculas.filter(m => {
            const mDate = new Date(m.dataMatricula || m.criadoEm || new Date());
            return m.polo === poloName && mDate <= spDate;
        }).length;

        return {
            name: poloName,
            target,
            realized,
            percentage: target > 0 ? (realized / target) * 100 : (realized > 0 ? 100 : 0)
        };
    }).sort((a, b) => b.realized - a.realized);

    const totalTarget = poloResults.reduce((acc, curr) => acc + curr.target, 0);
    const totalRealized = poloResults.reduce((acc, curr) => acc + curr.realized, 0);

    return {
        spaceNumber: currentSpaceNum,
        totalTarget,
        totalRealized,
        polos: poloResults
    };
}
