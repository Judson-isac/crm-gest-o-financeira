#!/bin/bash

# Script para corrigir colunas e constraints de tipos de curso e WhatsApp
# Execute na VPS: ./scripts/fix-db-tipo-curso.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o stack está rodando com 'docker stack ps crm'"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Aplicando correção no banco de dados..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- 1. Adiciona coluna tipoCursoId na tabela cursos se não existir
DO \$\$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cursos' AND column_name='tipoCursoId') THEN
        ALTER TABLE cursos ADD COLUMN "tipoCursoId" UUID;
    END IF;
END \$\$;

-- 2. Limpa duplicatas na tabela tipos_curso antes de criar a constraint
DELETE FROM tipos_curso tc1
WHERE tc1.id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY nome, "redeId" ORDER BY id) as row_num
        FROM tipos_curso
    ) t WHERE t.row_num > 1
);

-- 3. Adiciona constraint de unicidade na tabela tipos_curso
DO \$\$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'tipos_curso'::regclass 
        AND conname = 'tipos_curso_nome_redeId_key'
    ) THEN
        ALTER TABLE tipos_curso ADD CONSTRAINT tipos_curso_nome_redeId_key UNIQUE (nome, "redeId");
    END IF;
END \$\$;

-- 4. Cria tabela whatsapp_instances se não existir (ID como TEXT para compatibilidade)
CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id TEXT PRIMARY KEY,
    "redeId" TEXT NOT NULL REFERENCES redes(id) ON DELETE CASCADE,
    "apiUrl" TEXT,
    "instanceName" TEXT NOT NULL,
    "instanceToken" TEXT NOT NULL,
    "ownerId" TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Disconnected',
    "phoneNumber" TEXT,
    "profileName" TEXT,
    "profilePicUrl" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("instanceName")
);

-- 5. Garante que a coluna apiUrl existe caso a tabela já tenha sido criada anteriormente
DO \$\$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_instances' AND column_name='apiUrl') THEN
        ALTER TABLE whatsapp_instances ADD COLUMN "apiUrl" TEXT;
    END IF;
END \$\$;


EOF

echo "✅ Correção de Tipos de Curso e WhatsApp aplicada com sucesso!"
echo "🚀 Agora o CRM deve funcionar corretamente."
