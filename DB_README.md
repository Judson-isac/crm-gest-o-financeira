# 🗄️ Inicialização do Banco de Dados

## Credenciais Padrão (ALTERE após primeiro login!)

📧 **Email:** `admin@crm.com`  
🔑 **Senha:** `Admin@2024`

---

## Como Usar

### Na VPS (Deploy)

```bash
# Executar migration
docker exec -i pgvector_pgvector.1.oltiobu9m52thyvfomv2w8c0o psql -U postgres -d crm_gestao < db_init.sql
```

### Localmente (Desenvolvimento)

```bash
psql -U postgres -d seu_banco < db_init.sql
```

---

## O que está incluído

✅ **Schema completo** - Todas as tabelas necessárias  
✅ **Rede padrão** - Rede Principal pré-criada  
✅ **Função Superadmin** - Perfil com todas permissões  
✅ **Usuário Superadmin** - Login inicial  
✅ **Tipos de Curso** - 5 tipos pré-cadastrados  
✅ **Configurações** - Sistema e Ranking inicializados

---

## Segurança

🔒 Este arquivo é **SEGURO** para Git - contém apenas:
- Estrutura do banco (DDL)
- Dados mínimos necessários
- **NÃO** contém dados sensíveis de produção

⚠️ **NUNCA** comite arquivos com dados reais de clientes!
