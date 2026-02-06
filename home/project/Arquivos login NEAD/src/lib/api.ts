'use server';
import type { FinancialRecord, Polo, Categoria, Tipo, Filters, SummaryData, ImportInfo, LucratividadeData, Curso, LucratividadePorMetodologiaData, Despesa } from './types';
import { db } from './db';
import { revalidatePath } from 'next/cache';

// This function now primarily acts as a pass-through to the database service,
// though it could be extended for more complex logic if needed.

export async function getFinancialRecords(
  filters: Filters,
  page = 1,
  pageSize = 10
): Promise<{ records: FinancialRecord[], totalPages: number }> {
  const { records, totalCount } = await db.getFinancialRecords(filters, page, pageSize);
  const totalPages = Math.ceil(totalCount / pageSize);
  return { records, totalPages };
}

// This function determines the filters for the *previous month* relative to the main filters.
// It can only do this if the main filters specify a month and year.
async function getPreviousPeriodFilters(filters: Filters): Promise<Filters | null> {
  const { ano, mes } = filters;

  if (mes && ano) {
    if (mes > 1) {
      return { ...filters, mes: mes - 1 };
    } else { // mes is 1 (January)
      return { ...filters, mes: 12, ano: ano - 1 };
    }
  }
  
  // If no specific month is selected, we cannot determine the "previous month".
  return null;
}


export async function getSummaryData(filters: Filters): Promise<SummaryData> {
  const summaryData = await db.getSummaryData(filters);

  // Calculate Monthly Growth
  const previousPeriodFilters = await getPreviousPeriodFilters(filters);
  let monthlyGrowth: number | undefined = undefined;

  if (previousPeriodFilters) {
    const previousSummary = await db.getSummaryData(previousPeriodFilters);
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

export async function getDistinctValues(): Promise<{ polos: string[], categorias: string[], anos: number[] }> {
    const distinctValues = await db.getDistinctValues();
    return distinctValues;
}

export async function deleteFinancialRecord(id: string): Promise<{ success: boolean }> {
  await db.deleteFinancialRecord(id);
  revalidatePath('/'); // Revalidate the main page to show the updated list
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getImports(): Promise<ImportInfo[]> {
    const imports = await db.getImports();
    return imports;
}


// --- Dashboard Specific Data ---

export async function getRepassePorPolo(filters: Filters) {
    const { records } = await db.getFinancialRecords(filters, 1, 9999);

    const data = records
        .reduce((acc, record) => {
            acc[record.polo] = (acc[record.polo] || 0) + record.valor_repasse;
            return acc;
        }, {} as Record<string, number>);
    
    return Object.entries(data).map(([polo, valor]) => ({ name: polo, value: valor }));
}

export async function getComposicaoRepasse(filters: Filters) {
    const { records } = await db.getFinancialRecords(filters, 1, 9999);

    const data = records
        .reduce((acc, record) => {
            if (!acc[record.polo]) {
                acc[record.polo] = { polo: record.polo, Mensalidade: 0, Acordo: 0, Serviço: 0, Descontos: 0 };
            }
            // Ensure type exists on the object before adding to it
            if (acc[record.polo][record.tipo] !== undefined) {
               acc[record.polo][record.tipo] += record.valor_repasse;
            }
            return acc;
        }, {} as Record<string, any>);

    return Object.values(data);
}

export async function getEvolucaoMensal(tipo: Tipo | 'Faturamento', filters: Filters) {
    const yearFilter = { referencia_ano: filters.ano || new Date().getFullYear() };
    const { mes, ...yearlyFilters } = filters;
    
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).replace('.', ''), value: 0 }));

    const { records } = await db.getFinancialRecords({ ...yearlyFilters, ...yearFilter }, 1, 99999);

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


export async function getReceitaPorPoloTableData(filters: Filters) {
    const yearFilter = { referencia_ano: filters.ano || new Date().getFullYear() };
    const { mes, ...yearlyFilters } = filters;

    const { records } = await db.getFinancialRecords({ ...yearlyFilters, ...yearFilter }, 1, 99999);
    const { polos: allPolos } = await db.getDistinctValues();
    const polos = filters.polo && Array.isArray(filters.polo) && filters.polo.length > 0 ? filters.polo : allPolos;
    
    const pivotData: Record<string, Record<number, number>> = {};
    
    polos.forEach(polo => {
        pivotData[polo] = {};
    });

    records
        .forEach(record => {
            if (!pivotData[record.polo]) pivotData[record.polo] = {};
            pivotData[record.polo][record.referencia_mes] = (pivotData[record.polo][record.referencia_mes] || 0) + record.valor_pago;
        });

    const monthNames = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).replace('.', ''));
    
    const tableData = Object.entries(pivotData).map(([polo, months]) => {
        const row: any = { polo };
        let total = 0;
        for (let i = 1; i <= 12; i++) {
            const monthValue = months[i] || 0;
            row[monthNames[i-1]] = monthValue;
            total += monthValue;
        }
        row.total = total;
        return row;
    });

    const footer: { [key: string]: string | number } = { polo: 'Total' };
    let grandTotal = 0;
    for (let i = 1; i <= 12; i++) {
        const monthTotal = tableData.reduce((sum, row) => sum + row[monthNames[i-1]], 0);
        (footer as any)[monthNames[i-1]] = monthTotal;
        grandTotal += monthTotal;
    }
    (footer as any).total = grandTotal;

    return { data: tableData, footer, columns: ['polo', ...monthNames, 'total'] };
}

export async function getTicketMedioData(filters: Filters) {
    const { records } = await db.getFinancialRecords({ ...filters, tipo: 'Mensalidade' }, 1, 99999);
    const { polos: allPolos } = await db.getDistinctValues();
    const polos = filters.polo && Array.isArray(filters.polo) && filters.polo.length > 0 ? filters.polo : allPolos;

    const result = polos.map(polo => {
        const poloRecords = records.filter(r => r.polo === polo);

        const ticket1Records = poloRecords.filter(r => r.parcela === 1);
        const totalTicket1 = ticket1Records.reduce((sum, r) => sum + r.valor_pago, 0);
        const ticket1 = ticket1Records.length > 0 ? totalTicket1 / ticket1Records.length : 0;

        const ticket2Records = poloRecords.filter(r => r.parcela === 2);
        const totalTicket2 = ticket2Records.reduce((sum, r) => sum + r.valor_pago, 0);
        const ticket2 = ticket2Records.length > 0 ? totalTicket2 / ticket2Records.length : 0;
        
        return {
            polo: polo,
            ticket1: ticket1,
            ticket2: ticket2,
            discount: 0, // will calculate later
        }
    });

    const { records: discountRecords } = await db.getFinancialRecords({ ...filters, tipo: 'Descontos' }, 1, 99999);
    
    polos.forEach(polo => {
        const poloDiscountRecords = discountRecords.filter(r => r.polo === polo);
        const totalDesconto = poloDiscountRecords.reduce((sum, r) => sum + r.valor_pago, 0);
        const count = poloDiscountRecords.length;
        const descMedio = count > 0 ? Math.abs(totalDesconto) / count : 0;

        const res = result.find(r => r.polo === polo);
        if (res) {
            res.discount = descMedio;
        }
    });


    return result;
}

export async function getReceitaPorCategoria(filters: Filters) {
    const { records } = await db.getFinancialRecords(filters, 1, 99999);
    const data = records.reduce((acc, record) => {
        if(record.categoria !== 'Outras Receitas' || record.tipo !== 'Descontos') {
            acc[record.categoria] = (acc[record.categoria] || 0) + record.valor_pago;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(data).map(([name, value]) => ({ name, value }));
}

export async function getTopPolos(filters: Filters) {
    const { records } = await db.getFinancialRecords(filters, 1, 99999);
    const data = records.reduce((acc, record) => {
        acc[record.polo] = (acc[record.polo] || 0) + record.valor_pago;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
}

export async function getDespesasAgrupadasPorPolo(filters: { ano: number, mes: number }): Promise<{ polo: string; total: number }[]> {
    const allDespesas = await db.getDespesas(filters);
    const { polos: allPolos } = await db.getDistinctValues();
    
    const despesasMap = allPolos.reduce((acc, polo) => {
        acc[polo] = 0;
        return acc;
    }, {} as Record<string, number>);

    allDespesas.forEach(d => {
        if (despesasMap[d.polo] !== undefined) {
            despesasMap[d.polo] += d.valor;
        }
    });

    return Object.entries(despesasMap).map(([polo, total]) => ({ polo, total })).sort((a, b) => a.polo.localeCompare(b.polo));
}

export async function getDespesasDetalhadas(filters: { polo: string, ano: number, mes: number }): Promise<Despesa[]> {
    return await db.getDespesas(filters);
}

export async function getLucratividadeData(filters: Filters): Promise<LucratividadeData[]> {
    const { records } = await db.getFinancialRecords(filters, 1, 99999);
    const despesas = await db.getDespesas(filters);

    const dataByPolo: Record<string, { receita: number; repasse: number; despesa: number }> = {};

    records.forEach(rec => {
        if (!dataByPolo[rec.polo]) {
            dataByPolo[rec.polo] = { receita: 0, repasse: 0, despesa: 0 };
        }
        dataByPolo[rec.polo].receita += rec.valor_pago;
        dataByPolo[rec.polo].repasse += rec.valor_repasse;
    });

    despesas.forEach(desp => {
        if (!dataByPolo[desp.polo]) {
            dataByPolo[desp.polo] = { receita: 0, repasse: 0, despesa: 0 };
        }
        dataByPolo[desp.polo].despesa += desp.valor;
    });

    return Object.entries(dataByPolo).map(([polo, values]) => ({
        polo,
        ...values,
        lucro: values.repasse - values.despesa
    })).sort((a,b) => b.lucro - a.lucro);
}

export async function getLucratividadePorMetodologia(filters: Filters): Promise<LucratividadePorMetodologiaData[]> {
    const { records } = await db.getFinancialRecords(filters, 1, 99999);
    const despesas = await db.getDespesas(filters);
    const cursos = await db.getCursos();

    const cursosMap = new Map<string, Curso>(cursos.map(c => [c.sigla, c]));

    const dataByPolo: Record<string, {
        receita: number;
        repasse: number;
        despesa: number;
        metodologias: Record<string, { receita: number; repasse: number }>
    }> = {};

    // 1. Aggregate receita and repasse by polo and metodologia
    records.forEach(rec => {
        if (!dataByPolo[rec.polo]) {
            dataByPolo[rec.polo] = { receita: 0, repasse: 0, despesa: 0, metodologias: {} };
        }

        const curso = rec.sigla_curso ? cursosMap.get(rec.sigla_curso) : undefined;
        const metodologia = curso?.metodologia || 'Outros';

        if (metodologia === 'EAD' || metodologia === 'HIBRIDO') {
            if (!dataByPolo[rec.polo].metodologias[metodologia]) {
                dataByPolo[rec.polo].metodologias[metodologia] = { receita: 0, repasse: 0 };
            }
            dataByPolo[rec.polo].metodologias[metodologia].receita += rec.valor_pago;
            dataByPolo[rec.polo].metodologias[metodologia].repasse += rec.valor_repasse;
            dataByPolo[rec.polo].receita += rec.valor_pago; // Total revenue for the polo (EAD and Hibrido only)
        }
    });
    
    // 2. Aggregate despesas by polo
    despesas.forEach(desp => {
        if (!dataByPolo[desp.polo]) {
             dataByPolo[desp.polo] = { receita: 0, repasse: 0, despesa: 0, metodologias: {} };
        }
        dataByPolo[desp.polo].despesa += desp.valor;
    });

    // 3. Prorate expenses and calculate final lucro
    const finalData: LucratividadePorMetodologiaData[] = [];

    Object.entries(dataByPolo).forEach(([polo, poloData]) => {
        const totalReceitaPolo = poloData.receita > 0 ? poloData.receita : 1; // Avoid division by zero

        Object.entries(poloData.metodologias).forEach(([metodologia, metodologiaData]) => {
            const fator = metodologiaData.receita / totalReceitaPolo;
            const despesaProrated = poloData.despesa * fator;
            const lucro = metodologiaData.repasse - despesaProrated;

            finalData.push({
                polo,
                metodologia: metodologia as 'EAD' | 'HIBRIDO' | 'Outros',
                receita: metodologiaData.receita,
                repasse: metodologiaData.repasse,
                despesa: despesaProrated,
                lucro,
            });
        });
    });

    return finalData;
}

export async function getCursos(): Promise<Curso[]> {
    return await db.getCursos();
}
