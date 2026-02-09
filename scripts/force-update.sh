#!/bin/bash
# Script de Atualização Forçada (Resolução de Conflitos)
# Use este script quando o ./scripts/update-vps.sh falhar com erros de Git
# Uso: ./scripts/force-update.sh

set -e

echo "=========================================="
echo "☢️  INICIANDO ATUALIZAÇÃO FORÇADA"
echo "=========================================="

# 1. Detectar branch atual
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🌿 Branch detectada: $BRANCH"

# 2. Resetar Git (Descartar mudanças locais)
echo "🔥 1. Descartando mudanças locais (Hard Reset)..."
git fetch --all
git reset --hard origin/$BRANCH

# 3. Garantir permissões
echo "🔑 2. Corrigindo permissões de scripts..."
chmod +x scripts/*.sh

# 4. Rodar o update normal
echo "🚀 3. Executando atualização padrão..."
./scripts/update-vps.sh
