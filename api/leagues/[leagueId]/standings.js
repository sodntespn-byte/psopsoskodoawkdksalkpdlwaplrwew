const { getLeagueStandings } = require('../../lib/standings');

/**
 * API Route para buscar classificação de uma liga
 * GET /api/leagues/[leagueId]/standings?season=2024
 * 
 * Query params:
 * - season: Temporada (opcional, padrão: temporada atual)
 * - limit: Limite de times (opcional, padrão: 20)
 * - offset: Offset para paginação (opcional, padrão: 0)
 */
module.exports = async (req, res) => {
  // Verificar método HTTP
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido. Use GET.'
    });
  }

  try {
    const { leagueId } = req.query;
    const { season, limit = 20, offset = 0 } = req.query;

    // Validação dos parâmetros
    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: 'ID da liga é obrigatório'
      });
    }

    // Buscar informações da liga para obter a temporada atual
    const { PrismaClient } = require('../../lib/prisma');
    const prisma = new PrismaClient();

    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        message: 'Liga não encontrada'
      });
    }

    // Usar temporada da query ou temporada da liga
    const targetSeason = season || league.season;

    // Buscar classificação
    const standings = await getLeagueStandings(leagueId, targetSeason);

    // Aplicar paginação se necessário
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedStandings = standings.slice(startIndex, endIndex);

    // Calcular informações de paginação
    const totalTeams = standings.length;
    const totalPages = Math.ceil(totalTeams / parseInt(limit));
    const currentPage = Math.floor(startIndex / parseInt(limit)) + 1;

    // Adicionar informações adicionais
    const enhancedStandings = paginatedStandings.map((team, index) => ({
      ...team,
      position: startIndex + index + 1,
      goalDifference: team.goalsFor - team.goalsAgainst,
      pointsPerGame: team.matchesPlayed > 0 ? (team.points / team.matchesPlayed).toFixed(2) : 0,
      winRate: team.matchesPlayed > 0 ? ((team.wins / team.matchesPlayed) * 100).toFixed(1) : 0,
      recentForm: team.form || '-----',
      streak: calculateStreak(team.form || '-----'),
      homeRecord: getHomeAwayRecord(team.teamId, targetSeason, 'home'),
      awayRecord: getHomeAwayRecord(team.teamId, targetSeason, 'away')
    }));

    // Retornar resposta
    res.status(200).json({
      success: true,
      data: {
        league: {
          id: league.id,
          name: league.name,
          season: targetSeason,
          country: league.country
        },
        standings: enhancedStandings,
        pagination: {
          currentPage,
          totalPages,
          totalTeams,
          limit: parseInt(limit),
          offset: startIndex,
          hasNext: endIndex < totalTeams,
          hasPrev: startIndex > 0
        },
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalMatches: await getTotalMatches(leagueId, targetSeason),
          teamsCount: totalTeams
        }
      }
    });

  } catch (error) {
    console.error('Erro na API de classificação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Fechar conexão Prisma
    if (typeof prisma !== 'undefined') {
      await prisma.$disconnect();
    }
  }
};

/**
 * Calcula sequência atual (vitórias/derrotas/empates consecutivos)
 * @param {string} form - String de forma (ex: "VVDED")
 * @returns {Object} - Informações da sequência
 */
function calculateStreak(form) {
  if (!form || form.length === 0) {
    return { type: '-', count: 0 };
  }

  const lastResult = form[0];
  let count = 1;

  for (let i = 1; i < form.length; i++) {
    if (form[i] === lastResult) {
      count++;
    } else {
      break;
    }
  }

  const streakTypes = {
    'V': 'Vitórias',
    'D': 'Derrotas',
    'E': 'Empates'
  };

  return {
    type: lastResult,
    count,
    description: `${count} ${streakTypes[lastResult] || 'Jogos'} consecutivos`
  };
}

/**
 * Busca record de mandante/visitante
 * @param {string} teamId - ID do time
 * @param {string} season - Temporada
 * @param {string} type - 'home' ou 'away'
 * @returns {Promise<Object>} - Record
 */
async function getHomeAwayRecord(teamId, season, type) {
  try {
    const { PrismaClient } = require('../../lib/prisma');
    const prisma = new PrismaClient();

    const whereClause = type === 'home' 
      ? { homeTeamId: teamId }
      : { awayTeamId: teamId };

    const matches = await prisma.match.findMany({
      where: {
        ...whereClause,
        league: {
          season: season
        },
        status: 'FINISHED'
      }
    });

    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;

    matches.forEach(match => {
      const teamScore = type === 'home' ? match.homeScore : match.awayScore;
      const opponentScore = type === 'home' ? match.awayScore : match.homeScore;

      if (teamScore > opponentScore) wins++;
      else if (teamScore < opponentScore) losses++;
      else draws++;

      goalsFor += teamScore;
      goalsAgainst += opponentScore;
    });

    await prisma.$disconnect();

    return {
      played: matches.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points: wins * 3 + draws
    };

  } catch (error) {
    console.error('Erro ao buscar record mandante/visitante:', error);
    return null;
  }
}

/**
 * Busca total de partidas da liga
 * @param {string} leagueId - ID da liga
 * @param {string} season - Temporada
 * @returns {Promise<number>} - Total de partidas
 */
async function getTotalMatches(leagueId, season) {
  try {
    const { PrismaClient } = require('../../lib/prisma');
    const prisma = new PrismaClient();

    const count = await prisma.match.count({
      where: {
        leagueId,
        league: {
          season: season
        }
      }
    });

    await prisma.$disconnect();
    return count;

  } catch (error) {
    console.error('Erro ao buscar total de partidas:', error);
    return 0;
  }
}
