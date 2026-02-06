#!/bin/bash
# Script de atualização automática do CRM na VPS
# Uso: ./scripts/update-vps.sh

set -e  # Para em caso de erro

echo "=========================================="
echo "🚀 Iniciando atualização do CRM..."
echo "=========================================="

# 1. Puxar código atualizado
echo "📥 1. Puxando código do Git..."
git pull

# 2. Remover stack antiga
echo "🗑️  2. Removendo stack antiga..."
docker stack rm crm
sleep 5

# 3. Remover imagem antiga
echo "🧹 3. Limpando imagem antiga..."
docker rmi crm-app:latest 2>/dev/null || echo "Imagem já removida"

# 4. Rebuild
echo "🔨 4. Reconstruindo imagem..."
docker build \
  --build-arg DATABASE_URL='postgresql://crm_user:Crm@2024!Forte@pgvector:5432/crm_gestao' \
  -t crm-app:latest .

# 5. Deploy
echo "🚀 5. Fazendo deploy..."
docker stack deploy -c docker-compose.prod.yml crm

# 6. Aguardar serviço estar pronto
echo "⏳ 6. Aguardando serviço iniciar..."
sleep 10

# 7. Mostrar logs
echo "📋 7. Mostrando logs (Ctrl+C para sair)..."
echo "=========================================="
docker service logs crm_crm -f
