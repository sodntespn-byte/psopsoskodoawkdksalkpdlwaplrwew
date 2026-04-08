# PSO Brasil Bot - Documentação Completa

## Visão Geral

Sistema de bot Discord configurável para gestão da liga PSO Brasil, com estética Cyber-Brasil e segurança militar.

## Estrutura do Bot

```
bot/
|   index.js              # Entry point com sharding
|   botShard.js           # Individual shard
|   botHandler.js         # Main bot handler
|   commands/             # Comandos slash
|   |   configurar.js     # Configuração do servidor
|   |   mercado.js        # Comandos de mercado
|   |   partida.js        # Comandos de partida
|   |   status.js          # Diagnóstico do sistema
|   handlers/             # Handlers de componentes
|   |   configHandler.js  # Select menus de config
|   |   marketHandler.js  # Modais de transferência
|   |   matchHandler.js   # Modais de partida
|   
lib/
|   healthMonitor.js      # Monitoramento ativo do sistema
|   errorHandler.js       # Captura global de erros
|   encryption.js         # Criptografia AES-256-GCM
|   
components/
|   DashboardStatus.jsx   # Componente React para dashboard
```

## Comandos Disponíveis

### /configurar
Configura canais e cargos para o funcionamento do bot.

**Permissão:** Administrador

**Opções:**
- Canal de Resultados
- Canal de Mercado
- Canal de Logs
- Canal de Logs Técnicos (NOVO)
- Cargos de Admin
- Cargos de Moderador
- Status da Liga
- Ver Configurações Atuais

### /status (NOVO)
Comando de diagnóstico técnico do sistema.

**Permissão:** Administrador

**Retorna:**
- Latência do Bot: em ms
- Status do Banco: Online/Offline
- Uso de Memória: Ocupação atual na SquareCloud
- Últimos Erros: Lista dos últimos 3 erros de sistema
- Status do Monitoramento: Ativo/Inativo
- Métricas do Sistema: Uptime, Node.js, Plataforma

### /mercado anunciar
Abre um modal para anunciar transferência no mercado.

**Permissão:** Admin ou Moderador

**Campos do Modal:**
- Nome do Jogador (obrigatório)
- Clube Antigo (ou VLOCE para Agente Livre)
- Novo Clube (obrigatório)
- Duração em meses
- Salário em milhões

**Processamento:**
1. Validação dos dados
2. Busca dos times no banco
3. Criptografia AES-256-GCM dos valores
4. Criação da transferência
5. Log da ação
6. Anúncio no canal configurado
7. Notificação WebSocket para o site

### /mercado ultimos
Lista as últimas 5 transferências registradas.

### /partida registrar
Abre um modal para registrar resultado de partida.

**Permissão:** Admin ou Moderador

**Campos do Modal:**
- Time da Casa (obrigatório)
- Time Visitante (obrigatório)
- Gols - Time da Casa
- Gols - Time Visitante
- Liga/Rodada (opcional)

**Processamento:**
1. Validação dos dados
2. Busca dos times no banco
3. Criação da partida
4. Atualização das estatísticas dos times
5. Log da ação
6. Anúncio no canal de resultados
7. Notificação WebSocket para o site e classificação

### /partida ultimos
Lista as últimas 5 partidas registradas.

### /partida agenda
Mostra as próximas partidas agendadas.

## Módulo de Diagnóstico (NOVO)

### Monitoramento Ativo

O sistema verifica a cada 5 minutos:
- **Status do Site**: Verifica endpoint `/api/health`
- **Banco de Dados**: Testa conexão PostgreSQL
- **Memória**: Monitora uso na SquareCloud
- **Alertas Automáticos**: Envia para canal `technicalLogsChannelId`

### Captura de Erros

Sistema completo de captura de exceções:
- **Erros Globais**: `uncaughtException` e `unhandledRejection`
- **Erros Específicos**: AES-256-GCM, Webhook, Database
- **Notificações**: Envia stack trace para Discord
- **Recuperação**: Tenta reconexão automática

### Componente Dashboard

Interface limpa com:
- **Barras de Progresso**: `[|||||---]` para indicadores
- **Ícones Lucide React**: Sem emojis
- **Cores**: Verde Neon para saudável, Vermelho Alerta para erros
- **Expansível**: Mostrar/esconder detalhes

### Configuração de Logs Técnicos

Novo campo na tabela `ServerConfig`:
```prisma
technicalLogsChannelId String? // Canal para logs técnicos
enableHealthChecks    Boolean  @default(true)
enableErrorAlerts     Boolean  @default(true)
```

## Configuração Dinâmica

### Tabela ServerConfig

Armazena configurações por servidor Discord:

```prisma
model ServerConfig {
  guildId               String   @unique
  guildName             String
  
  // Canais configurados
  resultsChannelId      String?  // Canal de resultados
  marketChannelId       String?  // Canal de mercado
  adminChannelId        String?  // Canal de logs
  technicalLogsChannelId String? // Canal de logs técnicos (NOVO)
  
  // Cargos de administradores
  adminRoleIds          String[] // Cargos de admin
  modRoleIds            String[] // Cargos de moderador
  
  // Status da liga
  leagueStatus          LeagueStatus
  currentSeason         String
  
  // Configurações do bot
  autoAnnounceResults Boolean
  autoAnnounceMarket  Boolean
  
  // Configurações de monitoramento (NOVO)
  enableHealthChecks  Boolean @default(true)
  enableErrorAlerts   Boolean @default(true)
}
```

## Segurança

### Autenticação
- Verificação de cargos admin/moderador
- Verificação de owner do servidor
- Verificação de BOT_OWNER_ID

### Rate Limiting
- 10 comandos por minuto por usuário
- Cooldown por comando configurável

### Criptografia
- AES-256-GCM para dados sensíveis
- IV único por registro
- AuthTag para integridade
- **Captura de Erros**: Falhas na criptografia são notificadas

### Cache
- Configurações cacheadas por 10 minutos
- Redução de queries ao PostgreSQL

## Sharding

O bot suporta sharding automático:

```javascript
const manager = new ShardingManager('./bot/botShard.js', {
  token: process.env.DISCORD_BOT_TOKEN,
  totalShards: 'auto', // Discord.js decide baseado no número de guilds
  respawn: true
});
```

## Logs do Bot

### Tabela BotLog

Armazena todas as ações executadas:

```prisma
model BotLog {
  guildId         String
  action          String   // TRANSFER_REGISTERED, MATCH_REGISTERED, etc
  command         String   // Comando usado
  userId          String   // Quem executou
  username        String
  
  // Dados da operação (criptografados se sensíveis)
  data            Json?    // Dados da operação
  encryptedData   String?  // Valores criptografados
  
  // Referências
  transferId      String?  // ID da transferência
  matchId         String?  // ID da partida
  
  // Status
  status          LogStatus // SUCCESS, FAILED, PENDING
  errorMessage    String?
  
  // Timestamps
  createdAt       DateTime
  processedAt     DateTime?
}
```

### Dashboard de Logs

Acesse `/dashboard` no site para visualizar:
- Lista de logs com filtros
- Detalhes de cada ação
- Estatísticas de uso
- Status do bot
- **Componente de Diagnóstico**: Métricas em tempo real

## Integração WebSocket

### Eventos do Bot

```javascript
// Notificar novo site
bot.notifyWebsite('new-transfer', {
  id: transfer.id,
  playerName,
  timestamp: new Date().toISOString()
});

// Notificar nova partida
bot.notifyWebsite('new-match', {
  id: match.id,
  homeTeam, awayTeam,
  timestamp: new Date().toISOString()
});

// Notificar atualização de classificação
bot.notifyWebsite('standings-updated', {
  leagueId: league.id,
  timestamp: new Date().toISOString()
});
```

## Deploy

### SquareCloud

1. **Upload do projeto**
```bash
# Compactar projeto
zip -r pso-brasil.zip . -x "node_modules/*" ".git/*"

# Upload via painel SquareCloud
```

2. **Configurar variáveis de ambiente**
```env
DISCORD_BOT_TOKEN=seu_token_aqui
DISCORD_CLIENT_ID=seu_client_id
ENCRYPTION_KEY=sua_chave_32_bytes
BASE_URL=https://seu-app.squarecloud.app
```

3. **Iniciar aplicação**
```bash
# O server-unified.js inicia automaticamente bot + site
npm start
```

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Editar .env com suas configurações

# Gerar cliente Prisma
npm run prisma:generate

# Rodar migrations
npm run prisma:push

# Iniciar em modo desenvolvimento
npm run dev
```

## Variáveis de Ambiente

### Obrigatórias

```env
# Discord
DISCORD_BOT_TOKEN="seu_bot_token"
DISCORD_CLIENT_ID="seu_client_id"

# Banco de Dados
DATABASE_URL="postgresql://..."

# Segurança
ENCRYPTION_KEY="chave_32_bytes"
WEBHOOK_HMAC_SECRET="chave_hmac"
TRANSFER_SECRET_KEY="chave_webhook"

# Server
PORT=3000
BASE_URL="http://localhost:3000"
```

### Opcionais

```env
# Sharding
TOTAL_SHARDS=auto

# Cache
CACHE_TTL=300000
CACHE_MAX_SIZE=1000

# Bot Owner (para comandos privilegiados)
BOT_OWNER_ID="seu_discord_id"
```

## Troubleshooting

### Bot não responde aos comandos

1. Verificar se o bot está online no Discord
2. Verificar token no .env
3. Verificar se comandos foram registrados (podem levar até 1 hora)
4. Verificar permissões do bot no servidor
5. **NOVO**: Usar `/status` para diagnóstico completo

### Erro de permissão

1. Verificar se o usuário tem cargo de admin configurado
2. Verificar se o bot tem permissão de Administrator
3. Verificar canal de logs para mensagens de erro
4. **NOVO**: Verificar canal de logs técnicos para erros do sistema

### Dados não aparecem no site

1. Verificar conexão WebSocket
2. Verificar se o evento foi emitido pelo bot
3. Verificar logs do bot no dashboard
4. **NOVO**: Verificar status do monitoramento

### Erro de criptografia

1. Verificar se ENCRYPTION_KEY tem 32 bytes
2. Verificar se dados estão sendo criptografados corretamente
3. Verificar logs para mensagens de erro detalhadas
4. **NOVO**: Erros são capturados automaticamente e notificados

### Sistema instável

1. **NOVO**: Monitorar `/status` para identificar problemas
2. Verificar logs técnicos para erros críticos
3. Verificar uso de memória no dashboard
4. **NOVO**: Sistema tenta recuperação automática

## API Endpoints

### Bot Logs

```http
GET /api/bot/logs?limit=50&filter=ALL

Response:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "action": "TRANSFER_REGISTERED",
      "command": "/mercado anunciar",
      "username": "Admin",
      "status": "SUCCESS",
      "createdAt": "2024-03-15T10:30:00Z"
    }
  ]
}
```

### Bot Stats

```http
GET /api/bot/stats

Response:
{
  "success": true,
  "data": {
    "totalCommands": 150,
    "totalTransfers": 45,
    "totalMatches": 120,
    "activeUsers": 25,
    "botStatus": "ONLINE"
  }
}
```

## Manutenção

### Limpar cache
```javascript
// No código
bot.configCache.clear();
bot.cache.clear();
```

### Flush manual de logs
```javascript
// No código
await bot.flushLogs();
```

### Reiniciar bot
```bash
# Via Discord
/configurar > Reiniciar Bot (se implementado)

# Via terminal
kill -SIGINT <pid>
npm start
```

## Contribuição

Para adicionar novos comandos:

1. Criar arquivo em `bot/commands/`
2. Exportar objeto com `data` e `execute`
3. Definir `public: true/false` para permissões
4. Adicionar cooldown se necessário
5. Registrar handler em `botHandler.js` se usar componentes
6. **NOVO**: Adicionar captura de erros específicos

## Suporte

Para suporte técnico:
- Dashboard: `/dashboard`
- Logs: Verifique `logs/app.log`
- Discord: Contate o BOT_OWNER_ID
- **NOVO**: Canal de logs técnicos para erros do sistema

---

**PSO Brasil Bot v3.1** - Sistema Configurável de Gestão de Liga com Diagnóstico Completo
