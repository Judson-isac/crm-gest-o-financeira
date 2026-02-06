--Get despesas aggregated by polo for a specific year / month
export async function getDespesasAgrupadasPorPolo(filters: { ano: number; mes: number }, redeId?: string): Promise<{ polo: string; total: number }[]> {
        const client = await pool.connect();
        try {
            let query = `
            SELECT polo, SUM(valor) as total 
            FROM despesas 
            WHERE EXTRACT(YEAR FROM data) = $1 
            AND EXTRACT(MONTH FROM data) = $2
        `;
            const params: any[] = [filters.ano, filters.mes];

            if (redeId) {
                query += ' AND "redeId" = $3';
                params.push(redeId);
            }

            query += ' GROUP BY polo ORDER BY polo';

            const result = await client.query(query, params);
            return result.rows.map(row => ({
                polo: row.polo,
                total: parseFloat(row.total)
            }));
        } finally {
            client.release();
        }
    }
