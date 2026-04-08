# Segurança e Privacidade — LIBERTY

Este documento descreve as práticas de segurança e privacidade do projeto.

## Variáveis de ambiente (nunca no código)

- **DATABASE_URL** — URL do PostgreSQL. Defina no `.env` ou no painel do host. Nunca commite.
- **JWT_SECRET** — Segredo para assinatura de tokens (mín. 32 caracteres em produção). Defina no `.env`.
- **ADMIN_USERNAMES** — Lista de usernames com permissão de administrador, separados por vírgula (ex.: `user1,user2`). Não deixe vazio em produção; nunca hardcode no código.
- **ALLOWED_ORIGIN** ou **CORS_ORIGIN** — Origens permitidas para CORS, separadas por vírgula (ex.: `https://app.seudominio.com`). Em produção, restrinja ao domínio oficial.
- **RATE_LIMIT_MAX** — (Opcional) Máximo de requisições por minuto por IP. Padrão: 200.
- **NODE_ENV** — `production` ou `development`. Em produção, DATABASE_URL e JWT_SECRET são obrigatórios.

O `.gitignore` exclui `.env`, `.env.local` e variantes. **Nunca** suba ficheiros com credenciais.

## Identidade do utilizador (apenas no servidor)

- **Quem é o utilizador** é definido **unicamente** no backend a partir do JWT (claim `sub`). O valor `req.userId` é atribuído pelo middleware de autenticação após verificação do token; **nunca** é lido de `req.body`, `req.query` ou `req.params`.
- Nomes de autor em mensagens, donos de servidores e membros são sempre obtidos na base de dados usando `req.userId`; o campo `author` do corpo de mensagens é ignorado para efeitos de identidade.
- Qualquer rota que precise do utilizador autenticado usa `auth.requireAuth` e depois `req.userId`. Não existe forma de “setar” o user do servidor pelo cliente para além de enviar um token válido.

## Blindagem de segurança

- **Helmet.js** — Headers HTTP seguros: CSP (Content-Security-Policy), HSTS (Strict-Transport-Security), X-XSS-Protection, X-Content-Type-Options (noSniff), X-Frame-Options, referrer-policy, hide X-Powered-By.
- **CORS** — Restrito às origens em `ALLOWED_ORIGIN`/`CORS_ORIGIN`. Em produção sem variável, CORS rejeita origens externas.
- **Rate limiting** — Limite geral por IP (por minuto) e limite mais restritivo em `/api/v1/auth` (10 pedidos por 15 minutos, anti força bruta).
- **Validação e sanitização de entradas** — Joi em registo, login, refresh, mensagens, PATCH servidor/canal, bans, chamadas e relações. Módulo `backend/src/lib/sanitize.js`: sanitização de conteúdo de mensagens (trim, remoção de caracteres de controlo, limite de tamanho), nomes (servidor/canal), motivos de ban, usernames. Parâmetros `serverId`, `channelId`, `userId`, `messageId`, `relationshipId` e `id` são validados como UUID onde aplicável (`requireUuidParams`).
- **Mensagens** — Conteúdo sanitizado antes de guardar; escape HTML é feito no frontend ao renderizar (evita XSS). Autor das mensagens vem sempre da base de dados associada a `req.userId`.
- **Senhas** — Armazenadas com bcrypt (hash). Nunca logadas nem devolvidas na API.
- **Cookies de sessão** — Em produção o cookie `liberty_token` é enviado com `httpOnly` e `secure`, reduzindo risco de roubo via XSS e garantindo envio apenas por HTTPS.
- **Respostas de erro** — Em produção as respostas da API não expõem mensagens internas (stack, paths ou detalhes do servidor); apenas mensagens genéricas.

## Privacidade e logs

- O logger em `backend/src/lib/logger.js` redacta automaticamente: `password`, `token`, `access_token`, `refresh_token`, `authorization`, `cookie`, `secret`, `api_key` e campos similares.
- Em erros e logs, **nunca** são registados: corpo de pedidos com senhas, tokens, ou dados pessoais completos (PII). Apenas mensagens de erro genéricas (ex.: `err.message`).
- Em produção, evite logar stacks completos ou objetos de request/response que possam conter dados sensíveis.

## Front-end

- O cliente usa **apenas URLs relativas** (`/api/v1/...`). O backend e o front são servidos pela mesma origem; não há exposição de endpoints internos nem chaves no código do navegador.
- **XSS** — Todo o conteúdo gerado por utilizadores (nomes, mensagens, URLs) é escapado com `escapeHtml()` antes de ser inserido em `innerHTML`. Em mensagens, o parsing de menções e links usa sempre valores escapados no `href` e no texto.
- Tokens de sessão podem ficar em `localStorage` e são enviados via header `Authorization: Bearer` e `X-Auth-Token`. Em produção o cookie httpOnly também é enviado automaticamente com `credentials: 'include'`. Não envie tokens em query strings.
- **Nenhuma chave de API** de serviços externos deve ser colocada no front-end. Integrações que exijam chaves devem ser feitas apenas no backend (proxy ou serverless).

## Recomendações adicionais

- Coloque a aplicação atrás de um **reverse proxy** (nginx, Cloudflare, etc.) com HTTPS.
- Em produção, defina **ALLOWED_ORIGIN** com o domínio oficial do front-end.
- Revise periodicamente dependências (`npm audit`) e actualize pacotes com vulnerabilidades conhecidas.
- Para máxima privacidade, considere não armazenar conteúdo sensível em texto plano no banco; use encriptação em repouso se exigido pela política de dados.
