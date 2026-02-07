-- =====================================================================
-- CRM Gestão Financeira - Inicialização do Banco de Dados
-- Schema ATUALIZADO do banco atual + seed data mínimo
-- =====================================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ===  == TABELAS ==================================================================

-- Redes
CREATE TABLE IF NOT EXISTS public.redes (
    id TEXT PRIMARY KEY,
    nome TEXT UNIQUE,
    polos TEXT[],
    modulos TEXT[] DEFAULT '{}'::TEXT[],
    "logoUrl" TEXT,
    "logoVerticalUrl" TEXT
);

-- Funções/Perfis
CREATE TABLE IF NOT EXISTS public.funcoes (
    id TEXT PRIMARY KEY,
    nome TEXT UNIQUE,
    permissoes JSONB,
    "redeId" VARCHAR(255) NOT NULL REFERENCES public.redes(id) ON DELETE CASCADE,
    polos TEXT[],
    "verRanking" BOOLEAN DEFAULT FALSE
);

-- Usuários
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT,
    email TEXT UNIQUE,
    senha TEXT,
    funcao TEXT,
    status TEXT,
    rede TEXT,
    avatarurl TEXT,
    "redeId" VARCHAR(255) NOT NULL REFERENCES public.redes(id) ON DELETE CASCADE,
    "isSuperadmin" BOOLEAN DEFAULT FALSE NOT NULL,
    polos TEXT[] DEFAULT '{}'::TEXT[]
);

-- Matrículas
CREATE TABLE IF NOT EXISTS public.matriculas (
    id TEXT PRIMARY KEY,
    "redeId" TEXT NOT NULL REFERENCES public.redes(id) ON DELETE CASCADE,
    "dataMatricula" TIMESTAMP NOT NULL,
    "processoSeletivoId" TEXT,
    polo TEXT NOT NULL,
    estado TEXT NOT NULL,
    cidade TEXT NOT NULL,
    "nomeAluno" TEXT NOT NULL,
    telefone TEXT,
    ra TEXT,
    "tipoCursoId" TEXT,
    "cursoSigla" TEXT NOT NULL,
    "campanhaId" TEXT,
    "canalId" TEXT,
    "primeiraMensalidade" NUMERIC(10,2),
    "segundaMensalidade" NUMERIC(10,2) NOT NULL,
    "criadoEm" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    anexos TEXT[],
    "usuarioId" TEXT
);

-- Cursos
CREATE TABLE IF NOT EXISTS public.cursos (
    id TEXT PRIMARY KEY,
    nome TEXT,
    sigla TEXT,
    tipo TEXT,
    ativo BOOLEAN,
    sigla_alternativa TEXT,
    nicho TEXT,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE,
    UNIQUE (sigla, "redeId")
);

-- Tipos de Curso
CREATE TABLE IF NOT EXISTS public.tipos_curso (
    id TEXT PRIMARY KEY,
    nome TEXT,
    sigla TEXT,
    ativo BOOLEAN,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE
);

-- Campanhas
CREATE TABLE IF NOT EXISTS public.campanhas (
    id TEXT PRIMARY KEY,
    nome TEXT,
    ativo BOOLEAN,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE,
    "dataInicial" TIMESTAMP,
    "dataFinal" TIMESTAMP,
    status TEXT
);

-- Canais
CREATE TABLE IF NOT EXISTS public.canais (
    id TEXT PRIMARY KEY,
    nome TEXT,
    ativo BOOLEAN,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE
);

-- Processos Seletivos
CREATE TABLE IF NOT EXISTS public.processos_seletivos (
    id TEXT PRIMARY KEY,
    nome TEXT,
    ativo BOOLEAN,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE,
    numero TEXT,
    ano INTEGER,
    "dataInicial" TIMESTAMP,
    "dataFinal" TIMESTAMP
);

-- Números de Processo Seletivo
CREATE TABLE IF NOT EXISTS public.numeros_processo_seletivo (
    id TEXT PRIMARY KEY,
    numero TEXT,
    processo_seletivo_id TEXT,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE
);

-- Space Points
CREATE TABLE IF NOT EXISTS public.spacepoints (
    id TEXT PRIMARY KEY,
    nome TEXT,
    ativo BOOLEAN,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE,
    "processoSeletivo" TEXT,
    date TIMESTAMP,
    percentage NUMERIC(5,2)
);

-- Financial Records
CREATE TABLE IF NOT EXISTS public.financial_records (
    id TEXT PRIMARY KEY,
    polo TEXT,
    categoria TEXT,
    tipo TEXT,
    parcela INTEGER,
    valor_pago NUMERIC,
    valor_repasse NUMERIC,
    referencia_mes INTEGER,
    referencia_ano INTEGER,
    import_id TEXT,
    nome_arquivo TEXT,
    tipo_importacao TEXT,
    sigla_curso TEXT,
    data_importacao TIMESTAMP,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE
);

-- Import Logs
CREATE TABLE IF NOT EXISTS public.import_logs (
    id TEXT PRIMARY KEY,
    import_id TEXT,
    nome_arquivo TEXT,
    data_importacao TIMESTAMP,
    total_registros INTEGER,
    referencia_mes INTEGER,
    referencia_ano INTEGER,
    tipo_importacao TEXT,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE
);

-- Despesas
CREATE TABLE IF NOT EXISTS public.despesas (
    id TEXT PRIMARY KEY,
    polo TEXT,
    data DATE,
    descricao TEXT,
    valor NUMERIC,
    categoria TEXT,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE
);

-- Metas
CREATE TABLE IF NOT EXISTS public.metas (
    id TEXT PRIMARY KEY,
    rede TEXT,
    mes INTEGER,
    ano INTEGER,
    valor NUMERIC,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE
);

-- System Config
CREATE TABLE IF NOT EXISTS public.system_config (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT
);

-- Ranking Config
CREATE TABLE IF NOT EXISTS public.ranking_config (
    "redeId" TEXT PRIMARY KEY REFERENCES public.redes(id) ON DELETE CASCADE,
    "voiceEnabled" BOOLEAN DEFAULT TRUE,
    "voiceSpeed" NUMERIC DEFAULT 1.1,
    "soundEnabled" BOOLEAN DEFAULT TRUE,
    "alertMode" TEXT DEFAULT 'confetti',
    "soundUrl" TEXT,
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "manualAlertSoundUrl" TEXT,
    manualalertsoundurl TEXT
);

-- Ranking Messages
CREATE TABLE IF NOT EXISTS public.ranking_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Saved Sounds
CREATE TABLE IF NOT EXISTS public.saved_sounds (
    id TEXT PRIMARY KEY,
    "redeId" TEXT NOT NULL REFERENCES public.redes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- FOREIGN KEYS ADICIONAIS
-- =====================================================================

ALTER TABLE public.matriculas DROP CONSTRAINT IF EXISTS "matriculas_campanhaId_fkey";
ALTER TABLE public.matriculas ADD CONSTRAINT "matriculas_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES public.campanhas(id);

ALTER TABLE public.matriculas DROP CONSTRAINT IF EXISTS "matriculas_canalId_fkey";
ALTER TABLE public.matriculas ADD CONSTRAINT "matriculas_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES public.canais(id);

ALTER TABLE public.matriculas DROP CONSTRAINT IF EXISTS "matriculas_processoSeletivoId_fkey";
ALTER TABLE public.matriculas ADD CONSTRAINT "matriculas_processoSeletivoId_fkey" FOREIGN KEY ("processoSeletivoId") REFERENCES public.processos_seletivos(id);

ALTER TABLE public.matriculas DROP CONSTRAINT IF EXISTS "matriculas_tipoCursoId_fkey";
ALTER TABLE public.matriculas ADD CONSTRAINT "matriculas_tipoCursoId_fkey" FOREIGN KEY ("tipoCursoId") REFERENCES public.tipos_curso(id);

ALTER TABLE public.matriculas DROP CONSTRAINT IF EXISTS "matriculas_usuarioId_fkey";
ALTER TABLE public.matriculas ADD CONSTRAINT "matriculas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id);

ALTER TABLE public.spacepoints DROP CONSTRAINT IF EXISTS "spacepoints_processoSeletivo_fkey";
ALTER TABLE public.spacepoints ADD CONSTRAINT "spacepoints_processoSeletivo_fkey" FOREIGN KEY ("processoSeletivo") REFERENCES public.processos_seletivos(id);

-- =====================================================================
-- ÍNDICES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_matriculas_datamatricula ON public.matriculas("dataMatricula");
CREATE INDEX IF NOT EXISTS idx_matriculas_nomealuno ON public.matriculas("nomeAluno");
CREATE INDEX IF NOT EXISTS idx_matriculas_redeid ON public.matriculas("redeId");
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rede ON public.usuarios("redeId");

-- =====================================================================
-- SEED DATA (Dados Iniciais)
-- =====================================================================

-- Rede Padrão
INSERT INTO public.redes (id, nome, polos, modulos) 
VALUES ('rede_default', 'Rede Principal', ARRAY[]::TEXT[], ARRAY[]::TEXT[])
ON CONFLICT (id) DO NOTHING;

-- Função Superadmin
INSERT INTO public.funcoes (id, nome, permissoes, "redeId", polos, "verRanking")
VALUES (
    'funcao_superadmin',
    'Superadministrador',
    '{"verDashboard": true, "gerenciarUsuarios": true, "gerenciarMatriculas": true, "realizarImportacoes": true, "gerenciarCadastrosGerais": true, "verRelatoriosFinanceiros": true}'::JSONB,
    'rede_default',
    ARRAY[]::TEXT[],
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Usuário Superadmin
-- Email: admin@crm.com
-- Senha: Admin@2024
INSERT INTO public.usuarios (id, nome, email, senha, funcao, status, "redeId", "isSuperadmin", polos)
VALUES (
    'user_superadmin',
    'Administrador',
    'admin@crm.com',
    '$2b$10$tE49hpY3W2ct8fA5fFZ.Wuz35tBjBvT42yDm.fY2mmbqQOuE7ut.G',
    'Superadministrador',
    'ativo',
    'rede_default',
    TRUE,
    ARRAY[]::TEXT[]
)
ON CONFLICT (email) DO NOTHING;

-- Config do Sistema
INSERT INTO public.system_config (key, value)
VALUES ('appName', 'CRM Gestão Financeira')
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- FIM DA INICIALIZAÇÃO
-- =====================================================================
-- ✅ Banco inicializado!
-- 📧 Login: admin@crm.com
-- 🔑 Senha: Admin@2024
-- ⚠️  ALTERE a senha após primeiro login!
-- =====================================================================
