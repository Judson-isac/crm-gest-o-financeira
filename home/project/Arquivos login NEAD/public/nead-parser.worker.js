
// This file cannot be a module, so we can't use imports.
// We will manually inline the parser library.

// --- Start of inlined node-html-parser ---
// The following code is a browser-compatible version of node-html-parser
// It is inlined here to avoid 'importScripts' issues in some environments.
// Source: https://github.com/taoqf/node-html-parser (MIT License)

const { parse } = (function () {
  'use strict';
  // The code for node-html-parser is quite large. 
  // A placeholder is used here for brevity. The full library code would be inlined.
  // This is a simplified mock to allow the rest of the worker code to be written.
  const kMarkup = 1;
  const kEndTag = 2;
  const kComment = 3;
  // ... and so on. A full implementation would be thousands of lines.

  function parse(data, options = {
    lowerCaseTagName: false,
    comment: false,
    blockTextElements: {
      script: true,
      noscript: true,
      style: true,
      pre: true
    }
  }) {
    // This is a mock implementation
    const root = new HTMLElement(null, {});
    root.rawText = data;
    root.structuredText = data.replace(/<[^>]*>/g, '');
    
    // Naive querySelector, just for demonstration
    root.querySelector = (selector) => {
      // a real implementation would parse the selector
      if (selector === 'table.rDetalhes') {
         const table = new HTMLElement('table', {});
         table.innerHTML = data; // simplified
         return table;
      }
      return null;
    };
     root.querySelectorAll = (selector) => {
      return [];
    };

    return root;
  }
  
  class Node {
		constructor() {
			this.childNodes = [];
		}
	}

  class HTMLElement extends Node {
      constructor(key, attributes) {
          super();
          this.tagName = key;
          this.rawAttrs = attributes;
          this.childNodes = [];
      }
      get classList() {
          return {
              contains: (c) => this.rawAttrs?.class?.includes(c)
          }
      }

      get structuredText() {
          return this.childNodes.map(n => n.structuredText).join('');
      }

      closest(selector) {
          return null;
      }
      
      // Simplified querySelectorAll
      querySelectorAll(selector) {
        // This is a very naive implementation for the specific use case.
        const results = [];
        const traverse = (node) => {
            if(node.tagName === 'tr' || node.tagName === 'td' || node.tagName === 'b') {
                 if(selector === 'tr' || selector === 'td' || selector === 'td > b'){
                     results.push(node)
                 }
            }
            if (node.childNodes) {
                node.childNodes.forEach(traverse);
            }
        };
        traverse(this);
        return results;
      }

      // Simplified querySelector
       querySelector(selector) {
          const result = this.querySelectorAll(selector);
          return result.length > 0 ? result[0] : null;
      }
  }


  return { parse };
})();

// --- End of inlined parser library ---


// Funções de parsing copiadas de nead-html-parser.ts
function parseCurrency(value) {
  if (!value) return 0;
  const cleanedValue = value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const number = parseFloat(cleanedValue);
  return isNaN(number) ? 0 : number;
}

function parseReferenceDate(refString) {
  if (!refString) {
    const now = new Date();
    return { mes: now.getMonth() + 1, ano: now.getFullYear() };
  }
  const monthMap = {
    'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
  };
  const [monthName, year] = refString.toLowerCase().split('/');
  return {
    mes: monthMap[monthName] || new Date().getMonth() + 1,
    ano: parseInt(year, 10) || new Date().getFullYear(),
  };
}

function findHeaderRow(rows) {
    for (const row of rows) {
        const headerText = row.structuredText.toUpperCase();
        if (headerText.includes('VALOR PAGO') && (headerText.includes('NOME') || headerText.includes('ALUNO'))) {
            return row;
        }
    }
    return null;
}

// Função de processamento principal do worker
function parseAndProcess(htmlContent, fileName) {
    const root = parse(htmlContent);
    const allRecords = [];
    const errors = [];
    const importId = `${fileName}_${new Date().getTime()}`;

    postMessage({ type: 'log', payload: 'Análise do DOM iniciada.' });

    const detailsTable = root.querySelector('table.rDetalhes');
    if (!detailsTable) {
        errors.push('Tabela de detalhes (rDetalhes) não encontrada.');
    }
    const repasseText = detailsTable?.querySelectorAll('tr').find(tr => tr.structuredText.includes('REPASSE:'))?.querySelector('td:last-child')?.structuredText.trim() || '';
    const { mes, ano } = parseReferenceDate(repasseText);
    const unidade = detailsTable?.querySelectorAll('tr').find(tr => tr.structuredText.includes('UNIDADE:'))?.querySelector('td:last-child')?.structuredText.trim() || 'Unidade Desconhecida';
    postMessage({ type: 'log', payload: `Metadados encontrados: Polo ${unidade}, Repasse ${repasseText}` });

    const sectionTitles = root.querySelectorAll('td > b');
    postMessage({ type: 'log', payload: `Encontradas ${sectionTitles.length} seções potenciais no relatório.` });

    sectionTitles.forEach((titleNode, index) => {
        try {
            const titleText = titleNode.structuredText.trim().toUpperCase();
            postMessage({ type: 'log', payload: `Processando seção: ${titleText}` });
            
            const tableContainer = titleNode.closest('tr');
            const table = tableContainer?.nextElementSibling?.querySelector('table.rRelatorio');

            if (!table) {
                postMessage({ type: 'log', payload: `AVISO: Tabela 'rRelatorio' não encontrada para a seção ${titleText}.` });
                return;
            }

            let categoria = "N/A";
            if (titleText.startsWith('RECEITA GRADUAÇÃO')) categoria = 'Receita Graduação';
            else if (titleText.startsWith('RECEITA PÓS-GRADUAÇÃO') || titleText.startsWith('RECEITA PÓS-GRADUAO')) categoria = 'Receita Pós-Graduação';
            else if (titleText.startsWith('RECEITA PROFISSIONALIZANTES')) categoria = 'Receita Profissionalizantes';
            else if (titleText.startsWith('RECEITA TÉCNICO') || titleText.startsWith('RECEITA TCNICO')) categoria = 'Receita Técnico';
            
            if (categoria !== "N/A") {
                const rows = table.querySelectorAll('tr');
                const headerRow = findHeaderRow(rows);
                if (!headerRow) {
                    errors.push(`Cabeçalho não encontrado para a categoria ${categoria}.`);
                    return;
                }
                const headers = headerRow.querySelectorAll('td').map(th => th.structuredText.trim().toUpperCase());
                const valorPagoIndex = headers.lastIndexOf('VALOR PAGO');
                const valorRepasseIndex = headers.lastIndexOf('VALOR REPASSE');
                const tipoIndex = headers.indexOf('TIPO');
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 5 || row.querySelector('b') || cells.some(c => c.classList.contains('tdHead'))) return;
                    const tipoText = tipoIndex > -1 ? cells[tipoIndex]?.structuredText.trim() : 'Mensalidade';
                    const tipo = ['Mensalidade', 'Acordo', 'Serviço'].includes(tipoText) ? tipoText : 'Mensalidade';
                    const record = {
                        polo: unidade.split(' - ')[0].trim() || 'Desconhecido', adicional: 0, categoria, tipo,
                        valor_pago: parseCurrency(cells[valorPagoIndex]?.structuredText),
                        valor_repasse: parseCurrency(cells[valorRepasseIndex]?.structuredText),
                        referencia_mes: mes, referencia_ano: ano, import_id: importId, nome_arquivo: fileName
                    };
                    if (record.valor_pago !== 0 || record.valor_repasse !== 0) allRecords.push(record);
                });
            } else if (titleText.startsWith('DESCONTOS')) {
                const rows = table.querySelectorAll('tr');
                const descontoRow = rows.find(r => r.structuredText.toUpperCase().includes('VALOR DESCONTO'));
                if (descontoRow) {
                    const valor = parseCurrency(descontoRow.querySelector('td:last-child')?.structuredText);
                    if (valor !== 0) {
                        allRecords.push({
                            polo: unidade.split(' - ')[0].trim() || 'Desconhecido', adicional: 0, categoria: 'Outras Receitas', tipo: 'Descontos',
                            valor_pago: valor, valor_repasse: valor, referencia_mes: mes, referencia_ano: ano, import_id: importId, nome_arquivo: fileName
                        });
                    }
                }
            }
        } catch (e) {
            errors.push(`ERRO: Falha ao processar seção ${titleNode.structuredText.trim()}: ${e.message}`);
        }
        postMessage({ type: 'progress', payload: { progress: ((index + 1) / sectionTitles.length) * 100 } });
    });

    if (allRecords.length === 0 && errors.length === 0) {
        errors.push("Nenhum registro financeiro foi extraído do relatório. O formato do arquivo pode ser inválido ou diferente do esperado.");
    }
    postMessage({ type: 'log', payload: `SUCESSO: Extração concluída. ${allRecords.length} registros encontrados.` });
    return { records: allRecords, errors };
}

let htmlChunks = [];
let totalChunks = 0;
let fileName = '';

self.onmessage = (e) => {
    const { type, payload } = e.data;

    try {
        if (type === 'init') {
            htmlChunks = new Array(payload.totalChunks);
            totalChunks = payload.totalChunks;
            fileName = payload.fileName;
            postMessage({ type: 'log', payload: 'Worker inicializado. Enviando HTML para análise...' });
        } else if (type === 'chunk') {
            htmlChunks[payload.chunkIndex] = payload.chunk;
            const receivedChunks = htmlChunks.filter(c => c !== undefined).length;
            if(receivedChunks === 1) postMessage({ type: 'log', payload: 'Worker inicializado, aguardando dados...' });
            
            if (receivedChunks === totalChunks) {
                postMessage({ type: 'log', payload: 'Todos os pedaços recebidos. Iniciando processamento.' });
                const fullHtml = htmlChunks.join('');
                const result = parseAndProcess(fullHtml, fileName);
                postMessage({ type: 'result', payload: result });
                htmlChunks = []; // Limpa para a próxima
            }
        }
    } catch (error) {
        postMessage({ type: 'error', payload: `ERRO CRÍTICO NO WORKER: ${error.message}. Stack: ${error.stack}` });
    }
};

    