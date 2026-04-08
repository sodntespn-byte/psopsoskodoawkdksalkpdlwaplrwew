const { PrismaClient } = require('../../lib/prisma');

const prisma = new PrismaClient();

/**
 * Atualiza a classificação do campeonato após uma partida
 * @param {Object} matchData - Dados da partida finalizada
 * @param {string} matchData.matchId - ID da partida
 * @param {number} matchData.homeScore - Gols do time mandante
 * @param {number} matchData.awayScore - Gols do time visitante
 * @param {string} matchData.leagueId - ID da liga
 * @returns {Promise<Object>} - Resultado da atualização
 */
async function updateStandings(matchData) {
  try {
    const { matchId, homeScore, awayScore, leagueId } = matchData;
    
    // 1. Buscar a partida para obter os times
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true
      }
    });

    if (!match) {
      throw new Error('Partida não encontrada');
    }

    // 2. Determinar o resultado
    let homeResult = 'D'; // Derrota
    let awayResult = 'D'; // Derrota
    
    if (homeScore > awayScore) {
      homeResult = 'V'; // Vitória
      awayResult = 'D'; // Derrota
    } else if (homeScore < awayScore) {
      homeResult = 'D'; // Derrota
      awayResult = 'V'; // Vitória
    } else {
      homeResult = 'E'; // Empate
      awayResult = 'E'; // Empate
    }

    // 3. Atualizar estatísticas dos times
    const updateTeamStats = async (teamId, goalsFor, goalsAgainst, result) => {
      // Buscar estatísticas atuais do time
      let teamStats = await prisma.teamStats.findUnique({
        where: {
          teamId_season: {
            teamId,
            season: match.league.season
          }
        }
      });

      // Se não existir, criar
      if (!teamStats) {
        teamStats = await prisma.teamStats.create({
          data: {
            teamId,
            season: match.league.season,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0,
            matchesPlayed: 0
          }
        });
      }

      // Calcular novos valores
      const newWins = result === 'V' ? teamStats.wins + 1 : teamStats.wins;
      const newDraws = result === 'E' ? teamStats.draws + 1 : teamStats.draws;
      const newLosses = result === 'D' ? teamStats.losses + 1 : teamStats.losses;
      const newGoalsFor = teamStats.goalsFor + goalsFor;
      const newGoalsAgainst = teamStats.goalsAgainst + goalsAgainst;
      const newGoalDifference = newGoalsFor - newGoalsAgainst;
      const newMatchesPlayed = teamStats.matchesPlayed + 1;
      
      // Calcular pontos (3 para vitória, 1 para empate, 0 para derrota)
      const newPoints = newWins * 3 + newDraws;

      // Atualizar estatísticas
      return await prisma.teamStats.update({
        where: {
          teamId_season: {
            teamId,
            season: match.league.season
          }
        },
        data: {
          wins: newWins,
          draws: newDraws,
          losses: newLosses,
          goalsFor: newGoalsFor,
          goalsAgainst: newGoalsAgainst,
          points: newPoints,
          matchesPlayed: newMatchesPlayed
        }
      });
    };

    // 4. Atualizar estatísticas de ambos os times
    await Promise.all([
      updateTeamStats(match.homeTeamId, homeScore, awayScore, homeResult),
      updateTeamStats(match.awayTeamId, awayScore, homeScore, awayResult)
    ]);

    // 5. Atualizar status da partida
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'FINISHED',
        homeScore,
        awayScore
      }
    });

    // 6. Buscar classificação atualizada
    const updatedStandings = await prisma.teamStats.findMany({
      where: {
        season: match.league.season
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            logoUrl: true
          }
        }
      },
      orderBy: [
        { points: 'desc' },
        { goalDifference: 'desc' },
        { goalsFor: 'desc' },
        { wins: 'desc' }
      ]
    });

    // 7. Adicionar posição na classificação
    const standingsWithPosition = updatedStandings.map((team, index) => ({
      ...team,
      position: index + 1,
      form: generateFormString(team.id, match.league.season) // Gerar string de forma (ex: "VVDED")
    }));

    // 8. Retornar resultado
    return {
      success: true,
      message: 'Classificação atualizada com sucesso',
      data: {
        match: {
          id: matchId,
          homeScore,
          awayScore,
          homeResult,
          awayResult,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name
        },
        standings: standingsWithPosition,
        league: match.league.name,
        season: match.league.season
      }
    };

  } catch (error) {
    console.error('Erro ao atualizar classificação:', error);
    return {
      success: false,
      message: error.message || 'Erro ao atualizar classificação',
      error: error
    };
  }
}

/**
 * Gera string de forma dos últimos 5 jogos
 * @param {string} teamId - ID do time
 * @param {string} season - Temporada
 * @returns {Promise<string>} - String de forma (ex: "VVDED")
 */
async function generateFormString(teamId, season) {
  try {
    // Buscar as últimas 5 partidas do time
    const recentMatches = await prisma.match.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        league: {
          season: season
        },
        status: 'FINISHED'
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: {
        matchDate: 'desc'
      },
      take: 5
    });

    const formArray = recentMatches.map(match => {
      if (match.homeTeamId === teamId) {
        // Time é mandante
        if (match.homeScore > match.awayScore) return 'V'; // Vitória
        if (match.homeScore < match.awayScore) return 'D'; // Derrota
        return 'E'; // Empate
      } else {
        // Time é visitante
        if (match.awayScore > match.homeScore) return 'V'; // Vitória
        if (match.awayScore < match.homeScore) return 'D'; // Derrota
        return 'E'; // Empate
      }
    });

    return formArray.join('');
  } catch (error) {
    console.error('Erro ao gerar forma:', error);
    return '-----'; // Retorna string vazia se houver erro
  }
}

/**
 * Recalcula a classificação completa de uma liga
 * @param {string} leagueId - ID da liga
 * @param {string} season - Temporada
 * @returns {Promise<Object>} - Classificação completa
 */
async function recalculateLeagueStandings(leagueId, season) {
  try {
    // Buscar todas as partidas finalizadas da liga
    const finishedMatches = await prisma.match.findMany({
      where: {
        leagueId,
        league: {
          season: season
        },
        status: 'FINISHED'
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true
      }
    });

    // Resetar todas as estatísticas da liga
    await prisma.teamStats.deleteMany({
      where: {
        season: season
      }
    });

    // Criar estatísticas iniciais para todos os times da liga
    const teams = await prisma.team.findMany({
      where: {
        leagueId
      }
    });

    for (const team of teams) {
      await prisma.teamStats.create({
        data: {
          teamId: team.id,
          season: season,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
          matchesPlayed: 0
        }
      });
    }

    // Processar cada partida
    for (const match of finishedMatches) {
      await updateStandings({
        matchId: match.id,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        leagueId: match.leagueId
      });
    }

    // Retornar classificação atualizada
    return await getLeagueStandings(leagueId, season);

  } catch (error) {
    console.error('Erro ao recalcular classificação:', error);
    throw error;
  }
}

/**
 * Busca a classificação atual de uma liga
 * @param {string} leagueId - ID da liga
 * @param {string} season - Temporada
 * @returns {Promise<Array>} - Classificação ordenada
 */
async function getLeagueStandings(leagueId, season) {
  try {
    const standings = await prisma.teamStats.findMany({
      where: {
        season: season
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            logoUrl: true
          }
        }
      },
      orderBy: [
        { points: 'desc' },
        { goalDifference: 'desc' },
        { goalsFor: 'desc' },
        { wins: 'desc' }
      ]
    });

    return standings.map((team, index) => ({
      ...team,
      position: index + 1,
      goalDifference: team.goalsFor - team.goalsAgainst,
      form: generateFormString(team.teamId, season)
    }));

  } catch (error) {
    console.error('Erro ao buscar classificação:', error);
    throw error;
  }
}

/**
 * Atualiza cache e revalida páginas estáticas
 * @param {string} leagueId - ID da liga
 * @param {string} season - Temporada
 */
async function invalidateCache(leagueId, season) {
  try {
    // Se estiver usando Next.js, revalidar páginas
    if (typeof require !== 'undefined') {
      const { revalidatePath } = require('next/cache');
      
      // Revalidar página principal
      revalidatePath('/');
      
      // Revalidar página de classificação
      revalidatePath(`/rankings/${leagueId}`);
      
      // Revalidar API routes
      revalidatePath('/api/standings');
      revalidatePath(`/api/leagues/${leagueId}/standings`);
    }

    // Se estiver usando outro framework, implementar cache invalidation
    console.log('Cache invalidado para:', {
      leagueId,
      season,
      paths: ['/', `/rankings/${leagueId}`, '/api/standings']
    });

  } catch (error) {
    console.error('Erro ao invalidar cache:', error);
  }
}

module.exports = {
  updateStandings,
  recalculateLeagueStandings,
  getLeagueStandings,
  invalidateCache,
  generateFormString
};
