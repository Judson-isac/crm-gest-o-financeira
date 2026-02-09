# Protocolo de Deploy (IMPORTANTE)

Este arquivo serve como **REGRA ABSOLUTA** para o Agente (Você).

## 1. NUNCA use `git add`, `git commit` ou `git push` manualmente.

## 2. SEMPRE use o script de deploy:
```bash
./scripts/git-deploy.sh -y "Sua mensagem de commit aqui"
```

### Por que?
- O script garante que o código vai para `main` E `master`.
- Evita conflitos de branch na VPS.
- Garante padronização.

## 3. Em caso de erro na VPS:
Sempre instrua o usuário a rodar:
```bash
./scripts/update-vps.sh
```
(Este script agora contém a lógica de auto-correção `force`).

---
**LEMBRETE:** Se você (Agente) estiver prestes a rodar um comando git manual, **PARE** e use o script acima.
