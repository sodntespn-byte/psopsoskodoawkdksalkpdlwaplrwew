# Banco de dados (PostgreSQL — Neon / Square Cloud)

## Variáveis de ambiente

O app lê a URL do banco nesta ordem: `BANCO_DADOS` → `DATABASE_URL` → `DB_URL`.

1. **Crie um arquivo `.env`** na raiz do projeto (copie de `.env.example`).
2. **Defina uma das variáveis** com sua URL de conexão, por exemplo:
   ```env
   DATABASE_URL=postgresql://usuario:senha@host:porta/banco?sslmode=require
   ```
3. **Nunca commite `.env`** — ele já está no `.gitignore`. No GitHub, use **Secrets** (Settings → Secrets and variables → Actions) ou variáveis de ambiente do seu provedor de deploy.

### Neon

- Use a URL do **connection pooler** (recomendado para serverless/deploy):
  - Formato: `postgresql://USER:PASSWORD@ep-XXX-pooler.REGION.aws.neon.tech/neondb?sslmode=require`
- O Neon aceita conexões de qualquer IP desde que use **SSL** (`?sslmode=require`).

### Square Cloud

- No deploy, a Square Cloud pode injetar a variável **`BANCO_DADOS`** automaticamente se você configurou o banco no painel.
- Se usar banco da própria Square Cloud, configure a URL nas variáveis do app no painel; não coloque a senha no código.

---

## Erro "no pg_hba.conf entry" e o IP 162.249.173.59

A mensagem **"no pg_hba.conf entry for host …"** significa que o **servidor PostgreSQL** recusou a conexão porque não existe uma regra no `pg_hba.conf` permitindo aquele **host (IP)** para o usuário/método usado.

### Por que o host 162.249.173.59 é rejeitado?

- **162.249.173.59** é o **IP de saída** da sua aplicação quando ela roda na **Square Cloud** (ou outro provedor). Ou seja: o banco "vê" a conexão vindo desse IP.
- Se o banco for:
  - **Neon**: em geral **não** restringe por IP; ele exige SSL. O erro costuma ser por **não usar SSL** ou URL errada. Use `?sslmode=require` na URL.
  - **Square Cloud (banco deles)** ou **outro PostgreSQL gerenciado**: o provedor pode ter **whitelist de IPs**. Nesse caso, é preciso **liberar o IP 162.249.173.59** no painel do banco (ou adicionar uma regra que permita esse IP no `pg_hba.conf`, se você tiver acesso ao servidor do banco).
  - **PostgreSQL próprio (VPS, etc.)**: o `pg_hba.conf` no servidor do banco define quem pode conectar. Para aceitar conexões da Square Cloud, é necessário uma linha permitindo o IP (ou a rede) de origem, por exemplo:
    ```text
    host  all  all  162.249.173.59/32  scram-sha-256
    ```
    Depois, recarregar o PostgreSQL (`pg_ctl reload` ou `service postgresql reload`).

### Resumo

| Onde o banco está        | O que fazer                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Neon**                 | Usar URL com `?sslmode=require`; não costuma bloquear por IP.                                                                     |
| **Square Cloud (banco)** | No painel da Square Cloud, liberar/whitelist do IP **162.249.173.59** (ou ver na documentação deles como liberar IPs de conexão). |
| **Seu próprio servidor** | No servidor do PostgreSQL, editar `pg_hba.conf` para permitir 162.249.173.59 e recarregar o serviço.                              |

Depois de ajustar o banco (SSL na URL no Neon ou liberação do IP no provedor/servidor), use apenas variáveis de ambiente (`.env` local e variáveis no deploy) para a URL — sem senha no código nem no GitHub.
