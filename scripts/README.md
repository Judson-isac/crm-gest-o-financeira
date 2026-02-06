# Scripts de Automação

Scripts para facilitar deploy e atualização do CRM.

## 📜 Scripts Disponíveis

### `update-vps.sh` - Atualizar na VPS

Atualiza o CRM na VPS automaticamente (pull, rebuild, deploy).

**Uso na VPS:**
```bash
cd ~/crm-gest-o-financeira
chmod +x scripts/update-vps.sh
./scripts/update-vps.sh
```

**O que faz:**
1. ✅ `git pull` - Puxa código atualizado
2. ✅ Remove stack antiga
3. ✅ Remove imagem antiga
4. ✅ Rebuild da imagem
5. ✅ Deploy com docker stack
6. ✅ Mostra logs em tempo real

---

### `git-deploy.sh` - Enviar para Git

Facilita commit e push para o GitHub.

**Uso local (Windows/Git Bash):**
```bash
# Com Git Bash
bash scripts/git-deploy.sh "Mensagem do commit"

# OU com WSL
./scripts/git-deploy.sh "Mensagem do commit"
```

**O que faz:**
1. ✅ `git add -A` - Adiciona todos os arquivos
2. ✅ Mostra status
3. ✅ Pede confirmação
4. ✅ Faz commit com a mensagem
5. ✅ Faz push para GitHub

---

## 🔧 Tornar Executável

**Na VPS (Linux):**
```bash
chmod +x scripts/*.sh
```

**No Windows:**
- Use Git Bash ou WSL
- Scripts `.sh` não funcionam diretamente no PowerShell

---

## 📝 Exemplos de Uso

### Fluxo completo de atualização:

**1. Local - Fazer mudanças e enviar:**
```bash
# Fazer alterações no código...
bash scripts/git-deploy.sh "Fix: Corrigido bug no login"
```

**2. VPS - Atualizar:**
```bash
ssh root@seu-servidor
cd ~/crm-gest-o-financeira
./scripts/update-vps.sh
```

---

## ⚠️ Notas Importantes

- **Credenciais**: `update-vps.sh` usa credenciais hardcoded. Para produção, considere usar Docker Secrets
- **Confirmação**: `git-deploy.sh` pede confirmação antes do commit
- **Logs**: `update-vps.sh` mostra logs automaticamente (Ctrl+C para sair)
