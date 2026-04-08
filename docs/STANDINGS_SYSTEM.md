# Sistema de Atualização de Classificação

## Visão Geral

Implementamos um sistema completo de atualização de classificação que atualiza automaticamente os pontos, saldo de gols e tabela de classificação sempre que um resultado de partida é registrado. O sistema inclui atualizações em tempo real via WebSocket e invalidação de cache para atualização instantânea da Home Page.

## Funcionalidades Implementadas

### 1. Atualização Automática de Classificação

#### **Cálculo de Pontos:**
- **Vitória**: 3 pontos
- **Empate**: 1 ponto
- **Derrota**: 0 pontos

#### **Cálculo de Saldo de Gols:**
- **Fórmula**: `Gols Pró - Gols Contra`
- **Atualização automática** quando partida é finalizada

#### **Estatísticas Atualizadas:**
- Partidas jogadas
- Vitórias, Empates, Derrotas
- Gols pró e contra
- Saldo de gols
- Pontos totais

### 2. API Routes

#### **POST /api/matches/[matchId]/update-standings**

Atualiza classificação após resultado de partida.

**Request Body:**
```json
{
  "homeScore": 2,
  "awayScore": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Classificação atualizada com sucesso",
  "data": {
    "match": {
      "id": "match-123",
      "homeScore": 2,
      "awayScore": 1,
      "homeResult": "V",
      "awayResult": "D",
      "homeTeam": "Flamengo",
      "awayTeam": "Palmeiras"
    },
    "standings": [
      {
        "position": 1,
        "team": {
          "id": "team-1",
          "name": "Flamengo",
          "abbreviation": "FLA",
          "logoUrl": "/shields/flamengo.png"
        },
        "points": 28,
        "matchesPlayed": 12,
        "wins": 9,
        "draws": 1,
        "losses": 2,
        "goalsFor": 24,
        "goalsAgainst": 8,
        "goalDifference": 16,
        "form": "VVDED"
      }
    ],
    "league": "Brasileirão Série A",
    "season": "2024"
  }
}
```

#### **GET /api/leagues/[leagueId]/standings**

Busca classificação atual de uma liga.

**Query Parameters:**
- `season`: Temporada (opcional)
- `limit`: Limite de times (padrão: 20)
- `offset`: Offset para paginação (padrão: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "league": {
      "id": "league-1",
      "name": "Brasileirão Série A",
      "season": "2024",
      "country": "Brasil"
    },
    "standings": [
      {
        "position": 1,
        "team": { ... },
        "points": 28,
        "matchesPlayed": 12,
        "wins": 9,
        "draws": 1,
        "losses": 2,
        "goalsFor": 24,
        "goalsAgainst": 8,
        "goalDifference": 16,
        "pointsPerGame": "2.33",
        "winRate": "75.0",
        "recentForm": "VVDED",
        "streak": {
          "type": "V",
          "count": 2,
          "description": "2 Vitórias consecutivas"
        },
        "homeRecord": { ... },
        "awayRecord": { ... }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalTeams": 10,
      "hasNext": false,
      "hasPrev": false
    },
    "metadata": {
      "lastUpdated": "2024-03-15T20:00:00.000Z",
      "totalMatches": 45,
      "teamsCount": 10
    }
  }
}
```

### 3. WebSocket para Atualizações em Tempo Real

#### **Eventos Disponíveis:**

##### **standings-updated**
Disparado quando classificação é atualizada:
```javascript
socket.on('standings-updated', (data) => {
  console.log('Classificação atualizada:', data);
  // data contém standings, match, league, season
});
```

##### **match-finished**
Disparado quando partida é finalizada:
```javascript
socket.on('match-finished', (data) => {
  console.log('Partida finalizada:', data);
  // data contém informações do resultado
});
```

##### **live-match-update**
Disparado durante partida ao vivo:
```javascript
socket.on('live-match-update', (data) => {
  console.log('Atualização ao vivo:', data);
});
```

#### **Salas de Liga:**
```javascript
// Entrar em sala específica
socket.emit('join-league', 'league-id');

// Sair de sala
socket.emit('leave-league', 'league-id');

// Solicitar classificação atual
socket.emit('get-standings', { 
  leagueId: 'league-id', 
  season: '2024' 
});
```

### 4. Cache Invalidation

#### **Revalidação Automática:**
```javascript
// Em update-standings.js
const { revalidatePath } = require('next/cache');

// Revalidar página principal
revalidatePath('/');

// Revalidar página de classificação
revalidatePath(`/rankings/${leagueId}`);

// Revalidar API routes
revalidatePath('/api/standings');
revalidatePath(`/api/leagues/${leagueId}/standings`);
```

#### **Cache Headers:**
```javascript
// Configuração de cache para API routes
export async function GET(request) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
```

## Implementação Técnica

### 1. Função updateStandings

```javascript
async function updateStandings(matchData) {
  const { matchId, homeScore, awayScore, leagueId } = matchData;
  
  // 1. Buscar partida
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true, league: true }
  });

  // 2. Determinar resultado
  let homeResult = homeScore > awayScore ? 'V' : homeScore < awayScore ? 'D' : 'E';
  let awayResult = awayScore > homeScore ? 'V' : awayScore < homeScore ? 'D' : 'E';

  // 3. Atualizar estatísticas
  await Promise.all([
    updateTeamStats(match.homeTeamId, homeScore, awayScore, homeResult),
    updateTeamStats(match.awayTeamId, awayScore, homeScore, awayResult)
  ]);

  // 4. Atualizar status da partida
  await prisma.match.update({
    where: { id: matchId },
    data: { status: 'FINISHED', homeScore, awayScore }
  });

  // 5. Buscar classificação atualizada
  const standings = await getLeagueStandings(leagueId, match.league.season);

  return { success: true, data: { match, standings } };
}
```

### 2. Cálculo de Estatísticas

```javascript
async function updateTeamStats(teamId, goalsFor, goalsAgainst, result) {
  let teamStats = await prisma.teamStats.findUnique({
    where: { teamId_season: { teamId, season } }
  });

  // Criar se não existir
  if (!teamStats) {
    teamStats = await prisma.teamStats.create({
      data: { teamId, season, wins: 0, draws: 0, losses: 0, points: 0 }
    });
  }

  // Calcular novos valores
  const newWins = result === 'V' ? teamStats.wins + 1 : teamStats.wins;
  const newDraws = result === 'E' ? teamStats.draws + 1 : teamStats.draws;
  const newLosses = result === 'D' ? teamStats.losses + 1 : teamStats.losses;
  const newPoints = newWins * 3 + newDraws;
  const newGoalDifference = (teamStats.goalsFor + goalsFor) - (teamStats.goalsAgainst + goalsAgainst);

  // Atualizar
  return await prisma.teamStats.update({
    where: { teamId_season: { teamId, season } },
    data: {
      wins: newWins,
      draws: newDraws,
      losses: newLosses,
      points: newPoints,
      goalsFor: teamStats.goalsFor + goalsFor,
      goalsAgainst: teamStats.goalsAgainst + goalsAgainst,
      matchesPlayed: teamStats.matchesPlayed + 1
    }
  });
}
```

### 3. Geração de Forma (Últimos 5 Jogos)

```javascript
async function generateFormString(teamId, season) {
  const recentMatches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      league: { season },
      status: 'FINISHED'
    },
    orderBy: { matchDate: 'desc' },
    take: 5
  });

  const formArray = recentMatches.map(match => {
    if (match.homeTeamId === teamId) {
      return match.homeScore > match.awayScore ? 'V' :
             match.homeScore < match.awayScore ? 'D' : 'E';
    } else {
      return match.awayScore > match.homeScore ? 'V' :
             match.awayScore < match.homeScore ? 'D' : 'E';
    }
  });

  return formArray.join(''); // Ex: "VVDED"
}
```

## Uso no Frontend

### 1. Cliente JavaScript

```javascript
// Inicializar WebSocket
const standingsManager = new StandingsManager();
standingsManager.initializeWebSocket('http://localhost:3000');

// Entrar em liga
standingsManager.joinLeague('league-123', '2024');

// Configurar eventos
standingsManager.on('standings-updated', (data) => {
  updateStandingsTable(data.standings);
  showNotification('Classificação atualizada!');
});

standingsManager.on('match-finished', (data) => {
  showMatchResult(data.match);
});

// Atualizar resultado
async function updateMatch(matchId, homeScore, awayScore) {
  try {
    await standingsManager.updateMatchResult(matchId, homeScore, awayScore);
    console.log('Resultado atualizado!');
  } catch (error) {
    console.error('Erro:', error);
  }
}
```

### 2. React Hook

```javascript
import { useEffect, useState } from 'react';

function useStandings(leagueId, season) {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const manager = window.standingsManager;
    
    manager.on('standings-updated', (data) => {
      if (data.leagueId === leagueId) {
        setStandings(data.standings);
      }
    });

    manager.joinLeague(leagueId, season);

    return () => {
      manager.off('standings-updated');
      manager.leaveLeague(leagueId);
    };
  }, [leagueId, season]);

  return { standings, loading };
}

// Componente
function StandingsTable({ leagueId }) {
  const { standings, loading } = useStandings(leagueId, '2024');

  if (loading) return <div>Carregando...</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>Pos</th>
          <th>Time</th>
          <th>Pts</th>
          <th>J</th>
          <th>V-E-D</th>
          <th>SG</th>
          <th>Forma</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((team) => (
          <tr key={team.id}>
            <td>{team.position}</td>
            <td>{team.team.name}</td>
            <td>{team.points}</td>
            <td>{team.matchesPlayed}</td>
            <td>{team.wins}-{team.draws}-{team.losses}</td>
            <td>{team.goalDifference}</td>
            <td>{team.form}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 3. Formulário de Resultado

```javascript
function MatchResultForm({ matchId }) {
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await window.updateMatchResult(matchId, parseInt(homeScore), parseInt(awayScore));
      // Reset form
      setHomeScore('');
      setAwayScore('');
    } catch (error) {
      alert('Erro ao atualizar resultado: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex space-x-4">
        <input
          type="number"
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          placeholder="Gols Mandante"
          min="0"
          required
        />
        <span>x</span>
        <input
          type="number"
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          placeholder="Gols Visitante"
          min="0"
          required
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Atualizando...' : 'Atualizar Resultado'}
      </button>
    </form>
  );
}
```

## Configuração do Servidor

### 1. Instalar Dependências

```bash
npm install socket.io
```

### 2. Configurar WebSocket no Server

```javascript
const express = require('express');
const { createServer } = require('http');
const { setupWebSocket } = require('./middleware/websocket');

const app = express();
const server = createServer(app);

// Configurar WebSocket
const io = setupWebSocket(server);

// Anexar io ao app para uso em rotas
app.set('io', io);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
```

### 3. Adicionar ao package.json

```json
{
  "dependencies": {
    "socket.io": "^4.7.2",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0"
  },
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  }
}
```

## Exemplos de Uso

### 1. Atualizar Resultado de Partida

```bash
# Via API
curl -X POST http://localhost:3000/api/matches/match-123/update-standings \
  -H "Content-Type: application/json" \
  -d '{"homeScore": 2, "awayScore": 1}'
```

```javascript
// Via JavaScript
await fetch('/api/matches/match-123/update-standings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ homeScore: 2, awayScore: 1 })
});
```

### 2. Buscar Classificação

```bash
# Via API
curl http://localhost:3000/api/leagues/league-123/standings?season=2024&limit=10
```

```javascript
// Via JavaScript
const response = await fetch('/api/leagues/league-123/standings?season=2024');
const data = await response.json();
console.log(data.standings);
```

### 3. WebSocket Events

```javascript
// Conectar ao WebSocket
const socket = io('http://localhost:3000');

// Entrar na liga
socket.emit('join-league', 'league-123');

// Escutar atualizações
socket.on('standings-updated', (data) => {
  console.log('Classificação atualizada:', data);
});
```

## Performance e Cache

### 1. Estratégias de Cache

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

### 2. Otimizações de Banco

```javascript
// Índices recomendados no Prisma schema
model TeamStats {
  teamId    String   @index
  season    String   @index
  points    Int      @index
  // ...
  
  @@unique([teamId, season])
}
```

### 3. Batch Updates

```javascript
// Atualizar múltiplas partidas de uma vez
async function batchUpdateResults(results) {
  const updates = results.map(result => 
    updateStandings(result)
  );
  
  await Promise.all(updates);
  
  // Invalidar cache apenas uma vez
  await invalidateCache();
}
```

## Monitoramento e Logs

### 1. Logs de Atualização

```javascript
// Em update-standings.js
console.log(`[STANDINGS] Partida ${matchId} atualizada: ${homeScore}x${awayScore}`);
console.log(`[STANDINGS] Time ${match.homeTeam.name}: +${pointsGained} pontos`);
console.log(`[STANDINGS] Classificação recalculada em ${Date.now() - startTime}ms`);
```

### 2. Métricas de Performance

```javascript
// Em middleware/websocket.js
const stats = {
  updatesCount: 0,
  averageTime: 0,
  errorsCount: 0,
  lastUpdate: null
};

function recordUpdate(duration, success) {
  stats.updatesCount++;
  stats.averageTime = (stats.averageTime * (stats.updatesCount - 1) + duration) / stats.updatesCount;
  stats.lastUpdate = new Date();
  
  if (!success) {
    stats.errorsCount++;
  }
}
```

## Troubleshooting

### Problemas Comuns

#### 1. Classificação não atualiza
- **Verifique**: Se a API está retornando sucesso
- **Verifique**: Se o WebSocket está conectado
- **Verifique**: Se o cache está sendo invalidado

#### 2. Pontuação incorreta
- **Verifique**: Regra de pontos (3-1-0)
- **Verifique**: Se está atualizando times corretos
- **Verifique**: Se está considerando empates

#### 3. WebSocket desconecta
- **Verifique**: Se o servidor está rodando
- **Verifique**: Se as portas estão corretas
- **Verifique**: Se há firewall bloqueando

### Debug Mode

```javascript
// Habilitar logs detalhados
process.env.DEBUG = 'standings:*';

// Verificar estado do cache
console.log('Cache state:', cache);

// Verificar conexões WebSocket
console.log('WebSocket clients:', io.engine.clientsCount);
```

---

**Sistema de Atualização de Classificação v1.0** - Completo, em tempo real e performático
