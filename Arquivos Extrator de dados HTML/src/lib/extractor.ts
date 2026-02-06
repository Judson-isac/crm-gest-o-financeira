
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
    // Wrap the content in a full table structure to ensure the parser works correctly.
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
    
    // 1. Find the anchor cell containing "RESUMO"
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
            
            // 3. Map columns based on fixed positions
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


export function extractDataFromHtml(htmlString: string): ExtractedData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const result: ExtractedData = { polos: [] };

    const detailsTable = doc.querySelector('.rDetalhes');
    if (detailsTable) {
        detailsTable.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;
            const label = getText(cells[0]);
            const value = getText(cells[1]);
            if (label.includes('UNIDADE:')) result.nomeUnidade = value;
            else if (label.includes('REPASSE:')) result.mesReferencia = value;
            else if (label.includes('PERÍODO:')) result.periodo = value;
        });
    }

    const mainTableRows = Array.from(doc.querySelectorAll('div#conteudo > table.rRelatorio > tbody > tr'));

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
            poloHtmlContent = ''; // Reset for the new polo
        }
        
        if (currentPolo) {
            poloHtmlContent += row.outerHTML;
        }

        const categoryTitleElement = row.querySelector('td[colspan="4"][style*="font-size:20px"]');
        const isSectionTitle = categoryTitleElement && (categoryTitleElement.style.fontWeight === 'bold' || categoryTitleElement.querySelector('b'));
        
        if (isSectionTitle && getText(categoryTitleElement).toUpperCase() !== 'RESUMO') {
            const titleText = getText(categoryTitleElement).toUpperCase();
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
        currentPolo.resumo_categorias = extractResumo(poloHtmlContent);
        result.polos.push(currentPolo);
    }

    return result;
}
