#!/bin/bash

# Script para corrigir erro de chave estrangeira (rede_default)
# Execute na VPS: ./scripts/fix-rede-default.sh

echo "🔍 Verificando container do banco de dados..."
CONTAINER_ID=$(docker ps -q -f name=pgvector)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Erro: Container do banco de dados não encontrado!"
    echo "Verifique se o stack está rodando com 'docker stack ps crm'"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"
echo "🛠️ Criando Rede Padrão (rede_default) se não existir..."

docker exec -i $CONTAINER_ID psql -U postgres -d crm_gestao <<EOF
-- Insere a rede padrão se ela não existir
INSERT INTO public.redes (id, nome, "logoUrl", "logoVerticalUrl", "faviconUrl")
VALUES ('rede_default', 'Rede Padrão', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Verifica se foi criado
SELECT id, nome FROM public.redes WHERE id = 'rede_default';
EOF

echo "✅ Correção aplicada com sucesso!"
echo "🚀 Agora você pode criar administradores."
