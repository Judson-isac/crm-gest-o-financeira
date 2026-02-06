-- Script de recuperação após deleção acidental de redes
-- Execute na VPS se você deletou todas as redes

-- 1. Recriar rede padrão (se não existir)
INSERT INTO public.redes (id, nome, polos, modulos) 
VALUES ('rede_default', 'Rede Principal', ARRAY[]::TEXT[], ARRAY[]::TEXT[])
ON CONFLICT (id) DO NOTHING;

-- 2. Recriar função superadmin
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

-- 3. Recriar usuário superadmin
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
ON CONFLICT (email) DO UPDATE SET
    senha = EXCLUDED.senha,
    "redeId" = EXCLUDED."redeId",
    "isSuperadmin" = TRUE;

-- 4. Verificar se foi criado
SELECT id, email, "isSuperadmin", "redeId" FROM usuarios WHERE email = 'admin@crm.com';
