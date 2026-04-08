# Deploy Liberty na Square Cloud

## Arquivo de entrada (evitar MISSING_MAIN)

- O ponto de entrada da aplicação é **`backend/server.js`** (pasta `backend/`).
- O ficheiro **`squarecloud.app`** na raiz tem `START=npm install ... && node backend/server.js`.
- O **`package.json`** na raiz tem `"main": "backend/server.js"` e `"start": "node backend/server.js"`.
- A Square Cloud usa a **raiz do repositório**; o comando de arranque sobe o backend, que serve a API e o frontend (pasta `frontend/`).

## 1. Variáveis de ambiente (obrigatório)

A aplicação está preparada para a **Square Cloud**: aceita muitos nomes de variável para a base de dados e carrega `.env` de várias pastas. Mesmo assim, **tens de definir as variáveis no painel**.

**Onde definir:** na Square Cloud → tua aplicação → **Configurações** (ou Settings) → **Environment** / **Variáveis de ambiente** → **Adicionar variável**.

| Variável       | Obrigatório | O que colocar |
| -------------- | ----------- | ------------- |
| `JWT_SECRET`   | **Sim**     | Nome: `JWT_SECRET`. Valor: uma string com **pelo menos 32 caracteres** (ex.: saída de `openssl rand -base64 32`). |
| `DATABASE_URL` | **Sim**     | Nome: `DATABASE_URL`. Valor: a connection string completa do Neon (ex.: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`). |

**Nomes aceites para a URL do banco** (se não usares `DATABASE_URL`): `BANCO_DADOS`, `DB_URL`, `Database`, `DATABASE`, `POSTGRES_URL`, `POSTGRESQL_URL`, e outros. O valor tem de começar por `postgres` ou `postgresql://`.

| `NODE_ENV` | Não | A Square Cloud costuma definir `production` automaticamente. |

**Como gerar um JWT_SECRET seguro (32+ caracteres):**
```bash
openssl rand -base64 32
```
Copia o resultado e cola no valor de `JWT_SECRET` no painel.

**Passo a passo na Square Cloud:**
1. Abre a tua **app** no dashboard.
2. Entra em **Configurações** (ou **Settings** / ícone de engrenagem).
3. Procura **Environment**, **Variáveis de ambiente** ou **Env Variables**.
4. Clica em **Adicionar** / **Add**.
5. **Nome (key):** `DATABASE_URL` (exatamente assim, maiúsculas).
6. **Valor (value):** cola a connection string do Neon (postgresql://...).
7. Repete para `JWT_SECRET` (nome: `JWT_SECRET`, valor: string longa).
8. Guarda e faz **Redeploy** da aplicação.

**Importante:** depois de adicionar ou alterar variáveis, é obrigatório **Redeploy** (ou Reiniciar) — as variáveis são lidas apenas ao iniciar o processo.

---

### Se as variáveis do painel não funcionarem: ficheiro `.env.squarecloud`

A app também lê um ficheiro **`.env.squarecloud`** na **raiz do projeto**. Se na Square Cloud as variáveis do painel não forem injetadas, podes usar este ficheiro e fazê-lo commit para o deploy.

1. Na raiz do projeto, copia o exemplo:
   ```bash
   cp .env.squarecloud.example .env.squarecloud
   ```
2. Edita `.env.squarecloud` e coloca a tua `DATABASE_URL` e `JWT_SECRET` (um por linha, formato `NOME=valor`).
3. Faz commit e push (incluindo `.env.squarecloud`). **Só faz isto se o repositório for privado** — o ficheiro contém credenciais.
4. Na Square Cloud, faz **Redeploy**. O servidor vai carregar `.env.squarecloud` automaticamente.

O `.env.squarecloud` não está no `.gitignore`, por isso será enviado no deploy. Para maior segurança, prefere sempre usar as variáveis do painel quando conseguires.

- Nome exato: `DATABASE_URL` (tudo junto, maiúsculas). Podes colar a URL do Neon com `channel_binding=require`; o servidor remove esse parâmetro automaticamente.
- O backend usa **PostgreSQL** (Neon). Na primeira subida, o schema é aplicado automaticamente. Se as tabelas já existirem, os `CREATE` são ignorados.

## 2. Repositório e push

Repositório remoto correto:

```bash
git remote -v
# origin  https://github.com/sodntespn-byte/asdontellhimuinhim.git (fetch)
# origin  https://github.com/sodntespn-byte/asdontellhimuinhim.git (push)
```

Para enviar o código e a Square Cloud usar o main:

```bash
git add .
git commit -m "Deploy: backend + frontend, schema PostgreSQL"
git push origin main
```

Se o branch principal for `master`:

```bash
git push origin master
```

Depois do push, no dashboard Square Cloud: **Deploy** / **Commit** / **Update** para a plataforma puxar o código e reiniciar a app.

## 3. Schema manual (opcional)

Se quiseres aplicar o schema no Neon sem subir o servidor (por exemplo a partir da tua máquina):

```bash
npm run db:push
```

Requer `DATABASE_URL` no `.env` (na raiz) ou no ambiente.

## 4. Resumo de ficheiros importantes na raiz

| Ficheiro / Pasta   | Função |
|--------------------|--------|
| `backend/server.js` | Entrada da app (Express, API, WebSocket, servir frontend). |
| `squarecloud.app`   | Configuração Square Cloud (START, MEMORY, HOST). |
| `package.json`      | Scripts `start`, `db:push`; dependências. |
| `frontend/`         | Ficheiros estáticos servidos pelo backend. |
| `backend/db/`       | Schema e helpers PostgreSQL. |
