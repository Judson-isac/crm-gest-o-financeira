
'use server';
import type { FinancialRecord, Polo, Categoria, Tipo, Filters, SummaryData, ImportInfo, LucratividadeData, Curso, LucratividadePorMetodologiaData, Despesa, LucratividadePorCursoData, Campanha, Canal, ProcessoSeletivo, NumeroProcessoSeletivo, Meta, Spacepoint, TipoCurso, Usuario, Funcao, Permissoes, UserPermissions } from './types';
import * as db from './db';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser as getAuthUser, getAuthenticatedUserPermissions as getAuthPerms } from './auth';

// ==========================================================================
// CONTEXTO DE API E AUTENTICAÇÃO
// ==========================================================================

export const getAuthenticatedUser = getAuthUser;
export const getAuthenticatedUserPermissions = getAuthPerms;

async function getApiContext() {
    const user = await getAuthUser();
    const isSuperAdmin = user?.isSuperadmin ?? false;
    const sessionRedeId = user?.redeId;
    return { user, isSuperAdmin, sessionRedeId };
}

// ==========================================================================
// LÓGICA DE DADOS FINANCEIROS (Segregação por Polos)
// ==========================================================================

export async function getFinancialRecords(filters: Filters, page = 1, pageSize = 10): Promise<{ records: FinancialRecord[], totalPages: number, totalCount: number }> {
    const permissions = await getAuthPerms();
    const { records, totalCount } = await db.getFinancialRecords(permissions, filters, page, pageSize);
    const totalPages = Math.ceil(totalCount / pageSize);
    return { records, totalPages, totalCount };
}


export async function getSummaryData(filters: Filters): Promise<SummaryData> {
    const permissions = await getAuthPerms();
    const summaryData = await db.getSummaryData(permissions, filters);

    // A lógica de crescimento mensal permanece, mas agora usa os filtros corretos.
    const previousPeriodFilters = getPreviousPeriodFilters(filters);
    let monthlyGrowth: number | undefined = undefined;

    if (previousPeriodFilters) {
        const previousSummary = await db.getSummaryData(permissions, previousPeriodFilters);
        const previousTotalReceita = previousSummary.totalReceita;
        const currentTotalReceita = summaryData.totalReceita;

        if (previousTotalReceita > 0) {
            monthlyGrowth = ((currentTotalReceita - previousTotalReceita) / previousTotalReceita) * 100;
        } else if (currentTotalReceita > 0) {
            monthlyGrowth = 100; // Growth from 0 to a positive number
        }
    }

    return { ...summaryData, monthlyGrowth };
}

// This helper function remains local to api.ts
function getPreviousPeriodFilters(filters: Filters): Filters | null {
    if (!filters) return null;
    const { ano, mes } = filters;

    if (mes && ano) {
        if (mes > 1) {
            return { ...filters, mes: mes - 1 };
        } else { // mes is 1 (January)
            return { ...filters, mes: 12, ano: ano - 1 };
        }
    }

    return null;
}


export async function getDistinctValues(forceAll: boolean = false): Promise<{
    polos: string[],
    cidades: string[],
    estados: string[],
    categorias: string[],
    anos: number[]
}> {
    const permissions = await getAuthPerms();

    if (forceAll && permissions.isSuperadmin) {
        // Create a permission object that allows all
        const allAccessPermissions = { ...permissions, redeId: null, polos: null };
        return db.getDistinctValues(allAccessPermissions);
    }
    return db.getDistinctValues(permissions);
}

export async function getDespesas(filters: { polo?: string | string[], referencia_ano?: number, referencia_mes?: number }): Promise<Despesa[]> {
    const permissions = await getAuthPerms();

    let effectivePoloFilter: string[] | undefined = Array.isArray(filters.polo) ? filters.polo : (filters.polo ? [filters.polo] : undefined);

    if (permissions.polos !== null) {
        if (effectivePoloFilter && effectivePoloFilter.length > 0) {
            effectivePoloFilter = effectivePoloFilter.filter(p => permissions.polos!.includes(p));
        } else {
            effectivePoloFilter = permissions.polos;
        }
    }

    return db.getDespesas({ ...filters, polo: effectivePoloFilter, redeId: permissions.redeId || undefined });
}

export async function getImports(): Promise<ImportInfo[]> {
    const permissions = await getAuthPerms();
    return db.getImports(permissions);
}


// ==========================================================================
// REGRAS DE CADASTRO (Segregação por RedeId)
// ==========================================================================

async function getRedeContext(): Promise<{ isSuperAdmin: boolean, sessionRedeId: string | null }> {
    const user = await getAuthUser();
    return {
        isSuperAdmin: user?.isSuperadmin ?? false,
        sessionRedeId: user?.redeId || null
    };
}

export async function getRedes(): Promise<Rede[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    const allRedes = await db.getRedes();
    if (isSuperAdmin) return allRedes;
    if (sessionRedeId) {
        const userRede = allRedes.find(r => r.id === sessionRedeId);
        return userRede ? [userRede] : [];
    }
    return [];
}

export async function getCanais(redeId?: string): Promise<(Canal & { rede: string })[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    if (isSuperAdmin) return db.getCanais(redeId);
    if (!sessionRedeId) return [];
    return db.getCanais(sessionRedeId);
}

export async function getCampanhas(redeId?: string): Promise<(Campanha & { rede: string })[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    if (isSuperAdmin) return db.getCampanhas(redeId);
    if (!sessionRedeId) return [];
    return db.getCampanhas(sessionRedeId);
}

export async function getProcessosSeletivos(redeId?: string): Promise<(ProcessoSeletivo & { rede: string })[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    if (isSuperAdmin) return db.getProcessosSeletivos(redeId);
    if (!sessionRedeId) return [];
    return db.getProcessosSeletivos(sessionRedeId);
}

export async function getFuncoes(redeId?: string): Promise<Funcao[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    if (isSuperAdmin) return db.getFuncoes(redeId);
    if (!sessionRedeId) return [];
    return db.getFuncoes(sessionRedeId);
}

export async function getUsuarios(redeId?: string): Promise<Omit<Usuario, 'senha'>[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    if (isSuperAdmin) return db.getAllUsuarios(redeId, false);
    if (!sessionRedeId) return [];
    return db.getAllUsuarios(sessionRedeId, true); // Exclude superadmins for regular users
}

export async function getNumerosProcessoSeletivo(redeId?: string): Promise<(NumeroProcessoSeletivo & { rede: string })[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    const targetRedeId = isSuperAdmin ? redeId : sessionRedeId;
    return db.getAllNumerosProcessoSeletivo(targetRedeId);
}

export async function getCursos(): Promise<Curso[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    if (isSuperAdmin) return db.getCursos(); // Superadmin allows optional filtering if we wanted, but db.getCursos() without args returns all. 
    // Actually, superadmin might want to see all? Or filtered? Usually filtering is better. 
    // But for now let's keep it consistent: Superadmin sees all (or we should add a filter param).
    // The current signature doesn't accept params. 
    // If regular user, strict filtering.
    if (!sessionRedeId) return [];
    return db.getCursos(sessionRedeId);
}

export async function getMetas(): Promise<Meta[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    if (isSuperAdmin) return db.getMetas();
    if (!sessionRedeId) return [];
    return db.getMetas(sessionRedeId);
}

export async function getSpacepoints(): Promise<Spacepoint[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    if (isSuperAdmin) return db.getSpacepoints();
    if (!sessionRedeId) return [];
    return db.getSpacepoints(sessionRedeId);
}

export async function getTiposCurso(): Promise<TipoCurso[]> {
    const { isSuperAdmin, sessionRedeId } = await getRedeContext();
    if (isSuperAdmin) return db.getTiposCurso();
    if (!sessionRedeId) return [];
    return db.getTiposCurso(sessionRedeId);
}

// ==========================================================================
// --- DADOS ESPECÍFICOS DO DASHBOARD ---
// ==========================================================================

export async function getEvolucaoMensal(tipo: Tipo | 'Faturamento', filters: Filters) {
    const permissions = await getAuthPerms();
    const yearFilter = { referencia_ano: filters.ano || new Date().getFullYear() };
    const { mes, ...yearlyFilters } = filters;

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).replace('.', ''), value: 0 }));

    const { records: rawRecords } = await db.getFinancialRecords(permissions, { ...yearlyFilters, ...yearFilter }, 1, 99999);

    const records = rawRecords.map(r => ({
        ...r,
        valor_pago: Number(r.valor_pago) || 0
    }));

    records
        .forEach(record => {
            let value = 0;
            if (tipo === 'Faturamento') {
                value = record.valor_pago;
            } else if (record.tipo === tipo) {
                value = record.valor_pago;
            }

            if (value !== 0 && record.referencia_mes > 0 && record.referencia_mes <= 12) {
                monthlyData[record.referencia_mes - 1].value += value;
            }
        });

    return monthlyData;
}

export async function getDashboardData(filters: Filters) {
    const permissions = await getAuthPerms();
    const yearForEvolucao = filters.ano || new Date().getFullYear();
    const yearlyFilters = { ...filters, ano: yearForEvolucao, mes: undefined };

    // 1. Fetch all raw data in parallel
    const [
        { records: rawAllRecords },
        { records: rawYearlyRecords },
        rawDespesas,
        rawCursos,
        distinctValues,
    ] = await Promise.all([
        db.getFinancialRecords(permissions, filters, 1, 99999),
        db.getFinancialRecords(permissions, yearlyFilters, 1, 99999),
        getDespesas({ referencia_ano: filters.ano, referencia_mes: filters.mes, polo: filters.polo }),
        getCursos(),
        getDistinctValues(),
    ]);

    // 2. Sanitize all fetched records immediately
    const allRecords = rawAllRecords.map(r => ({ ...r, valor_pago: Number(r.valor_pago) || 0, valor_repasse: Number(r.valor_repasse) || 0 }));
    const yearlyRecords = rawYearlyRecords.map(r => ({ ...r, valor_pago: Number(r.valor_pago) || 0, valor_repasse: Number(r.valor_repasse) || 0 }));
    const despesas = rawDespesas.map(d => ({ ...d, valor: Number(d.valor) || 0 }));
    const cursos = rawCursos;


    // 3. Perform transformations with sanitized data
    const repassePorPolo = Object.entries(allRecords.reduce((acc, record) => {
        acc[record.polo] = (acc[record.polo] || 0) + record.valor_repasse;
        return acc;
    }, {} as Record<string, number>)).map(([polo, valor]) => ({ name: polo, value: valor }));

    const composicaoRepasse = Object.values(allRecords.reduce((acc, record) => {
        if (!acc[record.polo]) {
            acc[record.polo] = { polo: record.polo, Mensalidade: 0, Acordo: 0, Serviço: 0, Descontos: 0 };
        }
        if (acc[record.polo][record.tipo] !== undefined) {
            acc[record.polo][record.tipo] += record.valor_repasse;
        }
        return acc;
    }, {} as Record<string, any>));

    const calculateEvolucao = (tipo: Tipo | 'Faturamento') => {
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).replace('.', ''), value: 0 }));
        yearlyRecords.forEach(record => {
            let value = 0;
            if (tipo === 'Faturamento') value = record.valor_pago;
            else if (record.tipo === tipo) value = record.valor_pago;
            if (value !== 0 && record.referencia_mes > 0 && record.referencia_mes <= 12) {
                monthlyData[record.referencia_mes - 1].value += value;
            }
        });
        return monthlyData;
    }
    const mensalidadesEvolucao = calculateEvolucao("Mensalidade");
    const descontosEvolucao = calculateEvolucao("Descontos");
    const faturamentoEvolucao = calculateEvolucao("Faturamento");
    const acordosEvolucao = calculateEvolucao("Acordo");

    const polosForTable = filters.polo && Array.isArray(filters.polo) && filters.polo.length > 0 ? filters.polo : distinctValues.polos;
    const pivotData: Record<string, Record<number, number>> = {};
    polosForTable.forEach(polo => { pivotData[polo] = {}; });
    yearlyRecords.forEach(record => {
        if (!pivotData[record.polo]) pivotData[record.polo] = {};
        pivotData[record.polo][record.referencia_mes] = (pivotData[record.polo][record.referencia_mes] || 0) + record.valor_pago;
    });
    const monthNames = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).replace('.', ''));
    const tableData = Object.entries(pivotData).map(([polo, months]) => {
        const row: any = { polo };
        let total = 0;
        for (let i = 1; i <= 12; i++) {
            const monthValue = months[i] || 0;
            row[monthNames[i - 1]] = monthValue;
            total += monthValue;
        }
        row.total = total;
        return row;
    });
    const footer: { [key: string]: string | number } = { polo: 'Total' };
    let grandTotal = 0;
    for (let i = 1; i <= 12; i++) {
        const monthTotal = tableData.reduce((sum, row) => sum + (row[monthNames[i - 1]] || 0), 0);
        (footer as any)[monthNames[i - 1]] = monthTotal;
        grandTotal += monthTotal;
    }
    (footer as any).total = grandTotal;
    const receitaPorPolo = { data: tableData, footer, columns: ['polo', ...monthNames, 'total'] };

    const monthlyRecords = allRecords.filter(r => r.tipo === 'Mensalidade');
    const discountRecords = allRecords.filter(r => r.tipo === 'Descontos');
    const polosForTicket = filters.polo && Array.isArray(filters.polo) && filters.polo.length > 0 ? filters.polo : distinctValues.polos;
    const ticketMedioData = polosForTicket.map(polo => {
        const poloMonthlyRecords = monthlyRecords.filter(r => r.polo === polo);
        const poloDiscountRecords = discountRecords.filter(r => r.polo === polo);
        const ticket1Records = poloMonthlyRecords.filter(r => r.parcela === 1);
        const totalTicket1 = ticket1Records.reduce((sum, r) => sum + r.valor_pago, 0);
        const ticket1 = ticket1Records.length > 0 ? totalTicket1 / ticket1Records.length : 0;
        const ticket2Records = poloMonthlyRecords.filter(r => r.parcela === 2);
        const totalTicket2 = ticket2Records.reduce((sum, r) => sum + r.valor_pago, 0);
        const ticket2 = ticket2Records.length > 0 ? totalTicket2 / ticket2Records.length : 0;
        const totalDesconto = poloDiscountRecords.reduce((sum, r) => sum + r.valor_pago, 0);
        const count = poloDiscountRecords.length;
        const descMedio = count > 0 ? Math.abs(totalDesconto) / count : 0;
        return { polo, ticket1, ticket2, discount: descMedio };
    });

    const receitaPorCategoria = Object.entries(allRecords.reduce((acc, record) => {
        if (record.categoria !== 'Outras Receitas' || record.tipo !== 'Descontos') {
            acc[record.categoria] = (acc[record.categoria] || 0) + record.valor_pago;
        }
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const topPolos = Object.entries(allRecords.reduce((acc, record) => {
        acc[record.polo] = (acc[record.polo] || 0) + record.valor_pago;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    const dataByPolo: Record<string, { receita: number; repasse: number; despesa: number }> = {};
    allRecords.forEach(rec => {
        if (!dataByPolo[rec.polo]) dataByPolo[rec.polo] = { receita: 0, repasse: 0, despesa: 0 };
        dataByPolo[rec.polo].receita += rec.valor_pago;
        dataByPolo[rec.polo].repasse += rec.valor_repasse;
    });
    despesas.forEach(desp => {
        if (!dataByPolo[desp.polo]) dataByPolo[desp.polo] = { receita: 0, repasse: 0, despesa: 0 };
        dataByPolo[desp.polo].despesa += Number(desp.valor) || 0;
    });
    const lucratividadeData = Object.entries(dataByPolo).map(([polo, values]) => ({
        polo, ...values, lucro: values.repasse - values.despesa
    })).sort((a, b) => b.lucro - a.lucro);

    const cursosMap = new Map<string, Curso>();
    cursos.forEach(c => { cursosMap.set(c.sigla, c); });

    const topCursos = Object.values(allRecords.reduce((acc, rec) => {
        if (!rec.sigla_curso) return acc;
        const curso = cursosMap.get(rec.sigla_curso);
        if (!curso) return acc;
        if (!acc[curso.sigla]) acc[curso.sigla] = { name: curso.nome, value: 0 };
        acc[curso.sigla].value += rec.valor_pago;
        return acc;
    }, {} as Record<string, { name: string, value: number }>)).sort((a, b) => b.value - a.value).slice(0, 5);

    const topCursosPorPolo = Object.entries(allRecords.reduce((acc, rec) => {
        if (!rec.sigla_curso || !rec.polo) return acc;
        const curso = cursosMap.get(rec.sigla_curso);
        if (!curso) return acc;
        if (!acc[rec.polo]) acc[rec.polo] = {};
        if (!acc[rec.polo][curso.sigla]) acc[rec.polo][curso.sigla] = { name: curso.nome, value: 0 };
        acc[rec.polo][curso.sigla].value += rec.valor_pago;
        return acc;
    }, {} as Record<string, Record<string, { name: string, value: number }>>)).reduce((acc, [polo, cursos]) => {
        acc[polo] = Object.values(cursos).sort((a, b) => b.value - a.value).slice(0, 5);
        return acc;
    }, {} as Record<string, { name: string, value: number }[]>);


    // 3. Return the comprehensive data object
    return {
        repassePorPolo,
        composicaoRepasse,
        mensalidadesEvolucao,
        descontosEvolucao,
        faturamentoEvolucao,
        receitaPorPolo,
        ticketMedioData,
        acordosEvolucao,
        receitaPorCategoria,
        topPolos,
        lucratividadeData,
        lucratividadePorMetodologia: [], // Removido por falta de suporte no schema atual
        lucratividadePorCurso: [], // Removido por falta de suporte no schema atual
        topCursos,
        topCursosPorPolo
    };
}
export async function getDespesasDetalhadas(filters: { polo: string, ano: number, mes: number }): Promise<Despesa[]> {
    const mappedFilters = {
        polo: filters.polo,
        referencia_ano: filters.ano,
        referencia_mes: filters.mes
    };
    return getDespesas(mappedFilters);
}

export async function getMatriculas() {
    const user = await getAuthUser();
    if (!user || !user.redeId) return [];
    return db.getMatriculas(user.redeId);
}


export async function getMatriculaById(id: string) {
    const user = await getAuthUser();
    if (!user || !user.redeId) return null;
    return db.getMatriculaById(id, user.redeId);
}

export async function getDespesasAgrupadasPorPolo(filters: { ano: number; mes: number }) {
    const permissions = await getAuthPerms();
    if (!permissions.redeId) return [];
    return db.getDespesasAgrupadasPorPolo(permissions, filters);
}
