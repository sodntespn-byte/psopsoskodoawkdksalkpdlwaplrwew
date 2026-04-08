# PSO Brasil - Sistema de Controle Discord

## Visão Geral

Implementamos um sistema completo de controle via Discord que transforma o Discord no "Painel de Controle" do seu site PSO Brasil. O sistema permite registrar resultados, atualizar fotos, gerenciar ligas e receber feedback em tempo real, tudo integrado com PostgreSQL e atualizações automáticas no site.

## Arquitetura do Sistema

```
Discord Bot (Painel de Controle)
        |
        v
Backend (Node.js + Express)
        |
        v
PostgreSQL (Prisma ORM)
        |
        v
Frontend (React + WebSocket)
        |
        v
Site PSO Brasil (Atualizações em Tempo Real)
```

## Funcionalidades Implementadas

### 1. Sistema de Captura (Discord Bot)

#### **Comando /postar-resultado**
- **Modal Interativo**: Abre formulário com campos preenchíveis
- **Campos**: Time Casa, Gols Casa, Gols Fora, Time Fora, ID Liga
- **Validação**: Busca times no PostgreSQL pelo nome
- **Logo URL**: Recupera automaticamente a logo_url de cada time

```javascript
// Exemplo de uso no Discord
/postar-resultado
// Modal abre:
// Time Casa: [Flamengo]
// Gols Casa: [2]
// Gols Fora: [1]
// Time Fora: [Palmeiras]
// ID Liga: [1]
```

#### **Comando /set-foto**
- **Atualização Instantânea**: Atualiza foto do time no site
- **Busca por Nome**: Encontra time pelo nome (case insensitive)
- **Validação de URL**: Verifica se a URL é válida

```javascript
// Exemplo de uso
/set-foto
// Modal abre:
// Nome do Time: [Flamengo]
// URL da Foto: [https://exemplo.com/flamengo.png]
```

#### **Comando /set-ordem**
- **Ordenação Manual**: Define qual liga aparece primeiro
- **IDs Separados**: Lista de IDs separados por vírgula
- **Atualização Imediata**: Reflete no site instantaneamente

```javascript
// Exemplo de uso
/set-ordem
// Modal abre:
// Ordem das Ligas: [1,2,3,4]
```

### 2. Módulo de Organização Automática (Backend)

#### **Processo de Resultado:**
1. **Salvar Partida**: Insere na tabela Match
2. **Atualizar Times**: Atualiza tabela Team com pontos, vitórias, saldo
3. **Ordenar Classificação**: Pontos > Vitórias > Saldo de Gols
4. **Notificar Frontend**: WebSocket para atualização em tempo real

#### **Cálculo Automático:**
```javascript
// Vitória: 3 pontos
if (homeScore > awayScore) {
  homePoints = 3;
  awayPoints = 0;
}

// Empate: 1 ponto cada
if (homeScore === awayScore) {
  homePoints = 1;
  awayPoints = 1;
}

// Derrota: 0 pontos
if (homeScore < awayScore) {
  homePoints = 0;
  awayPoints = 3;
}

// Saldo de gols
goalDifference = goalsFor - goalsAgainst;
```

#### **Ordenação da Classificação:**
```javascript
// Critérios de ordenação:
// 1. Pontos (desc)
// 2. Vitórias (desc)
// 3. Saldo de Gols (desc)
// 4. Gols Marcados (desc)

standings.sort((a, b) => {
  if (b.points !== a.points) return b.points - a.points;
  if (b.wins !== a.wins) return b.wins - a.wins;
  const aGD = a.goalsFor - a.goalsAgainst;
  const bGD = b.goalsFor - b.goalsAgainst;
  if (bGD !== aGD) return bGD - aGD;
  return b.goalsFor - a.goalsFor;
});
```

### 3. Template Visual (Frontend)

#### **Componente RecentResults**
- **Glassmorphism**: Cards com efeito glass
- **Framer Motion**: Animações suaves fade-in
- **WebSocket**: Atualizações em tempo real
- **Layout Responsivo**: Adaptável para mobile/desktop

```jsx
// Estrutura do card
<div className="glass-card-primary p-4 match-card">
  <div className="flex items-center justify-between">
    {/* Time Mandante */}
    <div className="flex items-center space-x-3">
      <img src={homeTeam.logoUrl} alt={homeTeam.name} />
      <span>{homeTeam.name}</span>
    </div>
    
    {/* Placar */}
    <div className="text-2xl font-bold">
      {homeScore} X {awayScore}
    </div>
    
    {/* Time Visitante */}
    <div className="flex items-center space-x-3">
      <span>{awayTeam.name}</span>
      <img src={awayTeam.logoUrl} alt={awayTeam.name} />
    </div>
  </div>
</div>
```

#### **Animações:**
```javascript
// Fade-in para novos resultados
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', damping: 25 }
  }
};
```

### 4. Feedback via Webhook

#### **Notificações Automáticas:**
- **Sucesso**: "Site atualizado com sucesso!"
- **Fotos dos Times**: Exibe logos no embed
- **Resultados**: Mostra placar e times
- **Status**: Confirmação visual de sucesso

```javascript
// Exemplo de embed no Discord
{
  "title": "Site Atualizado com Sucesso!",
  "color": 0x00ff00,
  "description": "Resultado da partida registrado e classificação atualizada!",
  "fields": [
    {
      "name": "Partida",
      "value": "Flamengo 2 x 1 Palmeiras"
    },
    {
      "name": "Vencedor",
      "value": "Flamengo"
    }
  ],
  "thumbnail": {
    "url": "https://exemplo.com/flamengo.png"
  }
}
```

## Estrutura de Arquivos

### Backend
```
discord/
  bot.js              # Bot Discord principal
  matchManager.js      # Gerenciador de partidas
  webhookManager.js    # Gerenciador de webhooks
  index.js            # Sistema integrado
```

### API Routes
```
api/
  matches/
    recent.js          # Resultados recentes
    [matchId]/
      update-standings.js # Atualizar classificação
  leagues/
    [leagueId]/
      standings.js      # Classificação
  webhook/
    match-result.js    # Webhook externo
```

### Frontend
```
components/
  RecentResults.jsx    # Componente de resultados
  GlassCard.jsx        # Componente glassmorphism
```

## Configuração

### 1. Variáveis de Ambiente
```env
# Discord
DISCORD_BOT_TOKEN=seu_bot_token
DISCORD_WEBHOOK_URL=seu_webhook_url

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Server
PORT=3000
NODE_ENV=production
```

### 2. Instalação de Dependências
```bash
npm install discord.js socket.io prisma @prisma/client
npm install express framer-motion react react-dom
```

### 3. Configuração do Bot Discord
```javascript
// Criar aplicação no Discord Developer Portal
// https://discord.com/developers/applications

// Habilitar:
// - Bot (Server Members Intent, Message Content Intent)
// - OAuth2 (bot, applications.commands)

// Convidar bot para servidor:
// https://discord.com/oauth2/authorize?client_id=YOUR_ID&permissions=8&scope=bot%20applications.commands
```

## Fluxo Completo

### 1. Registrar Resultado
```
1. Usuário usa /postar-resultado no Discord
2. Bot abre modal com formulário
3. Usuário preenche: Flamengo 2 x 1 Palmeiras
4. Bot busca times no PostgreSQL
5. Sistema salva partida na tabela Match
6. Sistema atualiza estatísticas na tabela Team
7. Sistema recalcula classificação
8. WebSocket envia atualização para frontend
9. Frontend exibe novo resultado com animação
10. Webhook envia confirmação para Discord
```

### 2. Atualizar Foto
```
1. Usuário usa /set-foto no Discord
2. Bot abre modal: Nome + URL
3. Sistema atualiza logo_url na tabela Team
4. WebSocket envia atualização
5. Frontend atualiza foto instantaneamente
6. Webhook confirma sucesso
```

### 3. Ordenar Ligas
```
1. Usuário usa /set-ordem no Discord
2. Bot abre modal: IDs em ordem
3. Sistema atualiza campo order na tabela League
4. Frontend reordena ligas automaticamente
5. Webhook confirma sucesso
```

## Exemplos de Uso

### Discord Commands
```javascript
// Registrar resultado
/postar-resultado
// Modal aparece:
// Time Casa: [Corinthians]
// Gols Casa: [3]
// Gols Fora: [1]
// Time Fora: [Santos]
// ID Liga: [1]

// Atualizar foto
/set-foto
// Modal aparece:
// Nome do Time: [Corinthians]
// URL da Foto: [https://exemplo.com/corinthians.png]

// Ordenar ligas
/set-ordem
// Modal aparece:
// Ordem das Ligas: [1,3,2,4]
```

### API Calls
```javascript
// Buscar resultados recentes
fetch('/api/matches/recent?limit=10')
  .then(res => res.json())
  .then(data => console.log(data.matches));

// Atualizar resultado via webhook
fetch('/api/webhook/match-result', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    homeTeamName: 'Flamengo',
    awayTeamName: 'Palmeiras',
    homeScore: 2,
    awayScore: 1,
    leagueId: '1'
  })
});
```

### Frontend Integration
```jsx
// Componente de resultados
import RecentResults from './components/RecentResults';

function App() {
  return (
    <div>
      <RecentResults leagueId="1" limit={10} autoRefresh={true} />
    </div>
  );
}
```

## WebSocket Events

### Client Side
```javascript
const socket = io('http://localhost:3000');

// Entrar em sala de liga
socket.emit('join-league', 'league-1');

// Escutar atualizações
socket.on('match-finished', (data) => {
  console.log('Nova partida:', data.match);
  updateUI(data.standings);
});

socket.on('team-photo-updated', (data) => {
  console.log('Foto atualizada:', data.team);
  updateTeamPhoto(data.team, data.photoUrl);
});
```

### Server Side
```javascript
// Broadcast para liga específica
io.to(`league-${leagueId}`).emit('match-finished', {
  match: matchData,
  standings: standingsData
});

// Broadcast geral
io.emit('team-photo-updated', {
  team: teamData,
  photoUrl: newUrl
});
```

## Performance e Otimizações

### 1. Cache
```javascript
// Cache de classificação (5 minutos)
const CACHE_DURATION = 5 * 60 * 1000;
const cache = new Map();

async function getCachedStandings(leagueId, season) {
  const cacheKey = `standings-${leagueId}-${season}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await getLeagueStandings(leagueId, season);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

### 2. Batch Updates
```javascript
// Atualizar múltiplas partidas
async function batchUpdateResults(results) {
  const updates = results.map(result => 
    processMatchResult(result)
  );
  
  await Promise.all(updates);
  
  // Invalidar cache apenas uma vez
  invalidateCache();
}
```

### 3. Database Indexes
```javascript
// Prisma schema com índices otimizados
model TeamStats {
  teamId    String   @index
  season    String   @index
  points    Int      @index
  
  @@unique([teamId, season])
}

model Match {
  leagueId  String   @index
  status    String   @index
  matchDate DateTime @index
  
  @@index([leagueId, status])
}
```

## Monitoramento e Logs

### 1. Logs de Operações
```javascript
// Em matchManager.js
console.log(`[${new Date().toISOString()}] Partida registrada: ${homeTeam} ${homeScore}x${awayScore} ${awayTeam}`);
console.log(`[${new Date().toISOString()}] Classificação atualizada: ${leagueId}`);
console.log(`[${new Date().toISOString()}] Webhook enviado: ${webhookUrl}`);
```

### 2. Métricas
```javascript
// Em webhookManager.js
const metrics = {
  totalUpdates: 0,
  successfulWebhooks: 0,
  failedWebhooks: 0,
  averageResponseTime: 0
};

function recordWebhook(success, responseTime) {
  metrics.totalUpdates++;
  if (success) {
    metrics.successfulWebhooks++;
  } else {
    metrics.failedWebhooks++;
  }
  metrics.averageResponseTime = 
    (metrics.averageResponseTime * (metrics.totalUpdates - 1) + responseTime) / metrics.totalUpdates;
}
```

## Troubleshooting

### Problemas Comuns

#### 1. Bot não responde
- **Verifique**: Token do bot está correto
- **Verifique**: Bot tem permissões necessárias
- **Verifique**: Bot está online no Discord

#### 2. Webhook não envia
- **Verifique**: URL do webhook está correta
- **Verifique**: Webhook não expirou
- **Verifique**: Servidor está acessível

#### 3. WebSocket não conecta
- **Verifique**: Servidor WebSocket está rodando
- **Verifique**: Porta está correta
- **Verifique**: Firewall não bloqueia

#### 4. Dados não atualizam
- **Verifique**: Conexão com PostgreSQL
- **Verifique**: Schema do Prisma está atualizado
- **Verifique**: Logs de erros no console

### Debug Mode
```javascript
// Habilitar logs detalhados
process.env.DEBUG = 'pso:*';

// Verificar estado do sistema
console.log('Estado atual:', {
  bot: bot ? 'online' : 'offline',
  websocket: io ? 'online' : 'offline',
  database: prisma ? 'connected' : 'disconnected'
});
```

## Segurança

### 1. Validação de Input
```javascript
// Validar dados do Discord
function validateMatchData(data) {
  const errors = [];
  
  if (!data.homeTeamName || data.homeTeamName.length < 2) {
    errors.push('Nome do time mandante inválido');
  }
  
  if (typeof data.homeScore !== 'number' || data.homeScore < 0) {
    errors.push('Gols mandante inválido');
  }
  
  return errors;
}
```

### 2. Rate Limiting
```javascript
// Limitar comandos por usuário
const rateLimits = new Map();

function checkRateLimit(userId, command) {
  const key = `${userId}-${command}`;
  const lastUsed = rateLimits.get(key);
  const now = Date.now();
  
  if (lastUsed && now - lastUsed < 5000) { // 5 segundos
    return false; // Rate limited
  }
  
  rateLimits.set(key, now);
  return true;
}
```

### 3. Sanitização
```javascript
// Sanitizar nomes de times
function sanitizeTeamName(name) {
  return name.trim().replace(/[<>]/g, '').substring(0, 50);
}
```

## Deploy

### 1. SquareCloud
```yaml
# squarecloud.yml
start: npm run start
build: npm run build
environment:
  - DISCORD_BOT_TOKEN
  - DISCORD_WEBHOOK_URL
  - DATABASE_URL
```

### 2. Variáveis de Ambiente
```bash
# No painel da SquareCloud
DISCORD_BOT_TOKEN=seu_token
DISCORD_WEBHOOK_URL=sua_webhook_url
DATABASE_URL=sua_database_url
PORT=3000
```

### 3. Scripts de Deploy
```json
{
  "scripts": {
    "start": "node discord/index.js",
    "dev": "nodemon discord/index.js",
    "deploy": "npm run build && npm start"
  }
}
```

## Roadmap Futuro

### Próximas Funcionalidades
- [ ] **Partidas ao Vivo**: Atualizações em tempo real durante jogos
- [ ] **Estatísticas Avançadas**: Cards, amarelos, vermelhos
- [ ] **Múltiplas Ligas**: Suporte a diferentes campeonatos
- [ ] **Integração com APIs**: Dados de estatísticas externas
- [ ] **Ranking Global**: Classificação entre ligas
- [ ] **Notificações Push**: Alertas para dispositivos móveis

### Melhorias Técnicas
- [ ] **Redis Cache**: Cache distribuído
- [ ] **Queue System**: Fila para processamento assíncrono
- [ ] **Load Balancer**: Balanceamento de carga
- [ ] **CDN**: Cache de imagens e assets
- [ ] **Monitoring**: Dashboards de métricas

---

**Sistema PSO Discord Controller v1.0** - Controle completo via Discord com atualizações em tempo real!
