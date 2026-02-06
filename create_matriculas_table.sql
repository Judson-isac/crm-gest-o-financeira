-- Create matriculas table with all form fields
CREATE TABLE IF NOT EXISTS matriculas (
    id text PRIMARY KEY,
    "redeId" text NOT NULL REFERENCES redes(id) ON DELETE CASCADE,
    "dataMatricula" timestamp NOT NULL,
    "processoSeletivoId" text REFERENCES processos_seletivos(id),
    polo text NOT NULL,
    estado text NOT NULL,
    cidade text NOT NULL,
    "nomeAluno" text NOT NULL,
    telefone text,
    ra text,
    "tipoCursoId" text REFERENCES tipos_curso(id),
    "cursoSigla" text NOT NULL,
    "campanhaId" text REFERENCES campanhas(id),
    "canalId" text REFERENCES canais(id),
    "primeiraMensalidade" decimal(10,2),
    "segundaMensalidade" decimal(10,2) NOT NULL,
    "criadoEm" timestamp DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_matriculas_redeId ON matriculas("redeId");
CREATE INDEX IF NOT EXISTS idx_matriculas_dataMatricula ON matriculas("dataMatricula");
CREATE INDEX IF NOT EXISTS idx_matriculas_nomeAluno ON matriculas("nomeAluno");
