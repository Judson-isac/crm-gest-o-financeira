# Guia de Solução de Problemas: Git e Deploy na VPS

Este guia ajuda a resolver problemas comuns ao atualizar o sistema na VPS via Git.

## 1. Erro: "Already up to date" mas o código é velho
**Sintoma:** Você fez commits no GitHub, mas a VPS diz que já está atualizada e não baixa nada.
**Causa:** A VPS pode estar na branch `master` e você enviou para `main` (ou vice-versa), e elas estão dessincronizadas.

**Solução:**
```bash
# 1. Garanta que está na branch main (padrão do projeto)
git checkout main

# 2. Force o download da branch main
git pull origin main
```

## 2. Erro: "Local changes ... would be overwritten by merge"
**Sintoma:** O Git recusa atualizar porque detectou mudanças manuais em arquivos na VPS (ex: permissões de execução alteradas).
**Causa:** Scripts (`.sh`) foram modificados localmente (ex: `chmod +x`).

**Solução (Reset Total):**
Isso descarta TUDO que foi alterado na VPS e deixa igual ao GitHub.
```bash
git reset --hard origin/main
```
*Se der erro de branch, tente `git reset --hard origin/master`*

## 3. Erro: "./scripts/update-vps.sh: Permission denied"
**Sintoma:** O script existe mas o Linux não deixa rodar.
**Causa:** O Git reset ou clone pode remover a "flag" de executável.

**Solução:**
```bash
chmod +x scripts/*.sh
```

## 4. Onde está o container? Qual o ID?
Comandos úteis para investigar o Docker:

```bash
# Ver containeres rodando
docker ps

# Ver logs do serviço (se usar Swarm)
docker service logs -f crm_crm

# Ver logs de um container específico
docker logs <CONTAINER_ID> -f

# Entrar no container
docker exec -it <CONTAINER_ID> /bin/sh
```

## Checklist de Atualização Manual (Se o script falhar)
Se o `update-vps.sh` falhar, faça manualmente:

1. `git reset --hard origin/main` (Limpa bagunça)
2. `git pull origin main` (Baixa código novo)
3. `docker stack rm crm` (Remove sistema antigo)
4. `docker rmi crm-app:latest` (Remove imagem velha)
5. `docker build -t crm-app:latest .` (Cria imagem nova)
6. `docker stack deploy -c docker-compose.prod.yml crm` (Sobe o sistema)
