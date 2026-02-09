param (
    [string]$Message,
    [switch]$Yes = $false
)

$ErrorActionPreference = "Stop"

if (-not $Message) {
    Write-Host "❌ Erro: Mensagem de commit é obrigatória!" -ForegroundColor Red
    Write-Host "Uso: .\scripts\git-deploy.ps1 [-Yes] 'sua mensagem aqui'" -ForegroundColor Yellow
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📤 Enviando código para o Git..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Adicionar todos os arquivos
Write-Host "➕ 1. Adicionando arquivos..." -ForegroundColor Green
git add -A

# 2. Mostrar status
Write-Host "`n📊 Status:" -ForegroundColor Yellow
git status --short

# 3. Confirmar commit (se não for auto)
if (-not $Yes) {
    Write-Host ""
    $confirmation = Read-Host "Continuar com commit? (s/N)"
    if ($confirmation -notmatch "^[Ss]$") {
        Write-Host "❌ Cancelado pelo usuário" -ForegroundColor Red
        exit 0
    }
}

# 4. Commit
Write-Host "💾 2. Criando commit..." -ForegroundColor Green
git commit -m "$Message"

# 5. Push
Write-Host "🚀 3. Enviando para GitHub (Main e Master)..." -ForegroundColor Green
git push origin main
git push origin main:master

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "✅ Código enviado com sucesso!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
