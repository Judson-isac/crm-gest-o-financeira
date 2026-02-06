-- =====================================================================
-- CRM Gestão Financeira - Inicialização do Banco de Dados
-- Arquivo SEGURO para versionamento no Git
-- Contém apenas estrutura (schema) + dados essenciais (seed data)
-- =====================================================================

-- Configurações
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- =====================================================================
-- TABELAS
-- =====================================================================

-- Redes
CREATE TABLE IF NOT EXISTS public.redes (
    id TEXT PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    polos TEXT[]
);

-- Funções/Perfis
CREATE TABLE IF NOT EXISTS public.funcoes (
    id TEXT PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    permissoes JSONB,
    "redeId" VARCHAR(255) NOT NULL REFERENCES public.redes(id) ON DELETE CASCADE,
    polos TEXT[]
);

-- Usuários
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    funcao TEXT,
    status TEXT DEFAULT 'ativo',
    rede TEXT,
    avatarurl TEXT,
    "redeId" VARCHAR(255) NOT NULL REFERENCES public.redes(id) ON DELETE CASCADE,
    "isSuperadmin" BOOLEAN DEFAULT FALSE NOT NULL
);

-- Matrículas
CREATE TABLE IF NOT EXISTS public.matriculas (
    id TEXT PRIMARY KEY,
    nome_aluno TEXT,
    cpf TEXT,
    email TEXT,
    telefone TEXT,
    curso_id TEXT,
    data_matricula TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'ativo',
    "redeId" TEXT REFERENCES public.redes(id) ON DELETE CASCADE
);

-- Cursos
CREATE TABLE IF NOT EXISTS public.cursos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    sigla TEXT,
    tipo TEXT,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tipos de Curso
CREATE TABLE IF NOT EXISTS public.tipos_curso (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    sigla TEXT,
    ativo BOOLEAN DEFAULT TRUE
);

-- Campanhas
CREATE TABLE IF NOT EXISTS public.campanhas (
    id TEXT PRIMARY KEY,
    nome TEXT,
    ativo BOOLEAN DEFAULT TRUE
);

-- Canais
CREATE TABLE IF NOT EXISTS public.canais (
    id TEXT PRIMARY KEY,
    nome TEXT,
    ativo BOOLEAN DEFAULT TRUE
);

-- Processos Seletivos
CREATE TABLE IF NOT EXISTS public.processos_seletivos (
    id TEXT PRIMARY KEY,
    nome TEXT,
    ativo BOOLEAN DEFAULT TRUE
);

-- Números de Processo Seletivo
CREATE TABLE IF NOT EXISTS public.numeros_processo_seletivo (
    id TEXT PRIMARY KEY,
    numero TEXT,
    processo_seletivo_id TEXT
);

-- Space Points
CREATE TABLE IF NOT EXISTS public.spacepoints (
    id TEXT PRIMARY KEY,
    nome TEXT,
    ativo BOOLEAN DEFAULT TRUE
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
    categoria TEXT
);

-- Metas
CREATE TABLE IF NOT EXISTS public.metas (
    id TEXT PRIMARY KEY,
    rede TEXT,
    mes INTEGER,
    ano INTEGER,
    valor NUMERIC
);

-- Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.system_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    app_name TEXT DEFAULT 'CRM Gestão Financeira',
    app_logo TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Configurações de Ranking
CREATE TABLE IF NOT EXISTS public.ranking_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    sound_url TEXT,
    voice_enabled BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    voice_speed NUMERIC DEFAULT 1.0,
    manual_alert_sound_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- DADOS INICIAIS (SEED DATA)
-- =====================================================================

-- Rede Padrão
INSERT INTO public.redes (id, nome, polos) 
VALUES ('rede_default', 'Rede Principal', ARRAY[]::TEXT[])
ON CONFLICT (id) DO NOTHING;

-- Função Superadmin
INSERT INTO public.funcoes (id, nome, permissoes, "redeId", polos)
VALUES (
    'funcao_superadmin',
    'Superadministrador',
    '{"verDashboard": true, "gerenciarUsuarios": true, "gerenciarMatriculas": true, "realizarImportacoes": true, "gerenciarCadastrosGerais": true, "verRelatoriosFinanceiros": true}'::JSONB,
    'rede_default',
    ARRAY[]::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

-- Usuário Superadmin Padrão
-- Email: admin@crm.com
-- Senha: Admin@2024 (hash bcrypt)
INSERT INTO public.usuarios (id, nome, email, senha, funcao, status, "redeId", "isSuperadmin")
VALUES (
    'user_superadmin',
    'Administrador',
    'admin@crm.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMye/5SYI3vYrsFYmSsz2C5iGt0dP1PaM5u',
    'Superadministrador',
    'ativo',
    'rede_default',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Tipos de Curso Padrão
INSERT INTO public.tipos_curso (id, nome, sigla, ativo) VALUES
    ('tc_grad_ead', 'Graduação - EAD', 'GRAD/EAD', TRUE),
    ('tc_grad_hib', 'Graduação - Híbrido', 'GRAD/HIB', TRUE),
    ('tc_pos', 'Pós-Graduação', 'PÓS', TRUE),
    ('tc_pro', 'Profissionalizante', 'PRO', TRUE),
    ('tc_tec', 'Técnico', 'TEC', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Config do Sistema
INSERT INTO public.system_config (id, app_name)
VALUES ('default', 'CRM Gestão Financeira')
ON CONFLICT (id) DO NOTHING;

-- Config do Ranking
INSERT INTO public.ranking_config (id, voice_enabled, sound_enabled, voice_speed)
VALUES ('default', TRUE, TRUE, 1.0)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- ÍNDICES (Performance)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rede ON public.usuarios("redeId");
CREATE INDEX IF NOT EXISTS idx_financial_records_rede ON public.financial_records("redeId");
CREATE INDEX IF NOT EXISTS idx_matriculas_rede ON public.matriculas("redeId");

-- =====================================================================
-- FIM DA INICIALIZAÇÃO
-- =====================================================================
-- ✅ Banco inicializado com sucesso!
-- 📧 Login padrão: admin@crm.com
-- 🔑 Senha padrão: Admin@2024
-- ⚠️  IMPORTANTE: Altere a senha após primeiro login!
-- =====================================================================
