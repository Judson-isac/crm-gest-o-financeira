
'use server';
import { JSDOM } from 'jsdom';
import type { FinancialRecord } from './types';

export function parseFinancialRecordsHTML(html: string, fileName: string): Omit<FinancialRecord, 'id' | 'data_importacao'>[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const records: Omit<FinancialRecord, 'id' | 'data_importacao'>[] = [];
    const importId = new Date().toISOString(); 

    // Função para extrair mês e ano de uma string como "SETEMBRO/2022"
    function parseReferenceDate(refString: string): { mes: number; ano: number } {
        if (!refString) {
            return {
                mes: new Date().getMonth() + 1,
                ano: new Date().getFullYear()
            }
        }
        const monthMap: { [key: string]: number } = {
            'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
            'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
        };

        // CORREÇÃO: Normaliza o nome do mês antes de procurar no mapa.
        const [monthName, year] = refString.toLowerCase().split('/');
        const normalizedMonthName = monthName.trim().normalize("NFD").replace(/[̀-ͯ]/g, "");

        return {
            mes: monthMap[normalizedMonthName] || new Date().getMonth() + 1,
            ano: parseInt(year, 10) || new Date().getFullYear(),
        };
    }

    const tableRows = document.querySelectorAll('table tr');
    let currentPolo = '';
    let currentCategoria = '';

    tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');

        if (cells.length === 1) {
            const text = cells[0].textContent?.trim() || '';
            if (text.startsWith('Polo:')) {
                currentPolo = text.replace('Polo:', '').trim();
            } else if (text.startsWith('Categoria:')) {
                currentCategoria = text.replace('Categoria:', '').trim();
            }
        } else if (cells.length > 5) {
            const tipo = cells[0].textContent?.trim() as FinancialRecord['tipo'];
            const parcela = parseInt(cells[1].textContent?.trim() || '0', 10);
            const valorBruto = parseFloat(cells[2].textContent?.trim().replace(',', '.') || '0');
            const valorRepasse = parseFloat(cells[4].textContent?.trim().replace(',', '.') || '0');
            const referencia = cells[5].textContent?.trim() || '';

            const { mes, ano } = parseReferenceDate(referencia);

            records.push({
                polo: currentPolo,
                categoria: currentCategoria,
                tipo,
                parcela,
                valor_bruto: valorBruto,
                valor_repasse: valorRepasse,
                referencia_mes: mes,
                referencia_ano: ano,
                import_id: importId,
                nome_arquivo: fileName,
                tipo_importacao: 'NEAD'
            });
        }
    });

    return records;
}
