# Configuração do Prisma ORM

## Visão Geral

Configuramos o Prisma ORM para conectar ao seu banco de dados PostgreSQL com um esquema completo para gerenciamento de ligas, times, jogadores e partidas.

## Estrutura do Banco de Dados

### Relacionamentos

```
League (Liga)
  1:N
Team (Time)
  1:N
Player (Jogador)

Team (Time) N:N Match (Partida)
```

### Tabelas Principais

#### 1. League (Ligas)
- **ID**: Identificador único
- **name**: Nome da liga (ex: "Brasileirão Série A")
- **description**: Descrição da liga
- **country**: País da liga
- **season**: Temporada (ex: "2024")
- **isActive**: Status da liga
- **createdAt/updatedAt**: Timestamps

#### 2. Team (Times)
- **ID**: Identificador único
- **name**: Nome do time (ex: "Flamengo")
- **abbreviation**: Abreviação (ex: "FLA")
- **city/state**: Cidade e estado
- **founded**: Ano de fundação
- **stadium**: Estádio principal
- **logoUrl**: URL do logo/escudo
- **leagueId**: Foreign key para League
- **createdAt/updatedAt**: Timestamps

#### 3. Player (Jogadores)
- **ID**: Identificador único
- **name**: Nome completo
- **nickname**: Apelido (opcional)
- **age**: Idade
- **position**: Posição (GK, DF, MF, FW)
- **number**: Número da camisa
- **height/weight**: Altura e peso
- **nationality**: Nacionalidade
- **teamId**: Foreign key para Team
- **isActive**: Status do jogador
- **createdAt/updatedAt**: Timestamps

#### 4. Match (Partidas)
- **ID**: Identificador único
- **homeTeamId/awayTeamId**: Foreign keys para Team
- **leagueId**: Foreign key para League
- **matchDate**: Data/hora da partida
- **venue**: Local da partida
- **status**: Status (SCHEDULED, IN_PROGRESS, FINISHED, etc.)
- **homeScore/awayScore**: Placar
- **round**: Rodada do campeonato
- **createdAt/updatedAt**: Timestamps

### Tabelas Adicionais

#### PlayerStats (Estatísticas dos Jogadores)
- **playerId**: Referência para Player
- **goals/assists**: Gols e assistências
- **yellowCards/redCards**: Cartões
- **matchesPlayed/minutesPlayed**: Partidas e minutos
- **season**: Temporada

#### TeamStats (Estatísticas dos Times)
- **teamId**: Referência para Team
- **wins/draws/losses**: Vitórias, empates, derrotas
- **goalsFor/goalsAgainst**: Gols pró e contra
- **points**: Pontos na tabela
- **matchesPlayed**: Partidas jogadas
- **season**: Temporada

#### Season (Temporadas)
- **name**: Nome da temporada
- **startDate/endDate**: Período
- **isActive**: Status

## Configuração

### 1. Instalação

```bash
npm install prisma @prisma/client
```

### 2. Configurar DATABASE_URL

Execute o script de configuração:

```bash
npm run prisma:setup
```

Ou adicione manualmente ao arquivo `.env`:

```env
# Prisma Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database"
```

### 3. Gerar Client

```bash
npx prisma generate
```

### 4. Criar Tabelas

```bash
npx prisma db push
```

### 5. Popular Banco (opcional)

```bash
npm run prisma:seed
```

## Scripts Disponíveis

```json
{
  "prisma:setup": "chmod +x scripts/setup-prisma.sh && ./scripts/setup-prisma.sh",
  "prisma:push": "npx prisma db push",
  "prisma:generate": "npx prisma generate",
  "prisma:migrate": "npx prisma migrate dev",
  "prisma:studio": "npx prisma studio",
  "prisma:seed": "npm run seed-db"
}
```

## Uso do Prisma Client

### Importar

```javascript
const prisma = require('./lib/prisma');
```

### Exemplos de Operações

#### Criar uma Liga

```javascript
const league = await prisma.league.create({
  data: {
    name: 'Brasileirão Série A',
    description: 'Campeonato Brasileiro de Futebol - Série A',
    country: 'Brasil',
    season: '2024',
    isActive: true
  }
});
```

#### Criar um Time

```javascript
const team = await prisma.team.create({
  data: {
    name: 'Flamengo',
    abbreviation: 'FLA',
    city: 'Rio de Janeiro',
    state: 'RJ',
    founded: 1895,
    stadium: 'Maracanã',
    logoUrl: '/shields/flamengo.png',
    leagueId: 'league-id-here'
  }
});
```

#### Criar um Jogador

```javascript
const player = await prisma.player.create({
  data: {
    name: 'Gabriel Barbosa',
    nickname: 'Gabigol',
    age: 28,
    position: 'FW',
    number: 10,
    nationality: 'Brasil',
    teamId: 'team-id-here'
  }
});
```

#### Criar uma Partida

```javascript
const match = await prisma.match.create({
  data: {
    homeTeamId: 'flamengo-id',
    awayTeamId: 'palmeiras-id',
    leagueId: 'league-id',
    matchDate: new Date('2024-03-15T20:00:00Z'),
    venue: 'Maracanã',
    round: '1ª Rodada'
  }
});
```

#### Buscar com Relacionamentos

```javascript
const teams = await prisma.team.findMany({
  include: {
    league: true,
    players: true,
    homeMatches: {
      include: {
        awayTeam: true
      }
    },
    awayMatches: {
      include: {
        homeTeam: true
      }
    }
  }
});
```

#### Buscar Jogadores de um Time

```javascript
const players = await prisma.player.findMany({
  where: {
    teamId: 'team-id-here',
    isActive: true
  },
  include: {
    team: true
  }
});
```

#### Atualizar Placar de Partida

```javascript
const match = await prisma.match.update({
  where: {
    id: 'match-id-here'
  },
  data: {
    status: 'FINISHED',
    homeScore: 2,
    awayScore: 1
  }
});
```

#### Buscar Classificação

```javascript
const standings = await prisma.team.findMany({
  where: {
    leagueId: 'league-id-here'
  },
  include: {
    teamStats: {
      where: {
        season: '2024'
      }
    }
  },
  orderBy: {
    teamStats: {
      points: 'desc'
    }
  }
});
```

## Prisma Studio

Para visualizar e editar seu banco de dados:

```bash
npm run prisma:studio
```

Isso abrirá uma interface web em `http://localhost:5555`.

## Migrations

### Criar Migration

```bash
npx prisma migrate dev --name init
```

### Aplicar Migrations

```bash
npx prisma migrate deploy
```

### Resetar Banco

```bash
npx prisma migrate reset
```

## Seed Data

O script de seed cria dados iniciais:

- **2 Ligas**: Brasileirão Série A, Copa Libertadores
- **10 Times**: Times brasileiros populares
- **30+ Jogadores**: Jogadores principais
- **5 Partidas**: Partidas iniciais
- **Estatísticas**: Dados estatísticos iniciais

Para executar:

```bash
npm run prisma:seed
```

## Relacionamentos Detalhados

### 1. League -> Team (1:N)
```javascript
// Uma liga tem muitos times
const league = await prisma.league.findUnique({
  where: { id: 'league-id' },
  include: { teams: true }
});

// Um time pertence a uma liga
const team = await prisma.team.findUnique({
  where: { id: 'team-id' },
  include: { league: true }
});
```

### 2. Team -> Player (1:N)
```javascript
// Um time tem muitos jogadores
const team = await prisma.team.findUnique({
  where: { id: 'team-id' },
  include: { players: true }
});

// Um jogador pertence a um time
const player = await prisma.player.findUnique({
  where: { id: 'player-id' },
  include: { team: true }
});
```

### 3. Team -> Match (N:N)
```javascript
// Times em suas partidas (mandante e visitante)
const team = await prisma.team.findUnique({
  where: { id: 'team-id' },
  include: {
    homeMatches: {
      include: { awayTeam: true }
    },
    awayMatches: {
      include: { homeTeam: true }
    }
  }
});
```

## Queries Avançadas

### Buscar Partidas por Liga

```javascript
const matches = await prisma.match.findMany({
  where: {
    leagueId: 'league-id'
  },
  include: {
    homeTeam: true,
    awayTeam: true
  },
  orderBy: {
    matchDate: 'asc'
  }
});
```

### Buscar Estatísticas de Jogador

```javascript
const playerStats = await prisma.playerStats.findUnique({
  where: {
    playerId_season: {
      playerId: 'player-id',
      season: '2024'
    }
  }
});
```

### Atualizar Estatísticas

```javascript
const updatedStats = await prisma.playerStats.update({
  where: {
    playerId_season: {
      playerId: 'player-id',
      season: '2024'
    }
  },
  data: {
    goals: {
      increment: 1
    }
  }
});
```

## Performance

### Conexão Pool

O Prisma Client gerencia automaticamente o pool de conexões. Para configurações avançadas:

```javascript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
```

### Logging

Em desenvolvimento, o logging está ativado para debug:

```javascript
// Logs aparecem quando NODE_ENV=development
prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration}ms`);
});
```

## Troubleshooting

### Problemas Comuns

1. **DATABASE_URL inválida**
   - Verifique o formato: `postgresql://user:pass@host:port/db`
   - Confirme se o banco está acessível

2. **Tabelas não criadas**
   - Execute `npx prisma db push`
   - Verifique se há erros no schema

3. **Seed não funciona**
   - Confirme se as tabelas existem
   - Verifique se há conflitos de dados

4. **Conexão falha**
   - Verifique credenciais
   - Confirme se o banco está online

### Debug Mode

Para habilitar debug detalhado:

```env
DEBUG=prisma*
```

### Reset Completo

Para resetar completamente:

```bash
npx prisma migrate reset --force
npm run prisma:seed
```

## Best Practices

### 1. Use Transactions

```javascript
const result = await prisma.$transaction(async (tx) => {
  const player = await tx.player.create({
    data: playerData
  });
  
  await tx.playerStats.create({
    data: {
      playerId: player.id,
      season: '2024'
    }
  });
  
  return player;
});
```

### 2. Validações no Nível de Aplicação

```javascript
// Validar antes de criar
if (!playerData.name || playerData.age < 16) {
  throw new Error('Dados inválidos');
}

const player = await prisma.player.create({
  data: playerData
});
```

### 3. Use Select para Otimização

```javascript
const players = await prisma.player.findMany({
  select: {
    id: true,
    name: true,
    position: true,
    number: true,
    team: {
      select: {
        name: true,
        abbreviation: true
      }
    }
  }
});
```

---

**Prisma ORM v1.0** - Configurado e pronto para uso!
