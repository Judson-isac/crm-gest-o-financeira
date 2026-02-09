#!/bin/bash
# Script para commit e push automático
# Uso: ./scripts/git-deploy.sh "mensagem do commit"

set -e  # Para em caso de erro

# Check for -y flag to skip confirmation
AUTO_CONFIRM=false
if [ "$1" == "-y" ]; then
  AUTO_CONFIRM=true
  shift
fi

# Verificar se mensagem foi fornecida
if [ -z "$1" ]; then
  echo "❌ Erro: Mensagem de commit é obrigatória!"
  echo "Uso: ./scripts/git-deploy.sh [-y] \"sua mensagem aqui\""
  exit 1
fi

COMMIT_MSG="$1"

echo "=========================================="
echo "📤 Enviando código para o Git..."
echo "=========================================="

# 1. Adicionar todos os arquivos
echo "➕ 1. Adicionando arquivos..."
git add -A

# 2. Mostrar status
echo ""
echo "📊 Status:"
git status --short

# 3. Confirmar commit (se não for auto)
if [ "$AUTO_CONFIRM" = false ]; then
  echo ""
  read -p "Continuar com commit? (s/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Cancelado pelo usuário"
    exit 0
  fi
fi

# 4. Commit
echo "💾 2. Criando commit..."
git commit -m "$COMMIT_MSG"

# 5. Push
echo "🚀 3. Enviando para GitHub (Main & Master)..."
git push origin main
git push origin main:master

echo ""
echo "=========================================="
echo "✅ Código enviado com sucesso!"
echo "=========================================="
