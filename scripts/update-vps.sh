#!/bin/bash
# Script de atualização automática do CRM na VPS
# Uso: ./scripts/update-vps.sh

set -e  # Para em caso de erro

echo "=========================================="
echo "🚀 Iniciando atualização do CRM..."
echo "=========================================="

# Carregar variáveis de ambiente do .env se existir
if [ -f .env ]; then
  echo "🌍 Carregando variáveis de ambiente do .env..."
  export $(grep -v '^#' .env | xargs)
fi

# 1. Preparar Git (Resetar e Puxar)
echo "📥 1. Sincronizando código do Git..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🌿 Branch detectada: $BRANCH"

echo "� Resetando mudanças locais para evitar conflitos..."
git fetch --all
git reset --hard origin/$BRANCH
chmod +x scripts/*.sh

echo "⬇️  Baixando atualizações..."
git pull
echo "🔖 Versão atual no servidor:"
git log -1 --oneline

# 2. Remover stack antiga
echo "🗑️  2. Removendo stack antiga..."
docker stack rm crm
sleep 5

# 3. Remover imagem antiga
echo "🧹 3. Limpando imagem antiga..."
docker rmi crm-app:latest 2>/dev/null || echo "Imagem já removida"

# 4. Rebuild
echo "🔨 4. Reconstruindo imagem (SEM CACHE)..."
docker build --no-cache \
  --build-arg DATABASE_URL='postgresql://crm_user:Crm@2024!Forte@pgvector:5432/crm_gestao' \
  -t crm-app:latest .

# 5. Deploy
echo "🚀 5. Fazendo deploy..."
# Garantir que o volume de uploads existe
docker volume create crm_uploads || true
docker stack deploy -c docker-compose.prod.yml crm

# 6. Aguardar serviço estar pronto
echo "⏳ 6. Aguardando serviço iniciar..."
sleep 10

# 7. Rodar migrações de banco
echo "🗄️  7. Rodando migrações de banco..."
PG_CONTAINER=$(docker ps -q -f name=pgvector | head -n 1)
if [ ! -z "$PG_CONTAINER" ]; then
    echo "🐘 Executando SQL no container $PG_CONTAINER..."
    # Se o arquivo existir localmente, podemos enviá-lo para o container
    if [ -f migration_whatsapp_nullable.sql ]; then
        docker exec -i $PG_CONTAINER psql -U crm_user -d crm_gestao < migration_whatsapp_nullable.sql
    else
        docker exec -i $PG_CONTAINER psql -U crm_user -d crm_gestao -c 'ALTER TABLE whatsapp_instances ALTER COLUMN "redeId" DROP NOT NULL;'
    fi
    echo "✅ Migração concluída."
else
    echo "⚠️  Não foi possível encontrar o container do banco de dados (pgvector) para rodar migrações."
fi

# 8. Mostrar logs
echo "📋 8. Mostrando logs (Ctrl+C para sair)..."
echo "=========================================="
docker service logs crm_crm -f
