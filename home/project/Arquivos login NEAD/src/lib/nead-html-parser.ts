"use client";

import type { FinancialRecord, Tipo, Categoria } from './types';

// Interfaces from the better extractor
export interface ExtractedRecord {
    idSequencial?: string;
    raCodigo?: string;
    nomeAluno?: string;
    curso?: string;
    dataIngresso?: string;
    tipoLancamento?: string;
    parcela?: string;
    vencimento?: string;
    pagamento?: string;
    valorBruto?: string;
    valorLiquido?: string;
}

export interface ExtractedDiscount {
    descricao?: string;
    parcela?: string;
    vencimento?: string;
    pagamento?: string;
    valorBruto?: string;
    valorLiquido?: string;
    tipoLancamento?: string;
}

export interface CategoriaResumoItem {
    pago: string;
    repasse: string;
}

export interface ResumoCategorias {
    detalhes?: {
        mensalidade: CategoriaResumoItem[];
        servico: CategoriaResumoItem[];
        acordo: CategoriaResumoItem[];
        total: CategoriaResumoItem[];
    }
}


export interface ExtractedPoloData {
    razaoSocial?: string;
    nomePoloCidade?: string;
    dadosBancarios?: string;
    revenues_graduacao: ExtractedRecord[];
    revenues_pos_graduacao: ExtractedRecord[];
    revenues_tecnico: ExtractedRecord[];
    revenues_profissionalizante: ExtractedRecord[];
    revenues_universo_ead: ExtractedRecord[];
    discounts: ExtractedDiscount[];
    totalBruto?: string;
    totalDescontos?: string;
    totalLiquido?: string;
    resumo_categorias?: ResumoCategorias;
}

export interface ExtractedData {
    nomeUnidade?: string;
    mesReferencia?: string;
    periodo?: string;
    polos: ExtractedPoloData[];
}

// Helper functions from the better extractor
function cleanCurrency(value: string | null | undefined): string {
    if (!value) return '0.00';
    const sign = value.includes('-') ? '-' : '';
    // Handles formats like "R$ 3.658,24" and "1.097,50"
    const numberPart = value.replace(/R\$\s?|-/g, '').replace(/\./g, '').replace(',', '.').trim();
    if (numberPart === '') return '0.00';
    try {
        const parsed = parseFloat(numberPart);
        if (isNaN(parsed)) return '0.00';
        return sign + parsed.toFixed(2);
    } catch {
        return '0.00';
    }
}

function getText(element: Element | null | undefined): string {
    return element?.textContent?.trim().replace(/\s+/g, ' ') || '';
}

function extractResumo(poloHtmlContent: string): ResumoCategorias {
    const wrappedHtml = `<table><tbody>${poloHtmlContent}</tbody></table>`;
    const doc = new DOMParser().parseFromString(wrappedHtml, 'text/html');

    const resumo: ResumoCategorias = {
        detalhes: {
            mensalidade: Array(5).fill({ pago: '0.00', repasse: '0.00' }),
            servico: Array(5).fill({ pago: '0.00', repasse: '0.00' }),
            acordo: Array(5).fill({ pago: '0.00', repasse: '0.00' }),
            total: Array(5).fill({ pago: '0.00', repasse: '0.00' }),
        }
    };
    
    const resumoAnchor = Array.from(doc.querySelectorAll('td')).find(
        el => el.textContent?.trim().toUpperCase() === 'RESUMO'
    );

    if (!resumoAnchor) return resumo;

    const resumoTable = resumoAnchor.closest('table');
    if (!resumoTable) return resumo;

    const rows = Array.from(resumoTable.querySelectorAll('tr'));
    const dataRowKeys = ['MENSALIDADE', 'SERVIÇO', 'SERVICO', 'ACORDO', 'TOTAL'];
    const categoryCount = 5;

    for (const row of rows) {
        const cells = Array.from(row.cells);
        if (cells.length < 1) continue;

        const rowType = cells[0].textContent?.trim().toUpperCase() || '';
        
        if (dataRowKeys.includes(rowType)) {
            const rowData: CategoriaResumoItem[] = [];
            
            for (let i = 0; i < categoryCount; i++) {
                const pagoIndex = (i * 2) + 1;
                const repasseIndex = (i * 2) + 2;

                if (repasseIndex < cells.length) {
                    rowData.push({
                        pago: cleanCurrency(cells[pagoIndex]?.textContent),
                        repasse: cleanCurrency(cells[repasseIndex]?.textContent)
                    });
                } else {
                     rowData.push({ pago: '0.00', repasse: '0.00' });
                }
            }
            
            if (rowType === 'MENSALIDADE') {
                resumo.detalhes!.mensalidade = rowData;
            } else if (rowType === 'SERVIÇO' || rowType === 'SERVICO') {
                resumo.detalhes!.servico = rowData;
            } else if (rowType === 'ACORDO') {
                resumo.detalhes!.acordo = rowData;
            } else if (rowType === 'TOTAL') {
                resumo.detalhes!.total = rowData;
            }
        }
    }

    return resumo;
}

function extractDataFromHtml(htmlString: string, log: (message: string) => void): ExtractedData {
    log("[INFO] Parsing HTML string with DOMParser.");
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const result: ExtractedData = { polos: [] };

    const detailsTable = doc.querySelector('.rDetalhes');
    if (detailsTable) {
        log("[INFO] Found details table. Extracting metadata...");
        detailsTable.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;
            const label = getText(cells[0]);
            const value = getText(cells[1]);
            if (label.includes('UNIDADE:')) result.nomeUnidade = value;
            else if (label.includes('REPASSE:')) result.mesReferencia = value;
            else if (label.includes('PERÍODO:')) result.periodo = value;
        });
        log(`[SUCCESS] Metadata extracted: Unidade=${result.nomeUnidade}, Mês=${result.mesReferencia}`);
    } else {
        log("[WARNING] Details table (.rDetalhes) not found.");
    }

    const mainTableRows = Array.from(doc.querySelectorAll('div#conteudo > table.rRelatorio > tbody > tr'));
    log(`[INFO] Found ${mainTableRows.length} main rows to process.`);

    let currentPolo: ExtractedPoloData | null = null;
    let poloHtmlContent = '';
    let currentCategory: string | null = null;

    for (let i = 0; i < mainTableRows.length; i++) {
        const row = mainTableRows[i];
        if (!row) continue;

        const firstCell = row.querySelector('td');
        if (!firstCell) continue;

        const isPoloHeader = firstCell.getAttribute('style')?.includes('background:#BFBFBF');
        if (isPoloHeader) {
            if (currentPolo) {
                log(`[INFO] Finalizing previous polo: ${currentPolo.nomePoloCidade}. Extracting summary...`);
                currentPolo.resumo_categorias = extractResumo(poloHtmlContent);
                result.polos.push(currentPolo);
            }
            const poloCells = row.querySelectorAll('td');
            currentPolo = {
                razaoSocial: getText(poloCells[0]).replace('CONVENIADO', '').trim(),
                nomePoloCidade: getText(poloCells[1]),
                dadosBancarios: getText(poloCells[2]),
                revenues_graduacao: [],
                revenues_pos_graduacao: [],
                revenues_tecnico: [],
                revenues_profissionalizante: [],
                revenues_universo_ead: [],
                discounts: [],
            };
            log(`[INFO] New polo started: ${currentPolo.nomePoloCidade}`);
            poloHtmlContent = ''; 
        }
        
        if (currentPolo) {
            poloHtmlContent += row.outerHTML;
        }

        const categoryTitleElement = row.querySelector('td[colspan="4"][style*="font-size:20px"]');
        const isSectionTitle = categoryTitleElement && (categoryTitleElement.style.fontWeight === 'bold' || categoryTitleElement.querySelector('b'));
        
        if (isSectionTitle && getText(categoryTitleElement).toUpperCase() !== 'RESUMO') {
            const titleText = getText(categoryTitleElement).toUpperCase();
            log(`[INFO] Found section title: ${titleText}`);
            if (titleText.includes('DESCONTOS')) {
                currentCategory = 'DESCONTO';
            } else if (titleText.includes('RECEITA GRADUAÇÃO')) {
                currentCategory = 'RECEITA_GRADUACAO';
            } else if (titleText.includes('RECEITA PÓS-GRADUAÇÃO')) {
                currentCategory = 'RECEITA_POS_GRADUACAO';
            } else if (titleText.includes('RECEITA TÉCNICO')) {
                currentCategory = 'RECEITA_TECNICO';
            } else if (titleText.includes('RECEITA PROFISSIONALIZANTES')) {
                currentCategory = 'RECEITA_PROFISSIONALIZANTE';
            } else if (titleText.includes('RECEITA UNIVERSO EAD')) {
                currentCategory = 'RECEITA_UNIVERSO_EAD';
            } else {
                currentCategory = null;
            }

            const contentRow = mainTableRows[++i];
             if(contentRow && currentPolo) {
                poloHtmlContent += contentRow.outerHTML;
                const nestedTable = contentRow.querySelector('table.rRelatorio');

                if (nestedTable) {
                    log(`[INFO] Processing nested table for category: ${currentCategory}`);
                    nestedTable.querySelectorAll('tbody > tr').forEach((dataRow) => {
                        const dataCells = Array.from(dataRow.querySelectorAll('td'));
                         if (dataCells.length < 13) return;

                        if (currentCategory === 'DESCONTO') {
                            const discount: ExtractedDiscount = {
                                descricao: getText(dataCells[2]),
                                parcela: getText(dataCells[8]),
                                vencimento: getText(dataCells[9]),
                                pagamento: getText(dataCells[10]),
                                valorBruto: cleanCurrency(getText(dataCells[11])),
                                valorLiquido: cleanCurrency(getText(dataCells[12])),
                                tipoLancamento: 'despesa_operacional'
                            };
                            currentPolo?.discounts.push(discount);
                        } else if (currentCategory?.startsWith('RECEITA')) {
                            const record: ExtractedRecord = {
                                idSequencial: getText(dataCells[0]),
                                raCodigo: getText(dataCells[1]),
                                nomeAluno: getText(dataCells[2]),
                                curso: getText(dataCells[3]),
                                dataIngresso: getText(dataCells[6]),
                                tipoLancamento: getText(dataCells[7]),
                                parcela: getText(dataCells[8]),
                                vencimento: getText(dataCells[9]),
                                pagamento: getText(dataCells[10]),
                                valorBruto: cleanCurrency(getText(dataCells[11])),
                                valorLiquido: cleanCurrency(getText(dataCells[12]))
                            };
                            if(currentCategory === 'RECEITA_GRADUACAO') currentPolo?.revenues_graduacao.push(record);
                            else if(currentCategory === 'RECEITA_POS_GRADUACAO') currentPolo?.revenues_pos_graduacao.push(record);
                            else if(currentCategory === 'RECEITA_TECNICO') currentPolo?.revenues_tecnico.push(record);
                            else if(currentCategory === 'RECEITA_PROFISSIONALIZANTE') currentPolo?.revenues_profissionalizante.push(record);
                            else if(currentCategory === 'RECEITA_UNIVERSO_EAD') currentPolo?.revenues_universo_ead.push(record);
                        }
                    });
                } else {
                     log(`[WARNING] No nested table found for category: ${currentCategory}`);
                }
             }
            continue; 
        }

        const boldCells = Array.from(row.querySelectorAll('td b'));
        const totalLabelCell = boldCells.find(b => getText(b).includes('TOTAL') || getText(b).includes('VALOR'));
        if (totalLabelCell) {
            const label = getText(totalLabelCell).toUpperCase();
            const valueCell = totalLabelCell.parentElement?.nextElementSibling;
            const value = cleanCurrency(getText(valueCell));

            if (currentPolo) {
                if (label.includes('TOTAL NF') || label.includes('VALOR NF')) {
                    currentPolo.totalBruto = value;
                } else if (label.includes('TOTAL DESCONTOS') || label.includes('DESCONTOS') || label.includes('VALOR DESCONTO')) {
                    currentPolo.totalDescontos = value;
                } else if (label.includes('TOTAL VALOR LÍQUIDO') || label.includes('VALOR REPASSE')) {
                    currentPolo.totalLiquido = value;
                }
            }
        }
    }

    if (currentPolo) {
        log(`[INFO] Finalizing last polo: ${currentPolo.nomePoloCidade}. Extracting summary...`);
        currentPolo.resumo_categorias = extractResumo(poloHtmlContent);
        result.polos.push(currentPolo);
    }
    
    log("[SUCCESS] HTML parsing finished.");
    return result;
}


// Helper to get month/year from a string like "JANEIRO/2024"
function parseReferenceDate(refString: string | undefined): { mes: number; ano: number } {
  if (!refString) {
      return { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() }
  }
  const monthMap: { [key: string]: number } = {
    'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
  };
  const [monthName, year] = refString.toLowerCase().split('/');
  return {
    mes: monthMap[monthName] || new Date().getMonth() + 1,
    ano: parseInt(year, 10) || new Date().getFullYear(),
  };
}

export function parseNeadHtml(htmlContent: string, fileName: string, log: (message: string) => void): { records: Omit<FinancialRecord, 'id' | 'data_importacao'>[], errors: string[] } {
    const errors: string[] = [];
    
    const extractedData = extractDataFromHtml(htmlContent, log);
    
    const records: Omit<FinancialRecord, 'id' | 'data_importacao'>[] = [];
    const importId = `${fileName}_${new Date().getTime()}`;
    const { mes: referencia_mes, ano: referencia_ano } = parseReferenceDate(extractedData.mesReferencia);

    for (const polo of extractedData.polos) {
        const poloName = polo.nomePoloCidade || 'Desconhecido';
        log(`[INFO] Transforming data for polo: ${poloName}`);

        const processRevenues = (revenueRecords: ExtractedRecord[], categoria: Categoria) => {
            for (const rec of revenueRecords) {
                records.push({
                    polo: poloName,
                    adicional: 0,
                    categoria,
                    tipo: (rec.tipoLancamento as Tipo) || 'Mensalidade',
                    valor_pago: parseFloat(rec.valorBruto || '0'),
                    valor_repasse: parseFloat(rec.valorLiquido || '0'),
                    referencia_mes,
                    referencia_ano,
                    import_id: importId,
                    nome_arquivo: fileName
                });
            }
        };

        processRevenues(polo.revenues_graduacao, 'Receita Graduação');
        processRevenues(polo.revenues_pos_graduacao, 'Receita Pós-Graduação');
        processRevenues(polo.revenues_tecnico, 'Receita Técnico');
        processRevenues(polo.revenues_profissionalizante, 'Receita Profissionalizantes');
        processRevenues(polo.revenues_universo_ead, 'Outras Receitas');

        for (const discount of polo.discounts) {
             records.push({
                polo: poloName,
                adicional: 0,
                categoria: 'Outras Receitas',
                tipo: 'Descontos',
                valor_pago: parseFloat(discount.valorBruto || '0'),
                valor_repasse: parseFloat(discount.valorLiquido || '0'),
                referencia_mes,
                referencia_ano,
                import_id: importId,
                nome_arquivo: fileName
             });
        }
    }
    
    if (records.length === 0) {
        const msg = "Nenhum registro foi extraído. Verifique o conteúdo do HTML.";
        errors.push(msg);
        log(`[AVISO] ${msg}`);
    } else {
        log(`[SUCESSO] Transformação concluída. Total de ${records.length} registros prontos para importação.`);
    }

    return { records, errors };
}

    