const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEEDING DATABASE ===');

  // Criar ligas
  const brasileirao = await prisma.league.upsert({
    where: { name: 'Brasileirão Série A' },
    update: {},
    create: {
      name: 'Brasileirão Série A',
      description: 'Campeonato Brasileiro de Futebol - Série A',
      country: 'Brasil',
      season: '2024',
      isActive: true
    }
  });

  const libertadores = await prisma.league.upsert({
    where: { name: 'Copa Libertadores' },
    update: {},
    create: {
      name: 'Copa Libertadores',
      description: 'Copa Libertadores da América',
      country: 'América do Sul',
      season: '2024',
      isActive: true
    }
  });

  console.log('Ligas criadas:', { brasileirao: brasileirao.name, libertadores: libertadores.name });

  // Criar times
  const teams = [
    {
      name: 'Flamengo',
      abbreviation: 'FLA',
      city: 'Rio de Janeiro',
      state: 'RJ',
      founded: 1895,
      stadium: 'Maracanã',
      logoUrl: '/shields/flamengo.png',
      leagueId: brasileirao.id
    },
    {
      name: 'Palmeiras',
      abbreviation: 'PAL',
      city: 'São Paulo',
      state: 'SP',
      founded: 1914,
      stadium: 'Allianz Parque',
      logoUrl: '/shields/palmeiras.png',
      leagueId: brasileirao.id
    },
    {
      name: 'Corinthians',
      abbreviation: 'COR',
      city: 'São Paulo',
      state: 'SP',
      founded: 1910,
      stadium: 'Neo Química Arena',
      logoUrl: '/shields/corinthians.png',
      leagueId: brasileirao.id
    },
    {
      name: 'São Paulo',
      abbreviation: 'SAO',
      city: 'São Paulo',
      state: 'SP',
      founded: 1930,
      stadium: 'Morumbi',
      logoUrl: '/shields/sao-paulo.png',
      leagueId: brasileirao.id
    },
    {
      name: 'Santos',
      abbreviation: 'SAN',
      city: 'Santos',
      state: 'SP',
      founded: 1912,
      stadium: 'Vila Belmiro',
      logoUrl: '/shields/santos.png',
      leagueId: brasileirao.id
    },
    {
      name: 'Grêmio',
      abbreviation: 'GRE',
      city: 'Porto Alegre',
      state: 'RS',
      founded: 1903,
      stadium: 'Arena do Grêmio',
      logoUrl: '/shields/gremio.png',
      leagueId: brasileirao.id
    },
    {
      name: 'Cruzeiro',
      abbreviation: 'CRU',
      city: 'Belo Horizonte',
      state: 'MG',
      founded: 1921,
      stadium: 'Mineirão',
      logoUrl: '/shields/cruzeiro.png',
      leagueId: brasileirao.id
    },
    {
      name: 'Internacional',
      abbreviation: 'INT',
      city: 'Porto Alegre',
      state: 'RS',
      founded: 1909,
      stadium: 'Beira-Rio',
      logoUrl: '/shields/internacional.png',
      leagueId: brasileirao.id
    },
    {
      name: 'Atlético-MG',
      abbreviation: 'CAM',
      city: 'Belo Horizonte',
      state: 'MG',
      founded: 1908,
      stadium: 'Arena MRV',
      logoUrl: '/shields/atletico-mg.png',
      leagueId: brasileirao.id
    },
    {
      name: 'Botafogo',
      abbreviation: 'BOT',
      city: 'Rio de Janeiro',
      state: 'RJ',
      founded: 1904,
      stadium: 'Engenhão',
      logoUrl: '/shields/botafogo.png',
      leagueId: brasileirao.id
    }
  ];

  const createdTeams = [];
  for (const teamData of teams) {
    const team = await prisma.team.upsert({
      where: { name: teamData.name },
      update: {},
      create: teamData
    });
    createdTeams.push(team);
  }

  console.log(`${createdTeams.length} times criados`);

  // Criar jogadores
  const players = [
    // Flamengo
    { name: 'Gabriel Barbosa', nickname: 'Gabigol', age: 28, position: 'FW', number: 10, nationality: 'Brasil', teamId: createdTeams[0].id },
    { name: 'Bruno Henrique', nickname: null, age: 29, position: 'FW', number: 27, nationality: 'Brasil', teamId: createdTeams[0].id },
    { name: 'Éverton Ribeiro', nickname: null, age: 34, position: 'MF', number: 8, nationality: 'Brasil', teamId: createdTeams[0].id },
    
    // Palmeiras
    { name: 'Rony', nickname: null, age: 28, position: 'FW', number: 10, nationality: 'Brasil', teamId: createdTeams[1].id },
    { name: 'Endrick', nickname: null, age: 17, position: 'FW', number: 9, nationality: 'Brasil', teamId: createdTeams[1].id },
    { name: 'Rafael Veiga', nickname: null, age: 25, position: 'MF', number: 23, nationality: 'Brasil', teamId: createdTeams[1].id },
    
    // Corinthians
    { name: 'Yuri Alberto', nickname: null, age: 24, position: 'FW', number: 9, nationality: 'Brasil', teamId: createdTeams[2].id },
    { name: 'Roger Guedes', nickname: null, age: 27, position: 'FW', number: 11, nationality: 'Brasil', teamId: createdTeams[2].id },
    { name: 'Maycon', nickname: null, age: 26, position: 'MF', number: 5, nationality: 'Brasil', teamId: createdTeams[2].id },
    
    // São Paulo
    { name: 'Lucas', nickname: 'Lucas', age: 31, position: 'FW', number: 7, nationality: 'Brasil', teamId: createdTeams[3].id },
    { name: 'Rodrigo Nestor', nickname: 'Nestor', age: 24, position: 'MF', number: 8, nationality: 'Brasil', teamId: createdTeams[3].id },
    { name: 'James Rodríguez', nickname: null, age: 32, position: 'MF', number: 10, nationality: 'Colômbia', teamId: createdTeams[3].id },
    
    // Santos
    { name: 'Marcos Leonardo', nickname: null, age: 20, position: 'FW', number: 9, nationality: 'Brasil', teamId: createdTeams[4].id },
    { name: 'Soteldo', nickname: null, age: 26, position: 'MF', number: 10, nationality: 'Venezuela', teamId: createdTeams[4].id },
    { name: 'Joaquim', nickname: null, age: 21, position: 'FW', number: 11, nationality: 'Brasil', teamId: createdTeams[4].id }
  ];

  const createdPlayers = [];
  for (const playerData of players) {
    const player = await prisma.player.create({
      data: playerData
    });
    createdPlayers.push(player);
  }

  console.log(`${createdPlayers.length} jogadores criados`);

  // Criar algumas partidas
  const matches = [
    {
      homeTeamId: createdTeams[0].id, // Flamengo
      awayTeamId: createdTeams[1].id, // Palmeiras
      leagueId: brasileirao.id,
      matchDate: new Date('2024-03-15T20:00:00Z'),
      venue: 'Maracanã',
      round: '1ª Rodada'
    },
    {
      homeTeamId: createdTeams[2].id, // Corinthians
      awayTeamId: createdTeams[3].id, // São Paulo
      leagueId: brasileirao.id,
      matchDate: new Date('2024-03-16T16:00:00Z'),
      venue: 'Neo Química Arena',
      round: '1ª Rodada'
    },
    {
      homeTeamId: createdTeams[4].id, // Santos
      awayTeamId: createdTeams[5].id, // Grêmio
      leagueId: brasileirao.id,
      matchDate: new Date('2024-03-17T18:30:00Z'),
      venue: 'Vila Belmiro',
      round: '1ª Rodada'
    },
    {
      homeTeamId: createdTeams[6].id, // Cruzeiro
      awayTeamId: createdTeams[7].id, // Internacional
      leagueId: brasileirao.id,
      matchDate: new Date('2024-03-18T20:00:00Z'),
      venue: 'Mineirão',
      round: '1ª Rodada'
    },
    {
      homeTeamId: createdTeams[8].id, // Atlético-MG
      awayTeamId: createdTeams[9].id, // Botafogo
      leagueId: brasileirao.id,
      matchDate: new Date('2024-03-19T21:30:00Z'),
      venue: 'Arena MRV',
      round: '1ª Rodada'
    }
  ];

  const createdMatches = [];
  for (const matchData of matches) {
    const match = await prisma.match.create({
      data: matchData
    });
    createdMatches.push(match);
  }

  console.log(`${createdMatches.length} partidas criadas`);

  // Criar estatísticas iniciais dos times
  for (const team of createdTeams) {
    await prisma.teamStats.create({
      data: {
        teamId: team.id,
        season: '2024',
        wins: Math.floor(Math.random() * 5),
        draws: Math.floor(Math.random() * 3),
        losses: Math.floor(Math.random() * 2),
        goalsFor: Math.floor(Math.random() * 10),
        goalsAgainst: Math.floor(Math.random() * 8),
        matchesPlayed: Math.floor(Math.random() * 10)
      }
    });
  }

  console.log('Estatísticas dos times criadas');

  // Criar estatísticas iniciais dos jogadores
  for (const player of createdPlayers) {
    await prisma.playerStats.create({
      data: {
        playerId: player.id,
        season: '2024',
        goals: Math.floor(Math.random() * 5),
        assists: Math.floor(Math.random() * 3),
        yellowCards: Math.floor(Math.random() * 3),
        redCards: Math.floor(Math.random() * 1),
        matchesPlayed: Math.floor(Math.random() * 10),
        minutesPlayed: Math.floor(Math.random() * 500)
      }
    });
  }

  console.log('Estatísticas dos jogadores criadas');

  console.log('\n=== SEEDING COMPLETO ===');
  console.log(`Ligas: 2`);
  console.log(`Times: ${createdTeams.length}`);
  console.log(`Jogadores: ${createdPlayers.length}`);
  console.log(`Partidas: ${createdMatches.length}`);
  console.log('Banco de dados populado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
