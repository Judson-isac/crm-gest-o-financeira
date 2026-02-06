-- Fix column casing for campanhas
ALTER TABLE campanhas DROP COLUMN IF EXISTS datainicial;
ALTER TABLE campanhas DROP COLUMN IF EXISTS datafinal;
ALTER TABLE campanhas ADD COLUMN "dataInicial" timestamp;
ALTER TABLE campanhas ADD COLUMN "dataFinal" timestamp;
