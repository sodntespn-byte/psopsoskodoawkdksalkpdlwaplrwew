# Pro Soccer Online 2 - Configuração Square Cloud

## Informações do Projeto

Este projeto está configurado para ser hospedado no Square Cloud com as seguintes características:

- **Backend**: Node.js com Express
- **Banco de Dados**: PostgreSQL (Square Cloud Database)
- **Integração**: Discord Webhook
- **Frontend**: HTML/CSS/JavaScript com animações

## Configuração do Ambiente

### 1. Banco de Dados PostgreSQL

O projeto usa o banco de dados PostgreSQL do Square Cloud com as seguintes credenciais:

```
Host: square-cloud-db-ecd0071f6934489597ad31c462ce83f0.squareweb.app
Port: 7196
Database: pro_soccer_online
User: squarecloud
Password: D6tnwcFHKXodmuD9O9bxmQYq
```

### 2. Webhook do Discord

URL do webhook configurado:
```
https://discord.com/api/webhooks/1491233699860058225/qakR6RFDYeqocQMjkwhGRo3FygOdOKkMC4Rdaqt-ruu1K1Pt3cE3IVO0Yq-8vfy5JGQh
```

### 3. Variáveis de Ambiente

As seguintes variáveis de ambiente estão configuradas:

- `NODE_ENV=production`
- `PORT=5001`
- `DATABASE_URL` - String de conexão PostgreSQL
- `JWT_SECRET` - Chave secreta para tokens
- `CORS_ORIGIN` - URL do frontend no Square Cloud

## Estrutura do Projeto

```
pro-soccer-online-2/
|-- server.js                    # Servidor principal
|-- package.json                 # Dependências
|-- squarecloud.json             # Configuração Square Cloud
|-- .env.production              # Variáveis de ambiente
|-- db/
|   |-- database.js              # Configuração PostgreSQL
|-- models/                      # Modelos Sequelize
|   |-- User.js
|   |-- Tournament.js
|   |-- Match.js
|   |-- MatchTeam.js
|   |-- TournamentParticipant.js
|   |-- DiscordEvent.js
|-- webhook/
|   |-- discordWebhook.js         # Handler webhook Discord
|-- scripts/
|   |-- seed-postgres.js          # População do banco
|-- frontend/
|   |-- index.html
|   |-- style.css
|   |-- script.js
|   |-- api.js
```

## Funcionalidades do Sistema

### Backend
- Autenticação JWT
- API RESTful
- Integração com PostgreSQL
- Webhook do Discord
- Rate limiting
- Segurança com Helmet.js

### Frontend
- Design responsivo com animações
- Integração com API
- Sistema de login
- Rankings em tempo real
- Torneios e partidas

### Integração Discord
- Webhook para eventos
- Notificações automáticas
- Vinculação de usuários
- Canais de torneios

## Comandos de Deploy

### 1. Instalar dependências
```bash
npm install
```

### 2. Popular banco de dados
```bash
npm run seed
```

### 3. Iniciar servidor
```bash
npm start
```

## Endpoints da API

### Autenticação
- `POST /api/register` - Registrar usuário
- `POST /api/login` - Fazer login
- `GET /api/user/profile` - Obter perfil
- `PUT /api/user/profile` - Atualizar perfil

### Dados do Jogo
- `GET /api/rankings` - Obter rankings
- `GET /api/tournaments` - Listar torneios
- `GET /api/matches` - Listar partidas
- `POST /api/tournaments` - Criar torneio

### Discord
- `POST /api/discord/link` - Vincular Discord
- `POST /api/discord/notify/tournament/:id` - Notificar torneio
- `POST /api/discord/notify/match/:id` - Notificar partida

### Webhook
- `POST /webhook/discord` - Receber eventos Discord
- `GET /webhook/discord/status` - Verificar status

## Configuração do Square Cloud

### 1. Arquivo squarecloud.json
```json
{
  "name": "pro-soccer-online-2",
  "description": "Pro Soccer Online 2 - Sistema completo",
  "version": "1.0.0",
  "main": "server.js",
  "author": "Pro Soccer Online Team",
  "license": "MIT"
}
```

### 2. Configuração de Domínio
- URL: `https://pro-soccer-online.squareweb.app`
- Porta: 5001
- Protocolo: HTTP/HTTPS

### 3. Configuração de Banco de Dados
- Tipo: PostgreSQL
- Host: Configurado no Square Cloud
- Porta: 7196
- Database: pro_soccer_online

## Monitoramento e Logs

### Logs do Sistema
- Logs de acesso: Morgan
- Logs de erro: Console
- Logs do Discord: Eventos registrados

### Métricas
- Uso de memória
- Requisições por segundo
- Conexões de banco de dados
- Eventos do Discord

## Segurança

### Proteções Implementadas
- Helmet.js para headers de segurança
- CORS configurado
- Rate limiting
- Validação de entrada
- Hash de senhas
- Tokens JWT

### Certificados SSL
- Certificado fornecido pelo Square Cloud
- Configuração em `.env.production`

## Backup e Manutenção

### Backup do Banco de Dados
- Backup automático do Square Cloud
- Retenção de 30 dias
- Restore via painel

### Manutenção
- Logs rotativos
- Limpeza de eventos antigos
- Monitoramento de performance

## Suporte

### Problemas Comuns
1. **Conexão com banco**: Verificar string de conexão
2. **Webhook Discord**: Verificar URL e token
3. **CORS**: Configurar origem correta
4. **Rate Limit**: Ajustar limites se necessário

### Contato
- GitHub: Issues no repositório
- Discord: Canal de suporte
- Email: support@pro-soccer-online.com

## Deploy Automatizado

### GitHub Actions (Opcional)
```yaml
name: Deploy to Square Cloud
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Square Cloud
      run: |
        # Comandos de deploy
```

### CI/CD Pipeline
1. Testes automatizados
2. Build do projeto
3. Deploy para Square Cloud
4. Verificação de saúde

---

**Nota**: Este projeto está otimizado para o ambiente Square Cloud com PostgreSQL e integração completa com Discord.
