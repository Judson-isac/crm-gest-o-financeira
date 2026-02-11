<#
.SYNOPSIS
    Script de deploy seguro para Windows (PowerShell)
.DESCRIPTION
    Realiza git add, commit e push com verificacoes de seguranca.
#>
param (
    [Parameter(Position=0, Mandatory=$true)]
    [string]$Message,

    [Parameter(Mandatory=$false)]
    [Alias("y")]
    [switch]$Yes = $true
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
# Forcar UTF-8 para garantir que acentos funcionem
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Log {
    param([string]$Msg, [string]$Color="White")
    Write-Host $Msg -ForegroundColor $Color
}

function Test-GitCommand {
    param([string]$Cmd, [string]$ErrorMessage)
    # Executa o comando e verifica erro
    Invoke-Expression $Cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Log "ERRO: $ErrorMessage" "Red"
        exit $LASTEXITCODE
    }
}

try {
    Write-Log "`n==========================================" "Cyan"
    Write-Log "INICIANDO DEPLOY SEGURO" "Cyan"
    Write-Log "==========================================" "Cyan"

    # 1. Verificar Status
    Write-Log "`n[1/5] Verificando estado do repositorio..." "Yellow"
    $status = git status --porcelain
    if (-not $status) {
        Write-Log "[INFO] Nenhuma alteracao pendente para commitar." "Yellow"
    } else {
        # 2. Add
        Write-Log "`n[2/5] Adicionando arquivos (git add .)..." "Green"
        Test-GitCommand "git add ." "Falha ao adicionar arquivos"
        
        # 3. Confirmar
        if (-not $Yes) {
            Write-Log "`nArquivos a serem commitados:" "Gray"
            git status --short
            Write-Log ""
            $confirmation = Read-Host "Confirmar commit e push? (S/N)"
            if ($confirmation -notmatch "^[Ss]$") {
                Write-Log "CANCELADO pelo usuario." "Red"
                exit 0
            }
        }

        # 4. Commit
        Write-Log "`n[3/5] Realizando commit..." "Green"
        # Usamos uma variavel temporaria para o comando para evitar problemas de parsing de string
        $commitCmd = "git commit -m `"$Message`""
        Test-GitCommand $commitCmd "Falha ao realizar commit"
    }

    # 5. Push Main
    Write-Log "`n[4/5] Enviando para origin/main..." "Green"
    Test-GitCommand "git push origin main" "Falha no push para main"

    # 6. Push Master
    Write-Log "`n[5/5] Enviando para origin/main:master..." "Green"
    Test-GitCommand "git push origin main:master" "Falha no push para master"

    Write-Log "`n==========================================" "Cyan"
    Write-Log "SUCESSO! Codigo enviado e sincronizado." "Green"
    Write-Log "==========================================" "Cyan"

} catch {
    Write-Log "`nERRO CRITICO: $($_.Exception.Message)" "Red"
    exit 1
}
