# 🚀 Guia Completo: Dockerização de Next.js para Docker Swarm com Traefik

Este guia documenta o processo completo de dockerizar uma aplicação Next.js e fazer deploy em um ambiente Docker Swarm com Traefik para HTTPS automático.

---

## 📋 Pré-requisitos

- Docker Swarm inicializado
- Traefik configurado no Swarm
- PostgreSQL rodando no Swarm
- Domínio apontando para o servidor
- Git instalado

---

## ⚠️ ERROS CRÍTICOS A EVITAR

### 1. ❌ Pool PostgreSQL com variáveis erradas

**ERRO COMUM:**
```typescript
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10),
});
```

**✅ CORREÇÃO:**
```typescript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
```

> **Por quê?** Se você usa `DATABASE_URL`, o Pool deve receber `connectionString`, não variáveis individuais!

### 2. ❌ Hostname errado no DATABASE_URL

**ERRO:**
```env
DATABASE_URL=postgresql://user:pass@postgres_container_name.1.xyz123:5432/db
```

**✅ CORRETO:**
```env
DATABASE_URL=postgresql://user:pass@postgres_service_name:5432/db
```

> **Por quê?** No Swarm, use o **nome do serviço** (ex: `pgvector`), NÃO o nome do container!

### 3. ❌ Variáveis ${} não expandidas no docker stack deploy

**ERRO:** Usar `${DOMAIN}` diretamente no `docker-compose.yml` e fazer `docker stack deploy`.

**✅ SOLUÇÃO:** Criar `docker-compose.prod.yml` com valores hardcoded (não versionado no Git).

---

## 🚀 Quick Start (Para quem já fez antes)

```bash
# 1. Código: Ajustar db.ts para usar connectionString
# 2. Código: Adicionar dynamic rendering em layout.tsx
# 3. Git: Commit e push

# 4. VPS: Preparar banco
docker exec <postgres> psql -U postgres <<EOF
CREATE DATABASE crm_gestao;
CREATE USER crm_user WITH PASSWORD 'senha';
GRANT ALL PRIVILEGES ON DATABASE crm_gestao TO crm_user;
EOF

# 5. VPS: Clonar e configurar
git clone https://github.com/user/projeto.git
cd projeto
cp docker-compose.yml docker-compose.prod.yml
# Editar docker-compose.prod.yml: substituir ${VARS} por valores reais

# 6. VPS: Build e deploy
docker build --build-arg DATABASE_URL='postgresql://...' -t app:latest .
docker stack deploy -c docker-compose.prod.yml app_name
docker service logs app_name_service -f
```

---

## 🔧 1. Preparação Local

### 1.1 Criar Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for database URL
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

### 1.2 Configurar `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: 'standalone', // OBRIGATÓRIO para Docker
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Force dynamic rendering (evita erros de build)
  generateBuildId: async () => 'build',
  skipTrailingSlashRedirect: true,
};
```

### 1.3 Forçar Renderização Dinâmica

Adicione em `src/app/layout.tsx`:

```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

E em **TODAS** as páginas que acessam banco de dados:

```typescript
'use client'; // Se for client component

export const dynamic = 'force-dynamic';
```

> ⚠️ **IMPORTANTE:** Páginas com `'use server'` **NÃO** devem ter `export const dynamic`.

### 1.4 Criar `docker-compose.yml` (Template)

```yaml
version: '3.8'

services:
  crm:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        DATABASE_URL: ${DATABASE_URL}
    image: crm-app:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    networks:
      - UniCesumar
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: "1"
          memory: 1024M
      labels:
        - traefik.enable=true
        - traefik.http.routers.crm.rule=Host(`${DOMAIN}`)
        - traefik.http.routers.crm.entrypoints=websecure
        - traefik.http.routers.crm.tls.certresolver=letsencryptresolver
        - traefik.http.routers.crm.priority=1
        - traefik.http.routers.crm.service=crm
        - traefik.http.services.crm.loadbalancer.server.port=3000
        - traefik.http.services.crm.loadbalancer.passHostHeader=true
        - traefik.http.middlewares.sslheader-crm.headers.customrequestheaders.X-Forwarded-Proto=https
        - traefik.http.routers.crm.middlewares=sslheader-crm

networks:
  UniCesumar:
    external: true
    name: UniCesumar
```

### 1.5 Atualizar `.gitignore`

```gitignore
# Production docker-compose with secrets
docker-compose.prod.yml
.env
```

### 1.6 Criar arquivo `.env.example`

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET_KEY=seu_secret_aqui
NEXTAUTH_URL=https://seu-dominio.com
NEXTAUTH_SECRET=seu_secret_aqui
DOMAIN=seu-dominio.com
```

> ⚠️ **IMPORTANTE:** `JWT_SECRET_KEY` e `NEXTAUTH_SECRET` devem ser secrets fortes. Use `openssl rand -base64 32` para gerar.

---

## 🗄️ 2. Preparação do Banco de Dados

### 2.1 Extrair Schema Atual (Local)

```bash
# Se estiver usando Docker local
docker exec -i seu_container_postgres pg_dump -U postgres --schema-only --no-owner seu_banco > schema_atual.sql

# Criar seed data essencial
echo "INSERT INTO usuarios (...) VALUES (...);" >> db_init.sql
```

### 2.2 Criar Script de Inicialização (`db_init.sql`)

```sql
-- Schema
CREATE TABLE IF NOT EXISTS redes (...);
CREATE TABLE IF NOT EXISTS usuarios (...);
-- ... outras tabelas

-- Seed Data
INSERT INTO redes (id, nome) VALUES ('rede_default', 'Rede Padrão');
INSERT INTO usuarios (id, email, senha, "isSuperadmin") 
VALUES ('admin', 'admin@crm.com', '$2b$10$hash...', TRUE);
```

### 2.3 Criar `DB_README.md`

Documente:
- Credenciais padrão
- Como aplicar o schema
- Como fazer backup

---

## 🔐 3. Deploy na VPS

### 3.1 Preparar Banco de Dados no Swarm

```bash
# 1. Identificar container PostgreSQL
docker ps | grep postgres

# 2. Criar banco e usuário
docker exec -it <postgres_container> psql -U postgres <<EOF
CREATE DATABASE crm_gestao;
CREATE USER crm_user WITH PASSWORD 'SenhaForte123!';
GRANT ALL PRIVILEGES ON DATABASE crm_gestao TO crm_user;
ALTER USER crm_user WITH SUPERUSER;
EOF

# 3. Aplicar schema (do repositório)
cd ~/seu-projeto
docker exec -i <postgres_container> psql -U postgres -d crm_gestao < db_init.sql
```

### 3.2 Configurar Repositório Git

```bash
# Na VPS
cd ~
git clone https://github.com/usuario/seu-projeto.git
cd seu-projeto
```

### 3.3 Criar `.env` na VPS

```bash
cat > .env <<EOF
DATABASE_URL=postgresql://crm_user:SenhaForte123!@pgvector:5432/crm_gestao
JWT_SECRET_KEY=$(openssl rand -base64 32)
NEXTAUTH_URL=https://seu-dominio.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
DOMAIN=seu-dominio.com
EOF
```

> ⚠️ **IMPORTANTE:** Use o **nome do serviço Swarm** como host (ex: `pgvector`), **NÃO** o nome do container!

### 3.4 Criar `docker-compose.prod.yml` (HARDCODED)

```bash
# Copiar template
cp docker-compose.yml docker-compose.prod.yml

# Editar e substituir TODAS as ${VARS} com valores reais
nano docker-compose.prod.yml
```

**Exemplo final:**

```yaml
version: '3.8'

services:
  crm:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        DATABASE_URL: postgresql://crm_user:SenhaForte123!@pgvector:5432/crm_gestao
    image: crm-app:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://crm_user:SenhaForte123!@pgvector:5432/crm_gestao
      - NEXTAUTH_URL=https://seu-dominio.com
      - NEXTAUTH_SECRET=abc123xyz789...
    networks:
      - UniCesumar
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: "1"
          memory: 1024M
      labels:
        - traefik.enable=true
        - traefik.http.routers.crm.rule=Host(`seu-dominio.com`)
        - traefik.http.routers.crm.entrypoints=websecure
        - traefik.http.routers.crm.tls.certresolver=letsencryptresolver
        - traefik.http.routers.crm.priority=1
        - traefik.http.routers.crm.service=crm
        - traefik.http.services.crm.loadbalancer.server.port=3000
        - traefik.http.services.crm.loadbalancer.passHostHeader=true
        - traefik.http.middlewares.sslheader-crm.headers.customrequestheaders.X-Forwarded-Proto=https
        - traefik.http.routers.crm.middlewares=sslheader-crm

networks:
  UniCesumar:
    external: true
    name: UniCesumar
```

### 3.5 Build e Deploy

```bash
# 1. Build da imagem
docker build \
  --build-arg DATABASE_URL="postgresql://crm_user:SenhaForte123!@pgvector:5432/crm_gestao" \
  -t crm-app:latest .

# 2. Deploy no Swarm
docker stack deploy -c docker-compose.prod.yml crm

# 3. Verificar
docker service ls | grep crm
docker service logs crm_crm -f
```

Aguarde aparecer: `✓ Ready in XXXms`

### 3.6 Acessar Aplicação

- URL: `https://seu-dominio.com`
- Login: `admin@crm.com`
- Senha: `Admin@2024` (ou a que você definiu)

---

## 🔄 4. Atualizações Futuras

```bash
# Na VPS
cd ~/seu-projeto
git pull
docker stack rm crm
sleep 10
docker build --build-arg DATABASE_URL="..." -t crm-app:latest .
docker stack deploy -c docker-compose.prod.yml crm
docker service logs crm_crm -f
```

---

## ⚠️ Troubleshooting Comum

### Erro: `ECONNREFUSED`

**Causa:** CRM não consegue conectar ao PostgreSQL.

**Solução:**
1. Verificar se usou **nome do serviço** (`pgvector`) e não nome do container
2. Testar conexão:
   ```bash
   docker exec -it $(docker ps -q -f name=crm) sh -c "nc -zv pgvector 5432"
   ```

### Erro: Build falha em páginas estáticas

**Causa:** Next.js tenta pré-renderizar páginas que acessam banco.

**Solução:** Adicionar `export const dynamic = 'force-dynamic';` nas páginas afetadas.

### Erro: 404 Not Found (Traefik)

**Causa:** Labels do Traefik com `${DOMAIN}` vazio.

**Solução:** Usar `docker-compose.prod.yml` com valores hardcoded

### Erro: Bad Gateway

**Causa:** Traefik não encontra o serviço.

**Solução:**
1. Verificar se está na mesma rede:
   ```bash
   docker service inspect crm_crm | grep -A 10 Networks
   ```
2. Aguardar 30s para Traefik detectar e gerar certificado

---

## 📊 Checklist Final

- [ ] `output: 'standalone'` no `next.config.ts`
- [ ] `export const dynamic = 'force-dynamic'` em páginas com DB
- [ ] `docker-compose.prod.yml` criado e NÃO commitado no Git
- [ ] Banco e usuário criados no PostgreSQL
- [ ] Schema aplicado (`db_init.sql`)
- [ ] Variáveis de ambiente corretas (usar nome do **serviço**)
- [ ] Build concluído sem erros
- [ ] Deploy funcionando (`✓ Ready`)
- [ ] Traefik roteando corretamente (sem 404/502)
- [ ] HTTPS automático funcionando

---

## 🎯 Resumo dos Arquivos Importantes

```
projeto/
├── Dockerfile                     # Build da imagem
├── docker-compose.yml             # Template (versionado no Git)
├── docker-compose.prod.yml        # Produção (NÃO versionado)
├── next.config.ts                 # output: 'standalone'
├── src/app/layout.tsx             # dynamic: 'force-dynamic'
├── db_init.sql                    # Schema + seed data
├── DB_README.md                   # Documentação do banco
├── .env.example                   # Template de variáveis
└── .gitignore                     # Ignora .env e prod compose
```

---

## 🔒 Segurança

✅ **Correto:**
- `.env` no `.gitignore`
- `docker-compose.prod.yml` no `.gitignore`
- `docker-compose.yml` com `${VARS}` no Git

❌ **NUNCA:**
- Commitar `.env` ou credenciais
- Hardcoded credentials no `docker-compose.yml` do Git
- Expor portas desnecessárias

---

Este guia pode ser replicado para qualquer projeto Next.js com mínimas adaptações! 🚀
