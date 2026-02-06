-- Fix column casing for processos_seletivos
ALTER TABLE processos_seletivos DROP COLUMN IF EXISTS datainicial;
ALTER TABLE processos_seletivos DROP COLUMN IF EXISTS datafinal;
ALTER TABLE processos_seletivos ADD COLUMN "dataInicial" timestamp;
ALTER TABLE processos_seletivos ADD COLUMN "dataFinal" timestamp;
