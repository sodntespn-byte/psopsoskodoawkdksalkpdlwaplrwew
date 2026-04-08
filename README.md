# Pro Soccer Online 2 - Backend# PSO Brasil - Cyberpunk Minimalist Football Platform

## Visão Geral

Plataforma de futebol brasileiro com estética cyberpunk minimalista, segurança militar e arquitetura multi-páginas. Sem emojis, apenas ícones vetoriais e design clean.

## Features Principais

### Estética Cyber-Brasil
- **Fundo**: Azul marinho profundo (#05070A)
- **Acentos**: Verde neon (#00FF41) e amarelo elétrico (#FFD700)
- **Tipografia**: Rajdhani/Inter (estilo técnico)
- **Design**: Clean, minimalista, sem elementos de apostas
- **Ícones**: Apenas Lucide React vetoriais (ZERO EMOJIS)

### Segurança Militar
- **Criptografia**: AES-256-GCM para dados sensíveis
- **HMAC**: Verificação de integridade de webhooks
- **Rate Limiting**: Proteção contra DoS
- **CSP**: Headers de segurança completos
- **Auditoria**: Logs detalhados e rastreáveis

### Arquitetura Multi-Páginas
- **Dashboard** (`/`): Resumo com últimos resultados
- **Classificação** (`/classificacao`): Tabela técnica de pontos
- **Transferências** (`/transferencias`): Mural de mercado
- **Times** (`/times`): Galeria de clubes com escudos
- **Admin** (`/admin`): Painel privado de gestão

## Instalação Rápida

### 1. Clonar o Projeto
```bash
git clone <repository-url>
cd pso-brasil
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
```

Editar o arquivo `.env`:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pso_brasil"

# Security
ENCRYPTION_KEY="9S1t1L?4`;MytM=,z/Q~R=69!>WO?X0M"
WEBHOOK_HMAC_SECRET="super_secret_hmac_key_here"
TRANSFER_SECRET_KEY="webhook_secret_key_here"

# Discord
DISCORD_BOT_TOKEN="your_discord_bot_token"
DISCORD_WEBHOOK_URL="your_discord_webhook_url"

# Server
PORT=3000
NODE_ENV="production"

# SquareCloud
BASE_URL="https://your-app.squarecloud.app"
```

### 4. Configurar Banco de Dados
```bash
# Gerar cliente Prisma
npm run prisma:generate

# Rodar migrations
npm run prisma:push

# Popular banco com dados iniciais
npm run prisma:seed
```

### 5. Iniciar Servidor
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## Configuração do Banco de Dados

### PostgreSQL Setup

1. **Criar banco de dados:**
```sql
CREATE DATABASE pso_brasil;
CREATE USER pso_brasil WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pso_brasil TO pso_brasil;
```

2. **Configurar connection string:**
```env
DATABASE_URL="postgresql://pso_brasil:your_password@localhost:5432/pso_brasil"
```

### Schema do Prisma

O schema define as seguintes tabelas principais:
- `League` - Ligas e campeonatos
- `Team` - Times e clubes
- `Player` - Jogadores
- `Match` - Partidas e resultados
- `Transfer` - Transferências (com dados criptografados)
- `TeamStats` - Estatísticas dos times

### Migrations

As migrations são geradas automaticamente pelo Prisma:
```bash
npm run prisma:migrate dev
npm run prisma:migrate deploy  # Para produção
```

## Configuração de Criptografia

### Chave de Criptografia

A chave AES-256-GCM já está definida:
```javascript
const ENCRYPTION_KEY = Buffer.from('9S1t1L?4`;MytM=,z/Q~R=69!>WO?X0M', 'utf8');
```

**IMPORTANTE**: Em produção, use uma chave única e segura!

### Campos Criptografados

Os seguintes campos são criptografados automaticamente:
- `salary` (salários)
- `feePaid` (taxas de transferência)
- `releaseClause` (cláusulas de rescisão)

### Exemplo de Uso

```javascript
const { getEncryptionManager } = require('./lib/encryption');
const encryptionManager = getEncryptionManager();

// Criptografar
const encrypted = encryptionManager.encryptFields({
  salary: 5.5,
  feePaid: 25.0,
  releaseClause: 50.0
}, ['salary', 'feePaid', 'releaseClause']);

// Descriptografar
const decrypted = encryptionManager.decryptFields(encrypted, ['salary', 'feePaid', 'releaseClause']);
```

## Configuração do Discord

### Bot Commands

Comandos disponíveis no Discord:
- `/postar-resultado` - Registrar resultados de partidas
- `/set-foto` - Atualizar fotos de times
- `/set-ordem` - Definir ordem das ligas
- `/registrar-transferencia` - Registrar transferências

### Webhook Setup

1. **Criar aplicação no Discord Developer Portal**
2. **Habilitar intents necessários**:
   - `GatewayIntentBits.Guilds`
   - `GatewayIntentBits.GuildMessages`
   - `GatewayIntentBits.MessageContent`
3. **Registrar comandos slash**
4. **Configurar webhook URL**

### Exemplo de Uso

```javascript
// Registrar transferência
/registrar-transferencia
# Modal aparece com campos:
# Nome do Jogador
# Clube Antigo
# Novo Clube
# Duração
# Salário
# Taxa Paga
# Cláusula de Rescisão
```

## Deploy na SquareCloud

### 1. Preparação

1. **Configurar `ecosystem.config.js`:**
```javascript
module.exports = {
  startCommand: 'npm start',
  buildCommand: 'npm run build',
  installCommand: 'npm install',
  restartOnFail: true,
  maxRestarts: 3,
  healthCheckPath: '/api/health',
  healthCheckGracePeriod: 10000
};
```

2. **Configurar `squarecloud.yml`:**
```yaml
startCommand: npm start
buildCommand: npm run build
installCommand: npm install
restartOnFail: true
maxRestarts: 3
healthCheckPath: /api/health
```

### 2. Variáveis de Ambiente

Configure no painel SquareCloud:
- `DATABASE_URL`
- `ENCRYPTION_KEY`
- `DISCORD_BOT_TOKEN`
- `WEBHOOK_HMAC_SECRET`
- `TRANSFER_SECRET_KEY`
- `NODE_ENV=production`

### 3. Deploy Automático

```bash
# Deploy automático
npm run deploy

# Ou manual
git push origin main
```

## Estrutura de Arquivos

### Backend
```
server.js              # Servidor Express
lib/                   # Bibliotecas principais
  encryption.js        # Gerenciador de criptografia
  apiSecurity.js       # Middleware de segurança
  auditLogger.js        # Sistema de auditoria
  prisma.js            # Cliente Prisma
  schemas.js            # Schemas de validação
  standings.js          # Lógica de classificação

api/                   # API Routes
  matches/
    recent.js          # Últimas partidas
    [matchId]/
      update-standings.js
  transfers/
    webhook.js          # Webhook de transferências
    index.js            # Listagem de transferências
  leagues/
    [leagueId]/
      standings.js      # Classificação da liga

middleware/             # Middlewares
  security.js           # Headers de segurança
  attackProtection.js   # Proteção contra ataques
  websocket.js          # WebSocket
  adminAuth.js          # Autenticação admin
```

### Frontend
```
pages/                  # Páginas HTML
  index.html            # Dashboard
  classificacao.html     # Classificação
  transferencias.html   # Transferências
  times.html            # Times
  admin.html            # Admin

components/             # Componentes React
  common/
    Layout.jsx
    Navigation.jsx
    Header.jsx
  dashboard/
    RecentMatches.jsx
    StatsOverview.jsx
  classification/
    StandingsTable.jsx
  transfers/
    TransferCard.jsx
    TransferMarket.jsx
  teams/
    TeamCard.jsx
    TeamGallery.jsx
  admin/
    AdminPanel.jsx
```

### Banco de Dados
```
prisma/
  schema.prisma          # Schema do banco
  migrations/            # Migrações
  seed-data/             # Dados iniciais
```

## Páginas Detalhadas

### Dashboard (`/`)
- **Visão geral** com estatísticas
- **Últimos resultados** em tempo real
- **Status do sistema** (segurança, conexões)
- **Navegação rápida** para outras seções

### Classificação (`/classificacao`)
- **Tabela técnica** com pontos, vitórias, saldo
- **Filtros** por liga e temporada
- **Ordenação automática** (pontos > vitórias > saldo)
- **Design limpo** sem elementos de aposta

### Transferências (`/transferencias`)
- **Cards de contratos** com fotos dos clubes
- **Timeline** ou **grid** de visualização
- **Animações** Framer Motion de entrada
- **Filtros** por liga e valor

### Times (`/times`)
- **Galeria** com escudos dos clubes
- **Informações detalhadas** de cada time
- **Estatísticas** e histórico
- **Busca** e filtros avançados

### Admin (`/admin`)
- **Painel privado** com autenticação
- **Gestão** de usuários e permissões
- **Logs** de auditoria e segurança
- **Status** do sistema em tempo real

## Segurança

### Criptografia AES-256-GCM

Dados sensíveis são criptografados antes de salvar:
```javascript
// Exemplo de dado criptografado no banco
{
  "salary": {
    "encrypted": "encrypted_data_hex",
    "iv": "unique_iv_hex",
    "authTag": "integrity_tag_hex",
    "algorithm": "aes-256-gcm",
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

### Rate Limiting

Configurações de rate limiting:
```javascript
// Por IP
windowMs: 15 * 60 * 1000,  // 15 minutos
maxRequests: 100,              // Máximo 100 requisições
blockDuration: 30 * 60 * 1000 // Bloquear 30 minutos

// Por endpoint
'/api/transfers/webhook': {
  windowMs: 60 * 1000,        // 1 minuto
  maxRequests: 10,             // Máximo 10 transferências
  blockDuration: 5 * 60 * 1000  // Bloquear 5 minutos
}
```

### CSP Headers

Headers de segurança aplicados:
```javascript
{
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' ws: wss:",
    "object-src 'none'",
    "frame-ancestors 'none'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

## Monitoramento e Logs

### Sistema de Auditoria

Eventos registrados:
- Operações críticas
- Tentativas de acesso
- Atividades suspeitas
- Mudanças de dados

### Logs de Segurança

Logs estruturados:
```javascript
{
  timestamp: "2024-03-15T10:30:00.000Z",
  level: "INFO",
  action: "TRANSFER_CREATED",
  operationHash: "sha256_hash",
  data: {
    transferId: "transfer_123",
    playerName: "encrypted_hash",
    feePaid: { type: "encrypted_numeric", hash: "sha256", range: "10-50" }
  },
  context: {
    sessionId: "session_456",
    traceId: "trace_789",
    ip: "hashed_ip",
    userAgent: "sanitized_ua"
  }
}
```

## Troubleshooting

### Problemas Comuns

#### 1. Conexão com Banco de Dados
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
psql -h localhost -U pso_brasil -d pso_brasil

# Verificar string de conexão
echo $DATABASE_URL
```

#### 2. Bot Discord Não Responde
```bash
# Verificar token do bot
echo $DISCORD_BOT_TOKEN

# Verificar permissões
# Ir ao Discord Developer Portal e conferir intents

# Testar webhook
curl -X POST $DISCORD_WEBHOOK_URL -H "Content-Type: application/json" -d '{"content": "test"}'
```

#### 3. Criptografia Não Funciona
```bash
# Verificar chave de criptografia
echo $ENCRYPTION_KEY | wc -c
# Deve retornar 32

# Testar criptografia
node -e "console.log(Buffer.from('9S1t1L?4`;MytM=,z/Q~R=69!>WO?X0M', 'utf8').length)"
```

#### 4. Rate Limiting Bloqueando Acesso
```bash
# Verificar logs de rate limiting
grep "rate limit" logs/app.log

# Limpar rate limits (se necessário)
rm -rf node_modules/.cache
npm cache clean --force
```

### Logs de Erro

Logs importantes:
- `logs/app.log` - Logs do servidor
- `logs/security.log` - Logs de segurança
- `logs/audit.log` - Logs de auditoria
- `logs/error.log` - Logs de erros

## Performance

### Otimizações Implementadas

1. **Cache Inteligente**: 2 minutos para dados estáticos
2. **Lazy Loading**: Carregar componentes sob demanda
3. **Virtual Scroll**: Para grandes volumes de dados
4. **WebSocket**: Atualizações em tempo real
5. **Compression**: Gzip para respostas HTTP

### Métricas de Performance

- **Response Time**: < 200ms para API
- **Database Queries**: < 50ms para consultas simples
- **WebSocket Latency**: < 50ms para mensagens
- **Page Load**: < 2s para primeira carga

## Contribuição

### Padrões de Código

1. **ZERO EMOJIS**: Use apenas ícones Lucide React
2. **Tipografia**: Rajdhani para títulos, Inter para corpo
3. **Cores**: Apenas paleta Cyber-Brasil definida
4. **Segurança**: Sempre validar e sanitizar inputs
5. **Documentação**: Comentários claros e concisos

### Fluxo de Contribuição

1. Fork do projeto
2. Branch feature/nome-da-feature
3. Implementar mudanças
4. Testar thoroughly
5. Submeter Pull Request
6. Code review e merge

## Licença

MIT License - PSO Brasil Team

## Suporte

- **Issues**: [GitHub Issues](https://github.com/pso-brasil/pso-brasil/issues)
- **Discord**: Servidor de suporte
- **Email**: support@pso-brasil.football

---
