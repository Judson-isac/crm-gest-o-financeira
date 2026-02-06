
'use server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import type { FinancialRecord, Filters, SummaryData, Usuario, Funcao, Permissoes, Rede, Canal, Campanha, ProcessoSeletivo, NumeroProcessoSeletivo, Meta, Spacepoint, TipoCurso, Curso, Despesa, ImportInfo, UserPermissions } from './types';

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD || 'mysecretpassword',
  port: parseInt(process.env.PGPORT || '5432', 10),
});

const SALT_ROUNDS = 10;

// Helper function to build WHERE clauses
const buildWhereClause = (filters: Filters, allowedPolos: string[] | null, redeId: string | null): { text: string, values: any[] } => {
    const safeFilters = filters || {};
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const poloFilterFromRequest = Array.isArray(safeFilters.polo) ? safeFilters.polo : (safeFilters.polo ? [safeFilters.polo] : []);

    let effectivePolos: string[] | null = null;
    if (allowedPolos) { // User has polo restrictions
        if (poloFilterFromRequest.length > 0) {
            // Intersect user filter with allowed polos
            effectivePolos = poloFilterFromRequest.filter(p => allowedPolos.includes(p));
        } else {
            // No specific polos requested, use all allowed
            effectivePolos = allowedPolos;
        }
    } else if (allowedPolos === null) { // Superadmin, no restrictions
        effectivePolos = poloFilterFromRequest.length > 0 ? poloFilterFromRequest : null;
    } else { // User has no allowed polos (empty array)
        effectivePolos = [];
    }

    if (effectivePolos && effectivePolos.length > 0) {
        conditions.push(`polo = ANY($${paramIndex++})`);
        values.push(effectivePolos);
    } else if (Array.isArray(allowedPolos) && allowedPolos.length === 0) {
        // This user is restricted to an empty list of polos, so they can see nothing.
        conditions.push('1=0');
    }

    if (safeFilters.categoria) {
        conditions.push(`categoria = $${paramIndex++}`);
        values.push(safeFilters.categoria);
    }
    if (safeFilters.mes) {
        conditions.push(`referencia_mes = $${paramIndex++}`);
        values.push(safeFilters.mes);
    }
    if (safeFilters.ano) {
        conditions.push(`referencia_ano = $${paramIndex++}`);
        values.push(safeFilters.ano);
    }
    if (redeId) {
        conditions.push(`"redeId" = $${paramIndex++}`);
        values.push(redeId);
    }

    return {
        text: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        values,
    };
};

const financialRecordColumns = `
    id, polo, categoria, tipo, parcela, 
    valor_pago, 
    valor_repasse, 
    referencia_mes, referencia_ano, data_importacao, import_id, nome_arquivo, tipo_importacao, sigla_curso, "redeId"
`;

export async function getFinancialRecords(permissions: UserPermissions, filters: Filters, page = 1, pageSize = 10): Promise<{ records: FinancialRecord[], totalCount: number }> {
    const client = await pool.connect();
    try {
        const whereClause = buildWhereClause(filters, permissions.polos, permissions.redeId);
        
        const countQuery = `SELECT COUNT(*) FROM financial_records ${whereClause.text}`;
        const totalCountResult = await client.query(countQuery, whereClause.values);
        const totalCount = parseInt(totalCountResult.rows[0].count, 10) || 0;

        // Defensive coding: ensure page and pageSize are valid numbers.
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;

        const offset = (safePage - 1) * safePageSize;
        const dataQuery = `SELECT ${financialRecordColumns} FROM financial_records ${whereClause.text} ORDER BY data_importacao DESC LIMIT $${whereClause.values.length + 1} OFFSET $${whereClause.values.length + 2}`;
        const result = await client.query(dataQuery, [...whereClause.values, safePageSize, offset]);
        
        return { records: result.rows, totalCount };
    } finally {
        client.release();
    }
}

export async function getSummaryData(permissions: UserPermissions, filters: Filters): Promise<SummaryData> {
    const client = await pool.connect();
    try {
        const whereClause = buildWhereClause(filters, permissions.polos, permissions.redeId);
        const query = `
            SELECT
                COUNT(*) as totalRecords,
                COALESCE(SUM(valor_pago), 0) as totalReceita,
                COALESCE(SUM(valor_repasse), 0) as totalRepasse,
                COUNT(*) FILTER (WHERE tipo = 'Mensalidade') as mensalidadeCount,
                COUNT(*) FILTER (WHERE tipo = 'Acordo') as acordoCount,
                COUNT(*) FILTER (WHERE tipo = 'Serviço') as servicoCount,
                COUNT(*) FILTER (WHERE tipo = 'Descontos') as descontosCount
            FROM financial_records
            ${whereClause.text}
        `;

        const result = await client.query(query, whereClause.values);
        const row = result.rows[0];

        return {
            totalRecords: parseInt(row.totalrecords, 10) || 0,
            totalReceita: parseFloat(row.totalreceita) || 0,
            totalRepasse: parseFloat(row.totalrepasse) || 0,
            tipoCounts: {
                Mensalidade: parseInt(row.mensalidadecount, 10) || 0,
                Acordo: parseInt(row.acordocount, 10) || 0,
                Serviço: parseInt(row.servicocount, 10) || 0,
                Descontos: parseInt(row.descontoscount, 10) || 0,
            },
        };
    } finally {
        client.release();
    }
}

export async function storeFinancialRecords(records: (Omit<FinancialRecord, 'id' | 'data_importacao'> & { redeId: string })[]): Promise<void> {
    if (!records || records.length === 0) {
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const importId = records[0]?.import_id || uuidv4();
        const redeId = records[0].redeId; // Pega a redeId do primeiro registro
        
        if (!redeId) {
            throw new Error("A propriedade 'redeId' é obrigatória em todos os registros para a importação.");
        }

        // Insere todos os registros financeiros
        for (const record of records) {
            const newId = uuidv4();
            await client.query(
                'INSERT INTO financial_records (id, polo, categoria, tipo, parcela, valor_pago, valor_repasse, referencia_mes, referencia_ano, import_id, nome_arquivo, tipo_importacao, sigla_curso, data_importacao, "redeId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14)',
                [newId, record.polo, record.categoria, record.tipo, record.parcela, record.valor_pago, record.valor_repasse, record.referencia_mes, record.referencia_ano, importId, record.nome_arquivo, record.tipo_importacao, record.sigla_curso, record.redeId]
            );
        }
        
        // Insere um único log para a importação
        const firstRecord = records[0];
        if (firstRecord) {
          await client.query(
              'INSERT INTO import_logs (id, import_id, nome_arquivo, total_registros, referencia_mes, referencia_ano, tipo_importacao, data_importacao, "redeId") VALUES ($1, $1, $2, $3, $4, $5, $6, NOW(), $7)',
              [importId, firstRecord.nome_arquivo, records.length, firstRecord.referencia_mes, firstRecord.referencia_ano, firstRecord.tipo_importacao, redeId]
          );
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getFinancialRecordsByImportId(importId: string): Promise<FinancialRecord[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(`SELECT ${financialRecordColumns} FROM financial_records WHERE import_id = $1`, [importId]);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function validateUserCredentials(email: string, password?: string): Promise<Usuario | null> {
    if (!password) return null;
    const client = await pool.connect();
    try {
        const userResult = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = userResult.rows[0];
        if (!user) {
            return null;
        }

        // Securely compare the provided password with the stored hash.
        const isMatch = await bcrypt.compare(password, user.senha);
        
        if (isMatch) {
            return user;
        }
        
        return null;
    } finally {
        client.release();
    }
}

export async function getUserById(userId: string): Promise<Usuario | undefined> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
        return result.rows[0];
    } finally {
        client.release();
    }
}

export async function getAllUsuarios(redeId?: string): Promise<Omit<Usuario, 'senha'>[]> {
    const client = await pool.connect();
    try {
        const query = `
            SELECT 
                u.id, u.nome, u.email, u.funcao, u.status, u."redeId",
                r.nome as rede,
                f.polos,
                u."isSuperadmin"
            FROM usuarios u
            LEFT JOIN redes r ON u."redeId" = r.id
            LEFT JOIN funcoes f ON u.funcao = f.nome AND u."redeId" = f."redeId"
        ` + (redeId ? ' WHERE u."redeId" = $1' : '');
        const params = redeId ? [redeId] : [];
        const result = await client.query(query, params);
        return result.rows.map(row => ({...row, polos: row.polos || []}));
    } finally {
        client.release();
    }
}

export async function saveUsuario(usuario: Partial<Usuario>): Promise<Usuario> {
    const client = await pool.connect();
    try {
        const dataToSave: Partial<Usuario> & { isSuperadmin?: boolean } = { ...usuario };
        delete (dataToSave as any).rede;
        
        if (typeof dataToSave.funcao === 'string') {
            dataToSave.isSuperadmin = dataToSave.funcao === 'Superadmin';
        }
        if (dataToSave.senha) {
            dataToSave.senha = await bcrypt.hash(dataToSave.senha, SALT_ROUNDS);
        }
        if (dataToSave.id) {
            const { id, ...updateFields } = dataToSave;
            delete (updateFields as any).avatarUrl; // Don't try to update avatarUrl
            
            // Explicitly don't try to update the 'polos' column on the 'usuarios' table
            const fieldEntries = Object.entries(updateFields).filter(([key, value]) => value !== undefined);
            
            if (fieldEntries.length === 0) {
                 const currentUser = await getUserById(id);
                 if (!currentUser) throw new Error("User not found");
                 return currentUser;
            }
            const fieldNames = fieldEntries.map(([key], i) => `"${key}"=$${i + 2}`).join(', ');
            const fieldValues = fieldEntries.map(([_, value]) => value);
            const query = `UPDATE usuarios SET ${fieldNames} WHERE id = $1 RETURNING *`;
            const result = await client.query(query, [id, ...fieldValues]);
            return result.rows[0];
        } else {
            const newId = uuidv4();
            const { nome, email, senha, funcao, status, redeId, isSuperadmin } = dataToSave;
            const result = await client.query(
                'INSERT INTO usuarios (id, nome, email, senha, funcao, status, "redeId", "isSuperadmin") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
                [newId, nome, email, senha, funcao, status, redeId, isSuperadmin]
            );
            return result.rows[0];
        }
    } finally {
        client.release();
    }
}


export async function deleteUsuario(id: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM usuarios WHERE id = $1', [id]);
    } finally {
        client.release();
    }
}

const defaultPermissions: UserPermissions = {
    verDashboard: false, gerenciarMatriculas: false, verRelatoriosFinanceiros: false,
    gerenciarCadastrosGerais: false, gerenciarUsuarios: false, realizarImportacoes: false,
    polos: [], isSuperadmin: false, redeId: null
};

export async function getUserPermissionsById(userId: string, userObject?: Usuario): Promise<UserPermissions> {
    const client = await pool.connect();
    try {
        const user = userObject || await getUserById(userId);
        if (!user) return defaultPermissions;

        if (user.isSuperadmin) {
            return {
                verDashboard: true, gerenciarMatriculas: true, verRelatoriosFinanceiros: true,
                gerenciarCadastrosGerais: true, gerenciarUsuarios: true, realizarImportacoes: true,
                polos: null, isSuperadmin: true, redeId: null
            };
        }
        
        let finalPolos: string[] | null = null;
        let finalPermissions: Permissoes = defaultPermissions;

        const funcaoResult = await client.query(
            'SELECT f.permissoes, f.polos as funcaoPolos FROM usuarios u JOIN funcoes f ON u."redeId" = f."redeId" AND u.funcao = f.nome WHERE u.id = $1',
            [userId]
        );

        if (funcaoResult.rows.length > 0) {
            const funcao = funcaoResult.rows[0];
            finalPermissions = { ...defaultPermissions, ...(typeof funcao.permissoes === 'string' ? JSON.parse(funcao.permissoes) : funcao.permissoes) };
            
            if (funcao.funcaopolos && funcao.funcaopolos.length > 0) {
                 finalPolos = funcao.funcaopolos;
            }
        }
        
        if (finalPolos === null) {
            const redes = await getRedes();
            const userRede = redes.find(r => r.id === user.redeId);
            finalPolos = userRede?.polos || [];
        }

        return { ...finalPermissions, polos: finalPolos, isSuperadmin: false, redeId: user.redeId };
    } finally {
        client.release();
    }
}

export async function getFuncoes(redeId?: string): Promise<Funcao[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM funcoes';
        const params: string[] = [];
        if (redeId) {
            query += ' WHERE "redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows.map(row => ({
            ...row,
            permissoes: typeof row.permissoes === 'string' ? JSON.parse(row.permissoes) : row.permissoes || {},
            polos: row.polos || []
        }));
    } finally {
        client.release();
    }
}

export async function saveFuncao(funcao: Partial<Funcao>): Promise<Funcao> {
    const client = await pool.connect();
    try {
        const { ...dataToSave } = funcao;
        const permissions = JSON.stringify(dataToSave.permissoes || {});
        if (!dataToSave.redeId) {
            throw new Error("A rede é obrigatória para salvar uma função.");
        }
        if (dataToSave.id) {
            const result = await client.query(
                'UPDATE funcoes SET nome = $2, permissoes = $3, "redeId" = $4, polos = $5 WHERE id = $1 RETURNING *',
                [dataToSave.id, dataToSave.nome, permissions, dataToSave.redeId, dataToSave.polos || []]
            );
            return result.rows[0];
        } else {
            const newId = uuidv4();
            const result = await client.query(
                'INSERT INTO funcoes (id, nome, permissoes, "redeId", polos) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [newId, dataToSave.nome, permissions, dataToSave.redeId, dataToSave.polos || []]
            );
            return result.rows[0];
        }
    } finally {
        client.release();
    }
}


export async function deleteFuncao(id: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM funcoes WHERE id = $1', [id]);
    } finally {
        client.release();
    }
}

export async function getRedes(): Promise<Rede[]> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM redes');
        return result.rows;
    } finally {
        client.release();
    }
}

export async function saveRede(rede: Partial<Rede>): Promise<Rede> {
    const client = await pool.connect();
    try {
        if (rede.id) {
            const result = await client.query('UPDATE redes SET nome = $2, polos = $3 WHERE id = $1 RETURNING *', [rede.id, rede.nome, rede.polos || []]);
            return result.rows[0];
        } else {
            const newId = uuidv4();
            const result = await client.query('INSERT INTO redes (id, nome, polos) VALUES ($1, $2, $3) RETURNING *', [newId, rede.nome, rede.polos || []]);
            return result.rows[0];
        }
    } finally {
        client.release();
    }
}

export async function deleteRede(id: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM redes WHERE id = $1', [id]);
    } finally {
        client.release();
    }
}

export async function getDistinctValues(permissions: UserPermissions): Promise<any> {
  const client = await pool.connect();
  try {
    let query = 'SELECT DISTINCT polo, categoria, referencia_ano FROM financial_records';
    const values = [];
    
    const whereConditions = [];
    if (permissions.redeId) {
        whereConditions.push(`"redeId" = $${values.length + 1}`);
        values.push(permissions.redeId);
    }
    if (permissions.polos) {
        whereConditions.push(`polo = ANY($${values.length + 1})`);
        values.push(permissions.polos);
    }
    
    if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
    }

    const result = await client.query(query, values);
    
    const poloSet = new Set<string>();
    const categoriaSet = new Set<string>();
    const anoSet = new Set<number>();
    const cidadeSet = new Set<string>();
    const estadoSet = new Set<string>();
    const parsedPolos: { original: string, cidade: string, unidade?: string, estado: string }[] = [];

    result.rows.forEach(r => {
        // Since we are already filtering by permissions in the query, we don't need to double-filter here.
        poloSet.add(r.polo);
        categoriaSet.add(r.categoria);
        anoSet.add(r.referencia_ano);

        const parts = r.polo.split(' - ');
        const cidade = parts[0];
        const estado = parts.length > 1 ? parts[parts.length - 1] : 'N/A';
        const unidade = parts.length > 2 ? parts.slice(1, -1).join(' - ') : undefined;
        
        cidadeSet.add(cidade);
        estadoSet.add(estado);
        parsedPolos.push({ original: r.polo, cidade, estado, unidade });
    });

    return {
      polos: Array.from(poloSet).sort(),
      categorias: Array.from(categoriaSet).sort(),
      anos: Array.from(anoSet).sort((a, b) => b - a),
      cidades: Array.from(cidadeSet).sort(),
      estados: Array.from(estadoSet).sort(),
      parsedPolos,
    };
  } finally {
    client.release();
  }
}

export async function getImports(permissions: UserPermissions): Promise<ImportInfo[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM import_logs';
        const values = [];
        if (permissions.redeId) {
            query += ' WHERE "redeId" = $1';
            values.push(permissions.redeId);
        }
        query += ' ORDER BY data_importacao DESC';
        const result = await client.query(query, values);

        return result.rows;
    } finally {
        client.release();
    }
}

export async function getCanais(redeId?: string): Promise<(Canal & { rede: string })[]> { 
    const client = await pool.connect();
    try {
        let query = 'SELECT c.*, r.nome as rede FROM canais c JOIN redes r ON c."redeId" = r.id';
        const params: string[] = [];
        if(redeId) {
            query += ' WHERE c."redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getCampanhas(redeId?: string): Promise<(Campanha & { rede: string })[]> {
     const client = await pool.connect();
    try {
        let query = 'SELECT c.*, r.nome as rede FROM campanhas c JOIN redes r ON c."redeId" = r.id';
        const params: string[] = [];
        if(redeId) {
            query += ' WHERE c."redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getProcessosSeletivos(redeId?: string): Promise<(ProcessoSeletivo & { rede: string })[]> {
     const client = await pool.connect();
    try {
        let query = 'SELECT ps.*, r.nome as rede FROM processos_seletivos ps JOIN redes r ON ps."redeId" = r.id';
        const params: string[] = [];
        if(redeId) {
            query += ' WHERE ps."redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getTiposCurso(): Promise<TipoCurso[]> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM tipos_curso');
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getCursos(redeId?: string): Promise<Curso[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM cursos';
        const params: string[] = [];
        if(redeId) {
            query += ' WHERE "redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getDespesas(filters: { polo?: string | string[], referencia_ano?: number, referencia_mes?: number }): Promise<Despesa[]> {
    const client = await pool.connect();
    try {
        const conditions: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (filters.polo) {
            const poloList = Array.isArray(filters.polo) ? filters.polo : [filters.polo];
            if (poloList.length > 0) {
                conditions.push(`polo = ANY($${paramIndex++})`);
                values.push(poloList);
            }
        }
        if (filters.referencia_ano) {
            conditions.push(`EXTRACT(YEAR FROM data) = $${paramIndex++}`);
            values.push(filters.referencia_ano);
        }
        if (filters.referencia_mes) {
            conditions.push(`EXTRACT(MONTH FROM data) = $${paramIndex++}`);
            values.push(filters.referencia_mes);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await client.query(`SELECT * FROM despesas ${whereClause}`, values);
        
        return result.rows.map(row => {
            const rowData = new Date(row.data);
            return {
                id: row.id,
                polo: row.polo,
                descricao: row.descricao,
                valor: parseFloat(row.valor),
                categoria: row.categoria,
                referencia_ano: rowData.getFullYear(),
                referencia_mes: rowData.getMonth() + 1,
            };
        });
    } finally {
        client.release();
    }
}

export async function addDespesa(data: Omit<Despesa, 'id'>): Promise<Despesa> {
    const client = await pool.connect();
    try {
        const newId = uuidv4();
        const date = new Date(data.referencia_ano, data.referencia_mes - 1, 15);
        
        const result = await client.query(
            'INSERT INTO despesas (id, polo, data, descricao, valor, categoria) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [newId, data.polo, date, data.descricao, data.valor, data.categoria]
        );
        
        const newRow = result.rows[0];
        const newRowData = new Date(newRow.data);
        return {
            id: newRow.id,
            polo: newRow.polo,
            descricao: newRow.descricao,
            valor: parseFloat(newRow.valor),
            categoria: newRow.categoria,
            referencia_ano: newRowData.getFullYear(),
            referencia_mes: newRowData.getMonth() + 1,
        };
    } finally {
        client.release();
    }
}

export async function deleteDespesa(id: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM despesas WHERE id = $1', [id]);
    } finally {
        client.release();
    }
}

export async function deleteDespesasByPeriod(referencia_ano: number, referencia_mes: number): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM despesas WHERE EXTRACT(YEAR FROM data) = $1 AND EXTRACT(MONTH FROM data) = $2', [referencia_ano, referencia_mes]);
    } finally {
        client.release();
    }
}

export async function clearFinancialRecordsByImportId(importId: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM financial_records WHERE import_id = $1', [importId]);
        await client.query('DELETE FROM import_logs WHERE import_id = $1', [importId]);
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}


export async function deleteFinancialRecord(id: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM financial_records WHERE id = $1', [id]);
    } finally {
        client.release();
    }
}

export async function deleteFinancialRecords(ids: string[]): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM financial_records WHERE id = ANY($1)', [ids]);
    } finally {
        client.release();
    }
}

export async function deleteFinancialRecordsByFilter(filters: Filters): Promise<{ deletedCount: number }> {
    const client = await pool.connect();
    try {
        // We pass null for permissions because the filtering is already handled by the calling function in api.ts
        const whereClause = buildWhereClause(filters, null, null); 
        const query = `DELETE FROM financial_records ${whereClause.text} RETURNING *`;
        const result = await client.query(query, whereClause.values);
        return { deletedCount: result.rowCount || 0 };
    } finally {
        client.release();
    }
}

async function genericSave<T extends { id?: string }>(tableName: string, data: Partial<T>): Promise<T> {
    const client = await pool.connect();
    try {
        if (data.id) {
            const { id, ...updateFields } = data;
            const fieldEntries = Object.entries(updateFields).filter(([_, value]) => value !== undefined);
            const fieldNames = fieldEntries.map(([key], i) => `"${key}"=$${i + 2}`).join(', ');
            const fieldValues = fieldEntries.map(([_, value]) => value);
            const query = `UPDATE ${tableName} SET ${fieldNames} WHERE id = $1 RETURNING *`;
            const result = await client.query(query, [id, ...fieldValues]);
            return result.rows[0];
        } else {
            const newId = uuidv4();
            const { columns, placeholders, values } = Object.entries(data).reduce((acc, [key, value]) => {
                acc.columns.push(`"${key}"`);
                acc.values.push(value);
                acc.placeholders.push(`$${acc.values.length + 1}`);
                return acc;
            }, { columns: ['"id"'], placeholders: ['$1'], values: [newId] as any[] });

            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
            const result = await client.query(query, values);
            return result.rows[0];
        }
    } finally {
        client.release();
    }
}


async function genericDelete(tableName: string, id: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    } finally {
        client.release();
    }
}

export const saveCanal = async (data: Partial<Canal>) => genericSave<Canal>('canais', { ...data });
export const deleteCanal = async (id: string) => genericDelete('canais', id);

export const saveCampanha = async (data: Partial<Campanha>) => genericSave<Campanha>('campanhas', data);
export const deleteCampanha = async (id: string) => genericDelete('campanhas', id);

export const saveProcessoSeletivo = async (data: Partial<ProcessoSeletivo>) => genericSave<ProcessoSeletivo>('processos_seletivos', data);
export const deleteProcessoSeletivo = async (id: string) => genericDelete('processos_seletivos', id);

export const saveNumeroProcessoSeletivo = async (data: Partial<NumeroProcessoSeletivo>) => genericSave<NumeroProcessoSeletivo>('numeros_processo_seletivo', data);
export const deleteNumeroProcessoSeletivo = async (id: string) => genericDelete('numeros_processo_seletivo', id);

export const saveMeta = async (data: Partial<Meta>) => genericSave<Meta>('metas', data);
export const deleteMeta = async (id: string) => genericDelete('metas', id);

export async function saveSpacepoints(processoSeletivo: string, spacepoints: Omit<Spacepoint, 'id' | 'processoSeletivo'>[]): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM spacepoints WHERE "processoSeletivo" = $1', [processoSeletivo]);
        for (const sp of spacepoints) {
            await client.query(
                'INSERT INTO spacepoints (id, "processoSeletivo", date, percentage) VALUES ($1, $2, $3, $4)',
                [uuidv4(), processoSeletivo, sp.date, sp.percentage]
            );
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export const saveTipoCurso = async (data: Partial<TipoCurso>) => genericSave<TipoCurso>('tipos_curso', data);
export const deleteTipoCurso = async (id: string) => genericDelete('tipos_curso', id);


export async function getMetas(): Promise<Meta[]> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM metas');
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getSpacepoints(): Promise<Spacepoint[]> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM spacepoints');
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getAllNumerosProcessoSeletivo(redeId?: string): Promise<(NumeroProcessoSeletivo & { rede: string })[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT ps.*, r.nome as rede FROM numeros_processo_seletivo ps JOIN redes r ON ps."redeId" = r.id';
        const params: string[] = [];
        if (redeId) {
            query += ' WHERE ps."redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function upsertCursos(cursos: Omit<Curso, 'id'>[]): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const redeIdForLog = cursos[0]?.redeId;

        for (const curso of cursos) {
             if (!curso.redeId) {
                console.warn(`Skipping course without redeId: ${curso.sigla}`);
                continue;
            }
            await client.query(
                `INSERT INTO cursos (id, sigla, nome, tipo, sigla_alternativa, "redeId", ativo) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (sigla, "redeId") 
                 DO UPDATE SET 
                    nome = EXCLUDED.nome, 
                    tipo = EXCLUDED.tipo, 
                    sigla_alternativa = EXCLUDED.sigla_alternativa,
                    ativo = EXCLUDED.ativo`,
                [
                    uuidv4(),
                    curso.sigla,
                    curso.nome,
                    curso.tipo,
                    curso.sigla_alternativa || null,
                    curso.redeId,
                    curso.ativo ?? true
                ]
            );
        }

        if (cursos.length > 0 && redeIdForLog) {
             const importId = uuidv4();
            await client.query(
                'INSERT INTO import_logs (id, import_id, total_registros, tipo_importacao, data_importacao, "redeId") VALUES ($1, $1, $2, $3, NOW(), $4)',
                [importId, cursos.length, 'Cursos', redeIdForLog]
            );
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function upsertCurso(data: Curso, originalSigla?: string): Promise<Curso> {
  const client = await pool.connect();
  try {
    const { id, sigla, nome, tipo, sigla_alternativa, ativo, redeId } = data;

    if (!sigla || !redeId) {
        throw new Error("Sigla e Rede são obrigatórios para salvar o curso.");
    }
    
    if (originalSigla && originalSigla !== sigla) {
      const result = await client.query(
        'UPDATE cursos SET sigla = $1, nome = $2, tipo = $3, sigla_alternativa = $4, ativo = $5 WHERE sigla = $6 AND "redeId" = $7 RETURNING *',
        [sigla, nome, tipo, sigla_alternativa, ativo ?? true, originalSigla, redeId]
      );
      if (result.rows.length === 0) {
          throw new Error("Curso a ser atualizado não encontrado ou pertence a outra rede.");
      }
      return result.rows[0];
    } else {
       const result = await client.query(
        `INSERT INTO cursos (id, sigla, nome, tipo, sigla_alternativa, "redeId", ativo) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (sigla, "redeId") 
         DO UPDATE SET 
            nome = EXCLUDED.nome, 
            tipo = EXCLUDED.tipo, 
            sigla_alternativa = EXCLUDED.sigla_alternativa,
            ativo = EXCLUDED.ativo
         RETURNING *`,
        [id || uuidv4(), sigla, nome, tipo, sigla_alternativa || null, redeId, ativo ?? true]
      );
      return result.rows[0];
    }
  } finally {
    client.release();
  }
}

export const deleteCursos = async (siglas: string[], redeId: string) => {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM cursos WHERE sigla = ANY($1) AND "redeId" = $2', [siglas, redeId]);
    } finally {
        client.release();
    }
};

export const deleteCurso = async (sigla: string, redeId: string) => {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM cursos WHERE sigla = $1 AND "redeId" = $2', [sigla, redeId]);
    } finally {
        client.release();
    }
};
