'use server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import type { FinancialRecord, Filters, SummaryData, Usuario, Funcao, Permissoes, Rede, Canal, Campanha, ProcessoSeletivo, NumeroProcessoSeletivo, Meta, Spacepoint, TipoCurso, Curso, Despesa, ImportInfo, UserPermissions, Matricula, MetaUsuario, RankingConfig, RankingMessage, SuperAdminStats, SystemConfig, WhatsAppInstance } from './types';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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

        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;

        const offset = (safePage - 1) * safePageSize;
        const dataQuery = `SELECT ${financialRecordColumns} FROM financial_records ${whereClause.text} ORDER BY data_importacao DESC LIMIT $${whereClause.values.length + 1} OFFSET $${whereClause.values.length + 2}`;
        const result = await client.query(dataQuery, [...whereClause.values, safePageSize, offset]);

        const parsedRecords = result.rows.map(row => ({
            ...row,
            valor_pago: parseFloat(row.valor_pago || '0'),
            valor_repasse: parseFloat(row.valor_repasse || '0'),
        }));

        return { records: parsedRecords, totalCount };
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
// Helper to ensure a polo exists in a rede's polos array
async function ensurePoloExistsInRede(client: any, polo: string, redeId: string) {
    if (!polo || !redeId) return;

    // Check if polo already exists in the rede
    const result = await client.query(
        'SELECT 1 FROM redes WHERE id = $1 AND $2 = ANY(polos)',
        [redeId, polo]
    );

    if (result.rows.length === 0) {
        // Add polo to the array if it doesn't exist
        await client.query(
            'UPDATE redes SET polos = array_append(polos, $2) WHERE id = $1',
            [redeId, polo]
        );
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
            await ensurePoloExistsInRede(client, record.polo, redeId);
            await client.query(
                'INSERT INTO financial_records (id, polo, categoria, tipo, parcela, valor_pago, valor_repasse, referencia_mes, referencia_ano, import_id, nome_arquivo, tipo_importacao, sigla_curso, data_importacao, "redeId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14)',
                [newId, record.polo, record.categoria, record.tipo, record.parcela, record.valor_pago, record.valor_repasse, record.referencia_mes, record.referencia_ano, importId, record.nome_arquivo, record.tipo_importacao, record.sigla_curso, redeId]
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
        const result = await client.query(`
            SELECT u.*, r.nome as rede 
            FROM usuarios u 
            LEFT JOIN redes r ON u."redeId" = r.id 
            WHERE u.id = $1
        `, [userId]);
        return result.rows[0];
    } finally {
        client.release();
    }
}

export async function getAllUsuarios(redeId?: string, excludeSuperadmins: boolean = false): Promise<Omit<Usuario, 'senha'>[]> {
    const client = await pool.connect();
    try {
        let whereConditions: string[] = [];
        const params: string[] = [];
        let paramIndex = 1;

        if (redeId) {
            whereConditions.push(`u."redeId" = $${paramIndex}`);
            params.push(redeId);
            paramIndex++;
        }

        if (excludeSuperadmins) {
            whereConditions.push(`u."isSuperadmin" = FALSE`);
        }

        const whereClause = whereConditions.length > 0 ? ' WHERE ' + whereConditions.join(' AND ') : '';

        const query = `
            SELECT 
                u.id, u.nome, u.email, u.funcao, u.status, u."redeId",
                u."avatarUrl",
                r.nome as rede,
                f.polos,
                u."isSuperadmin"
            FROM usuarios u
            LEFT JOIN redes r ON u."redeId" = r.id
            LEFT JOIN funcoes f ON u.funcao = f.nome AND u."redeId" = f."redeId"
        ` + whereClause;

        const result = await client.query(query, params);
        return result.rows.map(row => ({ ...row, polos: row.polos || [] }));
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
            const { nome, email, senha, funcao, status, redeId, isSuperadmin, polos, avatarUrl } = dataToSave;
            const result = await client.query(
                'INSERT INTO usuarios (id, nome, email, senha, funcao, status, "redeId", "isSuperadmin", polos, "avatarUrl") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
                [newId, nome, email, senha, funcao, status, redeId, isSuperadmin, polos, avatarUrl]
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
    verRanking: false,
    gerenciarWhatsapp: false,
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
                verRanking: true,
                gerenciarWhatsapp: true,
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

            // Ensure verRanking is present if missing from DB JSON
            if (finalPermissions.verRanking === undefined) finalPermissions.verRanking = false;

            if (funcao.funcaopolos && funcao.funcaopolos.length > 0) {
                finalPolos = funcao.funcaopolos;
            }
        }

        if (finalPolos === null) {
            const redes = await getRedes();
            const userRede = redes.find(r => r.id === user.redeId);
            finalPolos = userRede?.polos || [];

            // Enforce Network Modules Logic
            // If the network has specific modules enabled, we must filter the user's permissions accordingly.
            // If modulos is empty/null, we assume legacy behavior (all enabled) OR we could be strict. 
            // Given the user wants "modules", we should be strict if modulos exists.
            if (userRede && userRede.modulos && userRede.modulos.length > 0) {
                const modulos = userRede.modulos;
                const moduleMap: Record<string, string[]> = {
                    'dashboard': ['verDashboard', 'verRelatoriosFinanceiros'],
                    'matriculas': ['gerenciarMatriculas', 'realizarImportacoes'],
                    'financeiro': ['verRelatoriosFinanceiros'],
                    'cadastros': ['gerenciarCadastrosGerais', 'gerenciarUsuarios'],
                    'ranking': ['verRanking'],
                    'whatsapp': ['gerenciarWhatsapp']
                };

                // Calculate set of allowed permissions based on enabled modules
                const allowedPermissions = new Set<string>();
                modulos.forEach(mod => {
                    moduleMap[mod]?.forEach(p => allowedPermissions.add(p));
                });

                // Overwrite permissions that are not allowed
                (Object.keys(finalPermissions) as (keyof Permissoes)[]).forEach(key => {
                    // If the permission is required by a module system (i.e. it exists in our map values),
                    // check if it's allowed. If it's a permission NOT in the map (legacy?), maybe keep it?
                    // For safety, if it's in the map structure but not allowed, set to false.
                    const isControlledPermission = Object.values(moduleMap).flat().includes(key);
                    if (isControlledPermission && !allowedPermissions.has(key)) {
                        finalPermissions[key] = false;
                    }
                });
            }
        }

        return { ...finalPermissions, polos: finalPolos, isSuperadmin: false, redeId: user.redeId };
    } finally {
        client.release();
    }
}





export async function getFinancialYears(redeId: string): Promise<number[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT DISTINCT referencia_ano FROM financial_records WHERE "redeId" = $1 ORDER BY referencia_ano DESC',
            [redeId]
        );
        return result.rows.map(r => r.referencia_ano);
    } finally {
        client.release();
    }
}

export async function getDistinctProcessos(redeId: string): Promise<ProcessoSeletivo[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM processos_seletivos WHERE "redeId" = $1 ORDER BY numero DESC',
            [redeId]
        );
        return result.rows.map(r => ({
            ...r,
            dataInicial: new Date(r.dataInicial),
            dataFinal: new Date(r.dataFinal)
        }));
    } finally {
        client.release();
    }
}


export async function getFuncoes(redeId?: string): Promise<Funcao[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT *, "verRanking" FROM funcoes';
        const params: string[] = [];
        if (redeId) {
            query += ' WHERE "redeId" = $1';
            params.push(redeId);
        }

        const [result, redesResult] = await Promise.all([
            client.query(query, params),
            redeId ? client.query('SELECT modulos FROM redes WHERE id = $1', [redeId]) : Promise.resolve({ rows: [] })
        ]);

        const redeModulos = redesResult.rows[0]?.modulos || [];
        const hasModules = redeId && redeModulos.length > 0;

        const moduleMap: Record<string, string[]> = {
            'dashboard': ['verDashboard', 'verRelatoriosFinanceiros'],
            'matriculas': ['gerenciarMatriculas', 'realizarImportacoes'],
            'financeiro': ['verRelatoriosFinanceiros'],
            'cadastros': ['gerenciarCadastrosGerais', 'gerenciarUsuarios'],
            'ranking': ['verRanking'],
            'whatsapp': ['gerenciarWhatsapp']
        };

        const allowedPermissions = new Set<string>();
        if (hasModules) {
            redeModulos.forEach((mod: string) => {
                moduleMap[mod]?.forEach(p => allowedPermissions.add(p));
            });
        }

        return result.rows.map(row => {
            let permissoes = typeof row.permissoes === 'string' ? JSON.parse(row.permissoes) : row.permissoes;
            // Ensure object structure if null
            if (!permissoes) permissoes = {};

            // If modules are active, strict filter permissions
            if (hasModules) {
                (Object.keys(permissoes) as (keyof Permissoes)[]).forEach(key => {
                    const isControlled = Object.values(moduleMap).flat().includes(key);
                    if (isControlled && !allowedPermissions.has(key)) {
                        permissoes[key] = false;
                    }
                });
            }

            return {
                id: row.id,
                nome: row.nome,
                permissoes,
                redeId: row.redeId,
                polos: row.polos
            };
        });
    } finally {
        client.release();
    }
}

export async function saveFuncao(data: Partial<Funcao>): Promise<Funcao> {
    const client = await pool.connect();
    try {
        const permissoes = JSON.stringify(data.permissoes);
        const { id, nome, redeId, polos } = data;

        if (id) {
            const result = await client.query(
                'UPDATE funcoes SET nome = $1, permissoes = $2, "redeId" = $3, polos = $4 WHERE id = $5 RETURNING *',
                [nome, permissoes, redeId, polos, id]
            );
            const row = result.rows[0];
            return {
                id: row.id,
                nome: row.nome,
                permissoes: typeof row.permissoes === 'string' ? JSON.parse(row.permissoes) : row.permissoes,
                redeId: row.redeId,
                polos: row.polos
            };
        } else {
            const newId = uuidv4();
            const result = await client.query(
                'INSERT INTO funcoes (id, nome, permissoes, "redeId", polos) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [newId, nome, permissoes, redeId, polos]
            );
            const row = result.rows[0];
            return {
                id: row.id,
                nome: row.nome,
                permissoes: typeof row.permissoes === 'string' ? JSON.parse(row.permissoes) : row.permissoes,
                redeId: row.redeId,
                polos: row.polos
            };
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

export async function getRedeById(id: string): Promise<Rede | null> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM redes WHERE id = $1', [id]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function saveRede(rede: Partial<Rede>): Promise<Rede> {
    const client = await pool.connect();
    try {
        if (rede.id) {
            const result = await client.query(
                'UPDATE redes SET nome = $2, polos = $3, modulos = $4 WHERE id = $1 RETURNING *',
                [rede.id, rede.nome, rede.polos || [], rede.modulos || []]
            );
            return result.rows[0];
        } else {
            const newId = uuidv4();
            const result = await client.query(
                'INSERT INTO redes (id, nome, polos, modulos) VALUES ($1, $2, $3, $4) RETURNING *',
                [newId, rede.nome, rede.polos || [], rede.modulos || []]
            );

            // Create default "Admin" role for this new network
            const adminRoleId = uuidv4();
            const adminPermissions = {
                verDashboard: true,
                gerenciarMatriculas: true,
                verRelatoriosFinanceiros: true,
                gerenciarCadastrosGerais: true,
                gerenciarUsuarios: true,
                realizarImportacoes: true,
                verRanking: true,
                gerenciarWhatsapp: true
            };

            await client.query(
                'INSERT INTO funcoes (id, nome, permissoes, "redeId", polos) VALUES ($1, $2, $3, $4, $5)',
                [adminRoleId, 'Admin', JSON.stringify(adminPermissions), newId, []]
            );

            return result.rows[0];
        }
    } finally {
        client.release();
    }
}

export async function deleteRede(id: string): Promise<void> {
    // Security: Prevent deletion of default network (protects superadmins)
    if (id === 'rede_default') {
        throw new Error('A rede padrão não pode ser excluída pois protege as contas de superadmin.');
    }

    const client = await pool.connect();
    try {
        // Check if there are superadmins in this network
        const superadminCheck = await client.query(
            'SELECT COUNT(*) as count FROM usuarios WHERE "redeId" = $1 AND "isSuperadmin" = TRUE',
            [id]
        );

        if (parseInt(superadminCheck.rows[0].count) > 0) {
            throw new Error('Esta rede contém superadmins. Não é possível excluir.');
        }

        await client.query('DELETE FROM redes WHERE id = $1', [id]);
    } finally {
        client.release();
    }
}

export async function getDistinctValuesForRanking(redeId: string): Promise<any> {
    // Reusing the logic by simulating permissions for the given redeId
    return getDistinctValues({
        verDashboard: true,
        gerenciarMatriculas: true,
        verRelatoriosFinanceiros: true,
        gerenciarCadastrosGerais: true,
        gerenciarUsuarios: true,
        realizarImportacoes: true,
        verRanking: true,
        gerenciarWhatsapp: true,
        polos: null, // Allow all polos for the ranking filter options
        isSuperadmin: false,
        redeId: redeId
    });
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

        // Add poles defined in the network
        if (permissions.redeId) {
            const redeResult = await client.query('SELECT unnest(polos) as polo FROM redes WHERE id = $1', [permissions.redeId]);
            redeResult.rows.forEach(r => {
                if (!permissions.polos || permissions.polos.includes(r.polo)) {
                    poloSet.add(r.polo);
                }
            });
        }

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

        const distinctPolos = Array.from(new Set(result.rows.map(row => row.polo))).sort();
        const distinctCategorias = Array.from(new Set(result.rows.map(row => row.categoria))).sort();
        const distinctAnos = Array.from(new Set(result.rows.map(row => row.referencia_ano))).sort((a, b) => b - a);
        const distinctCidades = Array.from(new Set(result.rows.map(row => row.polo.split(' - ')[0]))).sort();

        let distinctProcessos: ProcessoSeletivo[] = [];
        if (permissions.redeId) {
            distinctProcessos = await getDistinctProcessos(permissions.redeId);
        }

        return {
            polos: distinctPolos,
            categorias: distinctCategorias,
            anos: distinctAnos,
            cidades: distinctCidades,
            estados: Array.from(estadoSet).sort(),
            processos: distinctProcessos,
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
        if (redeId) {
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
        if (redeId) {
            query += ' WHERE c."redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}



export async function getTiposCurso(redeId?: string): Promise<TipoCurso[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM tipos_curso';
        const params: string[] = [];
        if (redeId) {
            query += ' WHERE "redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
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
        if (redeId) {
            query += ' WHERE "redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getDespesas(filters: { polo?: string | string[], referencia_ano?: number, referencia_mes?: number, redeId?: string }): Promise<Despesa[]> {
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
        if (filters.redeId) {
            conditions.push(`"redeId" = $${paramIndex++}`);
            values.push(filters.redeId);
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
                referencia_ano: rowData.getFullYear(),
                referencia_mes: rowData.getMonth() + 1,
                tipo_despesa: row.tipo_despesa,
                sigla_curso: row.sigla_curso,
                nicho_curso: row.nicho_curso,
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
            'INSERT INTO despesas (id, polo, data, descricao, valor, tipo_despesa, sigla_curso, nicho_curso, "redeId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [newId, data.polo, date, data.descricao, data.valor, data.tipo_despesa, data.sigla_curso, data.nicho_curso, data.redeId]
        );

        const newRow = result.rows[0];
        const newRowData = new Date(newRow.data);
        return {
            id: newRow.id,
            polo: newRow.polo,
            referencia_ano: newRowData.getFullYear(),
            referencia_mes: newRowData.getMonth() + 1,
            tipo_despesa: newRow.tipo_despesa,
            sigla_curso: newRow.sigla_curso,
            nicho_curso: newRow.nicho_curso,
            descricao: newRow.descricao,
            valor: parseFloat(newRow.valor),
            redeId: newRow.redeId,
        };
    } finally {
        client.release();
    }
}

export async function deleteDespesa(id: string, redeId: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM despesas WHERE id = $1 AND "redeId" = $2', [id, redeId]);
    } finally {
        client.release();
    }
}

export async function deleteDespesasByPeriod(referencia_ano: number, referencia_mes: number, redeId: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM despesas WHERE EXTRACT(YEAR FROM data) = $1 AND EXTRACT(MONTH FROM data) = $2 AND "redeId" = $3', [referencia_ano, referencia_mes, redeId]);
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

export async function deleteFinancialRecordsByFilter(filters: Filters, permissions: UserPermissions): Promise<{ deletedCount: number }> {
    const client = await pool.connect();
    try {
        const whereClause = buildWhereClause(filters, permissions.polos, permissions.redeId);
        const query = `DELETE FROM financial_records ${whereClause.text} RETURNING *`;
        const result = await client.query(query, whereClause.values);
        return { deletedCount: result.rowCount || 0 };
    } finally {
        client.release();
    }
}

async function genericSave<T extends { id?: string, redeId?: string }>(tableName: string, data: Partial<T>): Promise<T> {
    const client = await pool.connect();
    try {
        if (data.id) {
            const { id, ...updateFields } = data;
            const fieldEntries = Object.entries(updateFields).filter(([_, value]) => value !== undefined);
            const fieldNames = fieldEntries.map(([key], i) => `"${key}"=$${i + 2}`).join(', ');
            const fieldValues = fieldEntries.map(([_, value]) => value);

            if ((data as any).polo && (data as any).redeId) {
                await ensurePoloExistsInRede(client, (data as any).polo, (data as any).redeId);
            }

            // Should verify redeId ownership here if strict security needed, but for now we trust the caller passes correct redeId
            const query = `UPDATE ${tableName} SET ${fieldNames} WHERE id = $1 RETURNING *`;
            const result = await client.query(query, [id, ...fieldValues]);
            return result.rows[0];
        } else {
            const newId = uuidv4();
            const { columns, placeholders, values } = Object.entries(data).reduce((acc, [key, value]) => {
                if (key === 'id' || value === undefined) return acc;
                acc.columns.push(`"${key}"`);
                acc.values.push(value);
                acc.placeholders.push(`$${acc.values.length}`);
                return acc;
            }, { columns: ['"id"'], placeholders: ['$1'], values: [newId] as any[] });

            if ((data as any).polo && (data as any).redeId) {
                await ensurePoloExistsInRede(client, (data as any).polo, (data as any).redeId);
            }

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

export async function getProcessosSeletivos(redeId?: string): Promise<(ProcessoSeletivo & { rede: string })[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT ps.*, r.nome as rede FROM processos_seletivos ps JOIN redes r ON ps."redeId" = r.id';
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

export const saveNumeroProcessoSeletivo = async (data: Partial<NumeroProcessoSeletivo>) => genericSave<NumeroProcessoSeletivo>('numeros_processo_seletivo', data);
export const deleteNumeroProcessoSeletivo = async (id: string) => genericDelete('numeros_processo_seletivo', id);

export const saveMeta = async (data: Partial<Meta>) => genericSave<Meta>('metas', data);
export const deleteMeta = async (id: string) => genericDelete('metas', id);

export async function saveSpacepoints(processoSeletivo: string, spacepoints: Omit<Spacepoint, 'id' | 'processoSeletivo' | 'redeId'>[], redeId: string, polo?: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Delete existing spacepoints for this processoSeletivo, redeId and polo
        const deleteQuery = polo
            ? 'DELETE FROM spacepoints WHERE "processoSeletivo" = $1 AND "redeId" = $2 AND "polo" = $3'
            : 'DELETE FROM spacepoints WHERE "processoSeletivo" = $1 AND "redeId" = $2 AND "polo" IS NULL';
        const deleteParams = polo ? [processoSeletivo, redeId, polo] : [processoSeletivo, redeId];
        await client.query(deleteQuery, deleteParams);

        for (const sp of spacepoints) {
            await client.query(
                `INSERT INTO spacepoints (
                    id, 
                    "processoSeletivo", 
                    "redeId",
                    "numeroSpace",
                    "dataSpace", 
                    "metasPorTipo",
                    "metaTotal",
                    "polo",
                    "criadoEm"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                [
                    uuidv4(),
                    processoSeletivo,
                    redeId,
                    sp.numeroSpace,
                    sp.dataSpace,
                    JSON.stringify(sp.metasPorTipo),
                    sp.metaTotal,
                    polo || null
                ]
            );

            // Sync dates for all other polos of the same process and space number
            await client.query(
                'UPDATE spacepoints SET "dataSpace" = $1 WHERE "processoSeletivo" = $2 AND "redeId" = $3 AND "numeroSpace" = $4',
                [sp.dataSpace, processoSeletivo, redeId, sp.numeroSpace]
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

export async function deleteSpacepoints(processoSeletivo: string, redeId: string, polo?: string): Promise<void> {
    const client = await pool.connect();
    try {
        let query = '';
        let params = [];

        if (polo === 'all') {
            // Delete from ALL polos in the network for this process
            query = 'DELETE FROM spacepoints WHERE "processoSeletivo" = $1 AND "redeId" = $2';
            params = [processoSeletivo, redeId];
        } else if (polo) {
            query = 'DELETE FROM spacepoints WHERE "processoSeletivo" = $1 AND "redeId" = $2 AND "polo" = $3';
            params = [processoSeletivo, redeId, polo];
        } else {
            query = 'DELETE FROM spacepoints WHERE "processoSeletivo" = $1 AND "redeId" = $2 AND "polo" IS NULL';
            params = [processoSeletivo, redeId];
        }
        await client.query(query, params);
    } finally {
        client.release();
    }
}

export async function syncSpacepointsStructure(redeId: string, processoId: string, milestones: { numeroSpace: number, dataSpace: Date }[]): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get all allowed space numbers
        const activeSpaceNumbers = milestones.map(m => m.numeroSpace);

        // 2. DELETE any spacepoint for this process/network that ISN'T in the master list
        // This ensures that if a space was removed from the target list, it's removed from ALL polos
        if (activeSpaceNumbers.length > 0) {
            await client.query(
                'DELETE FROM spacepoints WHERE "processoSeletivo" = $1 AND "redeId" = $2 AND "numeroSpace" != ALL($3)',
                [processoId, redeId, activeSpaceNumbers]
            );
        } else {
            // If milestones is empty, clear everything for this process/network
            await client.query(
                'DELETE FROM spacepoints WHERE "processoSeletivo" = $1 AND "redeId" = $2',
                [processoId, redeId]
            );
        }

        // 3. Get all polos from the network to ensure they all have the structure
        const redeResult = await client.query('SELECT polos FROM redes WHERE id = $1', [redeId]);
        const polos = redeResult.rows[0]?.polos || [];

        for (const polo of polos) {
            for (const ms of milestones) {
                // Check if record exists for this polo and space number
                const existing = await client.query(
                    'SELECT id FROM spacepoints WHERE "processoSeletivo" = $1 AND "redeId" = $2 AND "polo" = $3 AND "numeroSpace" = $4',
                    [processoId, redeId, polo, ms.numeroSpace]
                );

                if (existing.rows.length > 0) {
                    // Update date to keep synced
                    await client.query(
                        'UPDATE spacepoints SET "dataSpace" = $1 WHERE id = $2',
                        [ms.dataSpace, existing.rows[0].id]
                    );
                } else {
                    // Create with meta 0
                    const emptyMetas = {};
                    await client.query(
                        `INSERT INTO spacepoints (
                            id, "processoSeletivo", "redeId", "numeroSpace", "dataSpace", "metasPorTipo", "metaTotal", "polo", "criadoEm"
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                        [uuidv4(), processoId, redeId, ms.numeroSpace, ms.dataSpace, JSON.stringify(emptyMetas), 0, polo]
                    );
                }
            }
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

export async function upsertTipoCurso(data: { nome: string, sigla: string, ativo: boolean, redeId: string }): Promise<TipoCurso> {
    const client = await pool.connect();
    try {
        // Use a manual UPSERT logic to avoid requiring ALTER TABLE (DDL) or specific UNIQUE constraints
        // This is safer for production users with restricted permissions.
        const existing = await client.query(
            'SELECT * FROM tipos_curso WHERE nome = $1 AND "redeId" = $2',
            [data.nome, data.redeId]
        );

        if (existing.rows.length > 0) {
            const result = await client.query(
                `UPDATE tipos_curso SET 
                    sigla = $1,
                    ativo = $2
                 WHERE id = $3
                 RETURNING *`,
                [data.sigla, data.ativo, existing.rows[0].id]
            );
            return result.rows[0];
        } else {
            const result = await client.query(
                `INSERT INTO tipos_curso (id, nome, sigla, ativo, "redeId")
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [uuidv4(), data.nome, data.sigla, data.ativo, data.redeId]
            );
            return result.rows[0];
        }
    } finally {
        client.release();
    }
}
export const deleteTipoCurso = async (id: string) => genericDelete('tipos_curso', id);


export async function getMetas(redeId?: string): Promise<Meta[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM metas';
        const params: string[] = [];
        if (redeId) {
            query += ' WHERE "redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getMetasUsuarios(redeId: string, processoId?: string, usuarioId?: string): Promise<MetaUsuario[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM metas_usuarios WHERE "redeId" = $1';
        const params: any[] = [redeId];
        let paramIndex = 2;

        if (processoId) {
            query += ` AND "processoId" = $${paramIndex++}`;
            params.push(processoId);
        }
        if (usuarioId) {
            query += ` AND "usuarioId" = $${paramIndex++}`;
            params.push(usuarioId);
        }

        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function saveMetasUsuarios(redeId: string, usuarioId: string, processoId: string, metas: { numeroSemana: number, metaQtd: number }[]): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const meta of metas) {
            await client.query(
                `INSERT INTO metas_usuarios (id, "usuarioId", "processoId", "numeroSemana", "metaQtd", "redeId")
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT ("usuarioId", "processoId", "numeroSemana", "redeId")
                 DO UPDATE SET "metaQtd" = EXCLUDED."metaQtd"`,
                [uuidv4(), usuarioId, processoId, meta.numeroSemana, meta.metaQtd, redeId]
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

export async function saveGlobalMetasUsuarios(redeId: string, processoId: string, metas: { numeroSemana: number, metaQtd: number }[]): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get all users for this rede (excluding superadmins)
        const usersResult = await client.query('SELECT id FROM usuarios WHERE "redeId" = $1 AND "isSuperadmin" = FALSE', [redeId]);
        const userIds = usersResult.rows.map(r => r.id);

        for (const userId of userIds) {
            for (const meta of metas) {
                await client.query(
                    `INSERT INTO metas_usuarios (id, "usuarioId", "processoId", "numeroSemana", "metaQtd", "redeId")
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT ("usuarioId", "processoId", "numeroSemana", "redeId")
                     DO UPDATE SET "metaQtd" = EXCLUDED."metaQtd"`,
                    [uuidv4(), userId, processoId, meta.numeroSemana, meta.metaQtd, redeId]
                );
            }
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getSpacepoints(redeId?: string): Promise<Spacepoint[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM spacepoints';
        const params: any[] = [];

        if (redeId) {
            query += ' WHERE "redeId" = $1';
            params.push(redeId);
        }

        query += ' ORDER BY "dataSpace"';

        const result = await client.query(query, params);
        return result.rows.map(row => ({
            ...row,
            dataSpace: new Date(row.dataSpace), // Ensure Date object
            // Ensure numbers
            numeroSpace: Number(row.numeroSpace),
            metaTotal: Number(row.metaTotal),
            metasPorTipo: row.metasPorTipo || {},
            polo: row.polo || undefined
        }));
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


export async function upsertCursos(cursos: Omit<Curso, 'id'>[], redeId: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const curso of cursos) {
            await client.query(
                `INSERT INTO cursos (id, sigla, nome, tipo, "tipoCursoId", sigla_alternativa, nicho, ativo, "redeId") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (sigla, "redeId") 
                 DO UPDATE SET 
                    nome = EXCLUDED.nome, 
                    tipo = EXCLUDED.tipo, 
                    "tipoCursoId" = COALESCE(EXCLUDED."tipoCursoId", cursos."tipoCursoId"),
                    sigla_alternativa = COALESCE(EXCLUDED.sigla_alternativa, cursos.sigla_alternativa),
                    nicho = EXCLUDED.nicho,
                    ativo = EXCLUDED.ativo`,
                [
                    uuidv4(),
                    curso.sigla,
                    curso.nome,
                    curso.tipo,
                    curso.tipoCursoId || null,
                    curso.sigla_alternativa || null,
                    curso.nicho || null,
                    curso.ativo ?? true,
                    redeId
                ]
            );
        }

        if (cursos.length > 0) {
            const importId = uuidv4();
            await client.query(
                'INSERT INTO import_logs (id, import_id, total_registros, tipo_importacao, data_importacao, "redeId") VALUES ($1, $1, $2, $3, NOW(), $4)',
                [importId, cursos.length, 'Cursos', redeId]
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
        const { id, sigla, nome, tipo, sigla_alternativa, nicho, ativo, redeId } = data;

        if (!sigla) {
            throw new Error("A sigla é obrigatória para salvar o curso.");
        }

        if (!redeId) {
            throw new Error("O redeId é obrigatório para salvar o curso.");
        }

        if (originalSigla && originalSigla !== sigla) {
            const result = await client.query(
                'UPDATE cursos SET sigla = $1, nome = $2, tipo = $3, "tipoCursoId" = $4, sigla_alternativa = $5, nicho = $6, ativo = $7 WHERE sigla = $8 AND "redeId" = $9 RETURNING *',
                [sigla, nome, tipo, data.tipoCursoId || null, sigla_alternativa, nicho, ativo ?? true, originalSigla, redeId]
            );
            if (result.rows.length === 0) {
                throw new Error("Curso a ser atualizado não encontrado.");
            }
            return result.rows[0];
        } else {
            const result = await client.query(
                `INSERT INTO cursos (id, sigla, nome, tipo, "tipoCursoId", sigla_alternativa, nicho, ativo, "redeId") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (sigla, "redeId") 
         DO UPDATE SET 
            nome = EXCLUDED.nome, 
            tipo = EXCLUDED.tipo, 
            "tipoCursoId" = EXCLUDED."tipoCursoId",
            sigla_alternativa = EXCLUDED.sigla_alternativa,
            nicho = EXCLUDED.nicho,
            ativo = EXCLUDED.ativo
         RETURNING *`,
                [id || uuidv4(), sigla, nome, tipo, data.tipoCursoId || null, sigla_alternativa || null, nicho || null, ativo ?? true, redeId]
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



// ==========================================================================
// MATRICULAS
// ==========================================================================

export const getMatriculas = async (redeId: string): Promise<Matricula[]> => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT m.*, u.nome as "usuarioNome"
             FROM matriculas m
             LEFT JOIN usuarios u ON m."usuarioId" = u.id
             WHERE m."redeId" = $1
             ORDER BY m."dataMatricula" DESC`,
            [redeId]
        );
        return result.rows.map(row => ({
            ...row,
            primeiraMensalidade: row.primeiraMensalidade ? parseFloat(row.primeiraMensalidade) : 0,
            segundaMensalidade: row.segundaMensalidade ? parseFloat(row.segundaMensalidade) : 0,
            bolsaGestor: row.bolsaGestor ? parseFloat(row.bolsaGestor) : 0
        }));
    } finally {
        client.release();
    }
};

export const saveMatricula = async (data: Partial<Matricula>) => genericSave<Matricula>('matriculas', data);

export type RankingItem = {
    userId: string;
    nome: string;
    avatarUrl?: string; // If we add avatars later
    count: number;
    position: number;
};

export async function getEnrollmentRanking(
    redeId: string,
    period: 'today' | 'month' | 'campaign',
    filters?: {
        polos?: string[],
        processoId?: string,
        date?: string
    },
    campaignId?: string
): Promise<RankingItem[]> {
    const client = await pool.connect();
    try {
        let dateFilter = '';
        const params: any[] = [redeId];
        let paramIndex = 2;

        if (period === 'today') {
            dateFilter = `AND DATE("dataMatricula") = CURRENT_DATE`;
        } else if (period === 'month') {
            dateFilter = `AND EXTRACT(MONTH FROM "dataMatricula") = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM "dataMatricula") = EXTRACT(YEAR FROM CURRENT_DATE)`;
        } else if (period === 'campaign' && campaignId) {
            dateFilter = `AND "campanhaId" = $${paramIndex++}`;
            params.push(campaignId);
        }

        // Apply additional filters
        if (filters?.date) {
            // override any period filter if specific date is provided
            dateFilter = `AND DATE("dataMatricula") = $${paramIndex++}`;
            params.push(filters.date);
        }

        if (filters?.polos && filters.polos.length > 0) {
            dateFilter += ` AND m.polo = ANY($${paramIndex++})`;
            params.push(filters.polos);
        }

        if (filters?.processoId && filters.processoId !== 'all') {
            dateFilter += ` AND m."processoSeletivoId" = $${paramIndex++}`;
            params.push(filters.processoId);
        }

        const query = `
            SELECT 
                u.id as "userId",
                u.nome,
                u."avatarUrl",
                COUNT(m.id) as count
            FROM matriculas m
            JOIN usuarios u ON m."usuarioId" = u.id
            WHERE m."redeId" = $1 ${dateFilter}
            GROUP BY u.id, u.nome, u."avatarUrl"
            ORDER BY count DESC
        `;

        const result = await client.query(query, params);

        return result.rows.map((row, index) => ({
            userId: row.userId,
            nome: row.nome,
            avatarUrl: row.avatarUrl,
            count: parseInt(row.count, 10),
            position: index + 1
        }));
    } finally {
        client.release();
    }
}

export type DailyStats = {
    total: number;
    byType: { name: string; count: number }[];
    byPolo: {
        polo: string;
        total: number;
        users: {
            nome: string;
            count: number;
            types: string[];
        }[];
    }[];
};

export async function getEnrollmentStats(
    redeId: string,
    period: 'today' | 'month' | 'campaign' = 'today',
    filters?: {
        polos?: string[],
        processoId?: string,
        date?: string
    },
    campaignId?: string
): Promise<DailyStats> {
    const client = await pool.connect();
    try {
        let dateFilter = '';
        const params: any[] = [redeId];
        let paramIndex = 2;

        if (period === 'today') {
            dateFilter = `AND DATE("dataMatricula") = CURRENT_DATE`;
        } else if (period === 'month') {
            dateFilter = `AND EXTRACT(MONTH FROM "dataMatricula") = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM "dataMatricula") = EXTRACT(YEAR FROM CURRENT_DATE)`;
        } else if (period === 'campaign' && campaignId) {
            dateFilter = `AND "campanhaId" = $${paramIndex++}`;
            params.push(campaignId);
        }

        // Apply additional filters
        if (filters?.date) {
            dateFilter = `AND DATE("dataMatricula") = $${paramIndex++}`;
            params.push(filters.date);
        }

        if (filters?.polos && filters.polos.length > 0) {
            dateFilter += ` AND polo = ANY($${paramIndex++})`;
            params.push(filters.polos);
        }

        if (filters?.processoId && filters.processoId !== 'all') {
            dateFilter += ` AND "processoSeletivoId" = $${paramIndex++}`;
            params.push(filters.processoId);
        }

        // Query to get Total counts by Type (including zeros)
        const typeQuery = `
            SELECT 
                tc.nome as tipo_nome,
                COUNT(m.id) as count
            FROM tipos_curso tc
            LEFT JOIN matriculas m ON tc.id = m."tipoCursoId" AND m."redeId" = tc."redeId" ${dateFilter}
            WHERE tc."redeId" = $1
            GROUP BY tc.nome
            ORDER BY count DESC, tc.nome ASC
        `;

        // Query to get detailed breakdown: Polo -> User -> Type
        const detailQuery = `
            SELECT 
                m.polo,
                u.nome as user_nome,
                tc.nome as tipo_nome
            FROM matriculas m
            LEFT JOIN usuarios u ON m."usuarioId" = u.id
            LEFT JOIN tipos_curso tc ON m."tipoCursoId" = tc.id
            WHERE m."redeId" = $1 ${dateFilter}
        `;

        const [typeResult, detailResult] = await Promise.all([
            client.query(typeQuery, params),
            client.query(detailQuery, params)
        ]);

        // Process Global Type Stats
        let total = 0;
        const byType = typeResult.rows.map(row => {
            const count = parseInt(row.count, 10);
            total += count;
            return { name: row.tipo_nome || 'Outros', count };
        });

        // Helper to map type name to abbreviation
        const getAbbr = (name: string) => {
            if (!name) return '?';
            const n = name.toLowerCase();
            if (n.includes('gradua')) return 'G';
            if (n.includes('pós') || n.includes('pos')) return 'P';
            if (n.includes('semi')) return 'S';
            if (n.includes('téc') || n.includes('tec')) return 'T';
            if (n.includes('prof')) return 'PR';
            return name.substring(0, 1).toUpperCase();
        };

        // Process Hierarchical Stats: Polo -> User -> Types
        const poloMap = new Map<string, Map<string, string[]>>();

        detailResult.rows.forEach(row => {
            const polo = row.polo || 'Sem Polo';
            const user = row.user_nome || 'Desconhecido';
            const type = getAbbr(row.tipo_nome);

            if (!poloMap.has(polo)) {
                poloMap.set(polo, new Map());
            }

            const userMap = poloMap.get(polo)!;
            if (!userMap.has(user)) {
                userMap.set(user, []);
            }

            userMap.get(user)!.push(type);
        });

        // Convert Map to Array structure
        const byPolo = Array.from(poloMap.entries()).map(([polo, userMap]) => {
            const users = Array.from(userMap.entries()).map(([nome, types]) => ({
                nome,
                count: types.length,
                types
            })).sort((a, b) => b.count - a.count); // Sort users by count desc

            const poloTotal = users.reduce((sum, u) => sum + u.count, 0);

            return {
                polo,
                total: poloTotal,
                users
            };
        }).sort((a, b) => b.total - a.total); // Sort polos by total desc

        return { total, byType, byPolo };
    } finally {
        client.release();
    }
}

export type LatestEnrollment = {
    id: string;
    nomeAluno: string;
    curso: string;
    polo: string;
    usuarioNome: string;
    dataMatricula: Date;
};

export async function getLastEnrollment(redeId: string): Promise<LatestEnrollment | null> {
    const client = await pool.connect();
    try {
        const query = `
            SELECT 
                m.id,
                m."nomeAluno",
                m.polo,
                m."dataMatricula",
                u.nome as usuario_nome,
                tc.nome as curso_nome
            FROM matriculas m
            LEFT JOIN usuarios u ON m."usuarioId" = u.id
            LEFT JOIN tipos_curso tc ON m."tipoCursoId" = tc.id
            WHERE m."redeId" = $1
            ORDER BY m."criadoEm" DESC
            LIMIT 1
        `;

        const result = await client.query(query, [redeId]);

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            id: row.id,
            nomeAluno: row.nomeAluno,
            curso: row.curso_nome || 'Curso',
            polo: row.polo,
            usuarioNome: row.usuario_nome || 'Alguém',
            dataMatricula: row.dataMatricula
        };
    } finally {
        client.release();
    }
}

export const deleteMatricula = async (id: string, redeId: string) => {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM matriculas WHERE id = $1 AND "redeId" = $2', [id, redeId]);
    } finally {
        client.release();
    }
};

export const getMatriculaById = async (id: string, redeId: string): Promise<Matricula | null> => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM matriculas WHERE id = $1 AND "redeId" = $2',
            [id, redeId]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
};
export async function getDespesasAgrupadasPorPolo(permissions: UserPermissions, filters: { ano: number; mes: number }): Promise<{ polo: string; total: number }[]> {
    if (!permissions.redeId) return [];
    const client = await pool.connect();
    try {
        const query = `
            WITH combined_polos AS (
                -- Poles defined in the network
                SELECT unnest(polos) as polo_name
                FROM redes
                WHERE id = $1
                UNION
                -- Poles that actually have financial records
                SELECT DISTINCT polo as polo_name
                FROM financial_records
                WHERE "redeId" = $1
            )
            SELECT 
                p.polo_name as polo,
                COALESCE(SUM(d.valor), 0) as total
            FROM combined_polos p
            LEFT JOIN despesas d ON p.polo_name = d.polo 
                AND EXTRACT(YEAR FROM d.data) = $2 
                AND EXTRACT(MONTH FROM d.data) = $3
                AND d."redeId" = $1
            WHERE ($4::text[] IS NULL OR p.polo_name = ANY($4))
            GROUP BY p.polo_name
            ORDER BY p.polo_name;
        `;
        const params = [permissions.redeId, filters.ano, filters.mes, permissions.polos];
        const result = await client.query(query, params);
        return result.rows.map(row => ({
            polo: row.polo,
            total: parseFloat(row.total || '0')
        }));
    } finally {
        client.release();
    }
}

// --- Ranking Configuration & Messages ---

export async function getRankingConfig(redeId: string): Promise<RankingConfig | null> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM ranking_config WHERE "redeId" = $1', [redeId]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function saveRankingConfig(config: Partial<RankingConfig>): Promise<RankingConfig> {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO ranking_config ("redeId", "voiceEnabled", "voiceSpeed", "alertMode", "soundEnabled", "soundUrl", "manualAlertSoundUrl", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT ("redeId") 
            DO UPDATE SET 
                "voiceEnabled" = EXCLUDED."voiceEnabled",
                "voiceSpeed" = EXCLUDED."voiceSpeed",
                "alertMode" = EXCLUDED."alertMode",
                "soundEnabled" = EXCLUDED."soundEnabled",
                "soundUrl" = EXCLUDED."soundUrl",
                "manualAlertSoundUrl" = EXCLUDED."manualAlertSoundUrl",
                "updatedAt" = NOW()
            RETURNING *
        `;
        const result = await client.query(query, [
            config.redeId,
            config.voiceEnabled ?? true,
            config.voiceSpeed ?? 1.1,
            config.alertMode ?? 'confetti',
            config.soundEnabled ?? true,
            config.soundUrl ?? null,
            (config as any).manualAlertSoundUrl ?? null
        ]);
        return result.rows[0];
    } finally {
        client.release();
    }
}

export async function createRankingMessage(redeId: string, message: string): Promise<RankingMessage> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO ranking_messages (id, "redeId", message, "createdAt") VALUES ($1, $2, $3, NOW()) RETURNING *',
            [uuidv4(), redeId, message]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
}

export async function getLastRankingMessage(redeId: string): Promise<RankingMessage | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM ranking_messages WHERE "redeId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
            [redeId]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

// Sound Library Functions

export interface SavedSound {
    id: string;
    redeId: string;
    name: string;
    url: string;
    createdAt: Date;
}

export async function getSavedSounds(redeId: string): Promise<SavedSound[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM saved_sounds WHERE "redeId" = $1 ORDER BY "createdAt" DESC',
            [redeId]
        );
        return result.rows;
    } finally {
        client.release();
    }
}

export async function saveSound(redeId: string, name: string, url: string): Promise<SavedSound> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO saved_sounds (id, "redeId", name, url, "createdAt") VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [uuidv4(), redeId, name, url]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
}

export async function deleteSound(id: string, redeId: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(
            'DELETE FROM saved_sounds WHERE id = $1 AND "redeId" = $2',
            [id, redeId]
        );
    } finally {
        client.release();
    }
}

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
    const client = await pool.connect();
    try {
        const [redesResult, usuariosResult, funcoesResult] = await Promise.all([
            client.query('SELECT COUNT(*) FROM redes'),
            client.query('SELECT COUNT(*) FROM usuarios'),
            client.query('SELECT COUNT(*) FROM funcoes')
        ]);

        return {
            totalRedes: parseInt(redesResult.rows[0].count),
            totalUsuarios: parseInt(usuariosResult.rows[0].count),
            totalFuncoes: parseInt(funcoesResult.rows[0].count)
        };
    } finally {
        client.release();
    }
}

export async function getAllSuperAdmins(): Promise<Omit<Usuario, 'senha'>[]> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT id, nome, email, funcao, status, "redeId", "isSuperadmin", polos FROM usuarios WHERE "isSuperadmin" = true ORDER BY nome ASC');
        return result.rows;
    } finally {
        client.release();
    }
}



export async function getSystemConfig(): Promise<SystemConfig> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM system_config');
        const config: SystemConfig = { appName: '', appLogo: '', appFavicon: '', appLogoHeight: '48' }; // Default height 48px

        result.rows.forEach(row => {
            if (row.key === 'APP_NAME') config.appName = row.value;
            if (row.key === 'APP_LOGO') config.appLogo = row.value;
            if (row.key === 'APP_FAVICON') config.appFavicon = row.value;
            if (row.key === 'APP_LOGO_HEIGHT') config.appLogoHeight = row.value;

            // New fields
            if (row.key === 'APP_LOGO_SIDEBAR_WIDTH') config.appLogoSidebarWidth = row.value;
            if (row.key === 'APP_LOGO_ICON_HEIGHT') config.appLogoIconHeight = row.value;
            if (row.key === 'APP_LOGO_LOGIN_SCALE') config.appLogoLoginScale = row.value;
            if (row.key === 'APP_LOGO_LOGIN_POSITION') config.appLogoLoginPosition = row.value as any;
            if (row.key === 'APP_LOGO_SIDEBAR_POSITION') config.appLogoSidebarPosition = row.value as any;

            if (row.key === 'APP_LOGO_LOGIN_OFFSET_X') config.appLogoLoginOffsetX = Number(row.value);
            if (row.key === 'APP_LOGO_LOGIN_OFFSET_Y') config.appLogoLoginOffsetY = Number(row.value);
            if (row.key === 'APP_LOGO_SIDEBAR_OFFSET_X') config.appLogoSidebarOffsetX = Number(row.value);
            if (row.key === 'APP_LOGO_SIDEBAR_OFFSET_Y') config.appLogoSidebarOffsetY = Number(row.value);

            if (row.key === 'APP_LOGO_LOGIN_HEIGHT') config.appLogoLoginHeight = row.value;
            if (row.key === 'APP_LOGO_SIDEBAR_SCALE') config.appLogoSidebarScale = row.value;

            if (row.key === 'APP_LOGO_SUPERADMIN_HEIGHT') config.appLogoSuperAdminHeight = row.value;
            if (row.key === 'APP_LOGO_SUPERADMIN_SCALE') config.appLogoSuperAdminScale = row.value;
            if (row.key === 'APP_LOGO_SUPERADMIN_POSITION') config.appLogoSuperAdminPosition = row.value as any;
            if (row.key === 'APP_LOGO_SUPERADMIN_OFFSET_X') config.appLogoSuperAdminOffsetX = Number(row.value);
            if (row.key === 'APP_LOGO_SUPERADMIN_OFFSET_Y') config.appLogoSuperAdminOffsetY = Number(row.value);

            // Dark Mode Logos
            if (row.key === 'APP_LOGO_DARK') config.appLogoDark = row.value;
            if (row.key === 'APP_FAVICON_DARK') config.appFaviconDark = row.value;
        });

        return config;
    } catch (e) {
        // Table might not exist yet, return default
        return { appName: 'Sistema', appLogo: '', appFavicon: '', appLogoHeight: '48' };
    } finally {
        client.release();
    }
}

export async function saveSystemConfig(config: SystemConfig): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_NAME', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appName]);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogo]);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_FAVICON', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appFavicon || '']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_HEIGHT', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoHeight || '48']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SIDEBAR_WIDTH', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSidebarWidth || 'auto']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_ICON_HEIGHT', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoIconHeight || '32']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_LOGIN_SCALE', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoLoginScale || '1']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_LOGIN_POSITION', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoLoginPosition || 'center']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SIDEBAR_POSITION', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSidebarPosition || 'left']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_LOGIN_OFFSET_X', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoLoginOffsetX?.toString() || '0']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_LOGIN_OFFSET_Y', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoLoginOffsetY?.toString() || '0']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SIDEBAR_OFFSET_X', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSidebarOffsetX?.toString() || '0']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SIDEBAR_OFFSET_Y', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSidebarOffsetY?.toString() || '0']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SUPERADMIN_HEIGHT', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSuperAdminHeight || '48']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_LOGIN_HEIGHT', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoLoginHeight || '48']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SIDEBAR_SCALE', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSidebarScale || '1']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SUPERADMIN_SCALE', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSuperAdminScale || '1']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SUPERADMIN_POSITION', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSuperAdminPosition || 'center']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SUPERADMIN_OFFSET_X', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSuperAdminOffsetX?.toString() || '0']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_SUPERADMIN_OFFSET_Y', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoSuperAdminOffsetY?.toString() || '0']);

        // Dark Mode Logos
        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_LOGO_DARK', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appLogoDark || '']);

        await client.query(`
            INSERT INTO system_config (key, value) VALUES ('APP_FAVICON_DARK', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [config.appFaviconDark || '']);

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getPolosSpacepointStatus(redeId: string, processoId: string): Promise<Record<string, boolean>> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT DISTINCT polo FROM spacepoints WHERE "redeId" = $1 AND "processoSeletivo" = $2 AND "metaTotal" > 0 AND "polo" IS NOT NULL',
            [redeId, processoId]
        );
        const statuses: Record<string, boolean> = {};
        result.rows.forEach(row => {
            statuses[row.polo] = true;
        });
        return statuses;
    } finally {
        client.release();
    }
}



export async function getWhatsAppInstances(redeId?: string): Promise<WhatsAppInstance[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM whatsapp_instances';
        const params: string[] = [];
        if (redeId) {
            query += ' WHERE "redeId" = $1';
            params.push(redeId);
        }
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getWhatsAppInstanceById(id: string): Promise<WhatsAppInstance | null> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM whatsapp_instances WHERE id = $1', [id]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function saveWhatsAppInstance(instance: Partial<WhatsAppInstance>): Promise<WhatsAppInstance> {
    const client = await pool.connect();
    try {
        if (instance.id) {
            const { id, ...fields } = instance;
            const entries = Object.entries(fields).filter(([_, v]) => v !== undefined);
            const setClause = entries.map(([k, _], i) => `"${k}" = $${i + 2}`).join(', ');
            const values = entries.map(([_, v]) => v);
            const result = await client.query(
                `UPDATE whatsapp_instances SET ${setClause} WHERE id = $1 RETURNING *`,
                [id, ...values]
            );
            return result.rows[0];
        } else {
            const newId = uuidv4();
            const { redeId, instanceName, instanceToken, ownerId, status, phoneNumber } = instance;
            const result = await client.query(
                `INSERT INTO whatsapp_instances (id, "redeId", "instanceName", "instanceToken", "ownerId", status, "phoneNumber") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [newId, redeId, instanceName, instanceToken, ownerId, status || 'Disconnected', phoneNumber]
            );
            return result.rows[0];
        }
    } finally {
        client.release();
    }
}

export async function deleteWhatsAppInstance(id: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM whatsapp_instances WHERE id = $1', [id]);
    } finally {
        client.release();
    }
}

