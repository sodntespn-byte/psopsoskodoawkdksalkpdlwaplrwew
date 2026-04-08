const { PrismaClient } = require('../lib/prisma');
const { updateStandings, getLeagueStandings } = require('../lib/standings');

class MatchManager {
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Salvar nova partida no banco de dados
   * @param {Object} matchData - Dados da partida
   * @param {string} matchData.homeTeamName - Nome do time mandante
   * @param {string} matchData.awayTeamName - Nome do time visitante
   * @param {number} matchData.homeScore - Gols do mandante
   * @param {number} matchData.awayScore - Gols do visitante
   * @param {string} matchData.leagueId - ID da liga
   * @param {string} matchData.venue - Local da partida
   * @param {string} matchData.round - Rodada
   * @returns {Promise<Object>} - Partida salva
   */
  async saveMatch(matchData) {
    try {
      const {
        homeTeamName,
        awayTeamName,
        homeScore,
        awayScore,
        leagueId,
        venue = 'Estádio',
        round = 'Rodada Única'
      } = matchData;

      // Buscar times no banco de dados
      const [homeTeam, awayTeam] = await Promise.all([
        this.findTeamByName(homeTeamName),
        this.findTeamByName(awayTeamName)
      ]);

      if (!homeTeam || !awayTeam) {
        throw new Error(`Time(s) não encontrado(s): ${!homeTeam ? homeTeamName : ''} ${!awayTeam ? awayTeamName : ''}`);
      }

      // Verificar se a partida já existe
      const existingMatch = await this.prisma.match.findFirst({
        where: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          leagueId,
          status: 'FINISHED'
        }
      });

      if (existingMatch) {
        throw new Error('Esta partida já foi registrada!');
      }

      // Criar a partida
      const match = await this.prisma.match.create({
        data: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          leagueId,
          matchDate: new Date(),
          venue,
          round,
          status: 'FINISHED',
          homeScore,
          awayScore
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          league: true
        }
      });

      console.log(`Partida salva: ${homeTeam.name} ${homeScore} x ${awayScore} ${awayTeam.name}`);
      return match;

    } catch (error) {
      console.error('Erro ao salvar partida:', error);
      throw error;
    }
  }

  /**
   * Atualizar estatísticas dos times automaticamente
   * @param {string} matchId - ID da partida
   * @returns {Promise<Object>} - Resultado da atualização
   */
  async updateTeamStats(matchId) {
    try {
      // Buscar a partida com todos os dados
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: true,
          awayTeam: true,
          league: true
        }
      });

      if (!match) {
        throw new Error('Partida não encontrada!');
      }

      // Determinar resultado
      const homeResult = match.homeScore > match.awayScore ? 'V' : 
                        match.homeScore < match.awayScore ? 'D' : 'E';
      const awayResult = match.awayScore > match.homeScore ? 'V' : 
                        match.awayScore < match.homeScore ? 'D' : 'E';

      // Atualizar estatísticas de ambos os times
      await Promise.all([
        this.updateTeamStatsForTeam(
          match.homeTeamId, 
          match.league.season, 
          match.homeScore, 
          match.awayScore, 
          homeResult
        ),
        this.updateTeamStatsForTeam(
          match.awayTeamId, 
          match.league.season, 
          match.awayScore, 
          match.homeScore, 
          awayResult
        )
      ]);

      console.log(`Estatísticas atualizadas para: ${match.homeTeam.name} e ${match.awayTeam.name}`);
      return { success: true, match };

    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Atualizar estatísticas de um time específico
   * @param {string} teamId - ID do time
   * @param {string} season - Temporada
   * @param {number} goalsFor - Gols marcados
   * @param {number} goalsAgainst - Gols sofridos
   * @param {string} result - Resultado (V, E, D)
   */
  async updateTeamStatsForTeam(teamId, season, goalsFor, goalsAgainst, result) {
    // Buscar estatísticas atuais
    let teamStats = await this.prisma.teamStats.findUnique({
      where: {
        teamId_season: {
          teamId,
          season
        }
      }
    });

    // Se não existir, criar
    if (!teamStats) {
      teamStats = await this.prisma.teamStats.create({
        data: {
          teamId,
          season,
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
    const newPoints = newWins * 3 + newDraws; // 3 pontos por vitória, 1 por empate
    const newMatchesPlayed = teamStats.matchesPlayed + 1;

    // Atualizar estatísticas
    return await this.prisma.teamStats.update({
      where: {
        teamId_season: {
          teamId,
          season
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
  }

  /**
   * Ordenar classificação automaticamente
   * @param {string} leagueId - ID da liga
   * @param {string} season - Temporada
   * @returns {Promise<Array>} - Classificação ordenada
   */
  async getOrderedStandings(leagueId, season) {
    try {
      const standings = await this.prisma.teamStats.findMany({
        where: {
          season
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
        }
      });

      // Filtrar apenas times da liga especificada
      const leagueTeams = standings.filter(stat => {
        // Verificar se o time pertence à liga (implementar lógica adequada)
        return true; // Temporariamente, incluir todos
      });

      // Ordenar por critérios: Pontos > Vitórias > Saldo de Gols > Gols Marcados
      const orderedStandings = leagueTeams.sort((a, b) => {
        // 1. Pontos
        if (b.points !== a.points) return b.points - a.points;
        
        // 2. Vitórias
        if (b.wins !== a.wins) return b.wins - a.wins;
        
        // 3. Saldo de Gols
        const aGoalDiff = a.goalsFor - a.goalsAgainst;
        const bGoalDiff = b.goalsFor - b.goalsAgainst;
        if (bGoalDiff !== aGoalDiff) return bGoalDiff - aGoalDiff;
        
        // 4. Gols Marcados
        return b.goalsFor - a.goalsFor;
      });

      // Adicionar posição
      const standingsWithPosition = orderedStandings.map((team, index) => ({
        ...team,
        position: index + 1,
        goalDifference: team.goalsFor - team.goalsAgainst,
        form: this.generateFormString(team.teamId, season)
      }));

      console.log(`Classificação ordenada para liga ${leagueId}, temporada ${season}`);
      return standingsWithPosition;

    } catch (error) {
      console.error('Erro ao ordenar classificação:', error);
      throw error;
    }
  }

  /**
   * Gerar string de forma dos últimos 5 jogos
   * @param {string} teamId - ID do time
   * @param {string} season - Temporada
   * @returns {Promise<string>} - String de forma (ex: "VVDED")
   */
  async generateFormString(teamId, season) {
    try {
      const recentMatches = await this.prisma.match.findMany({
        where: {
          OR: [
            { homeTeamId: teamId },
            { awayTeamId: teamId }
          ],
          league: {
            season
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
          return match.homeScore > match.awayScore ? 'V' :
                 match.homeScore < match.awayScore ? 'D' : 'E';
        } else {
          // Time é visitante
          return match.awayScore > match.homeScore ? 'V' :
                 match.awayScore < match.homeScore ? 'D' : 'E';
        }
      });

      return formArray.join('');
    } catch (error) {
      console.error('Erro ao gerar forma:', error);
      return '-----';
    }
  }

  /**
   * Buscar time pelo nome (case insensitive)
   * @param {string} teamName - Nome do time
   * @returns {Promise<Object>} - Time encontrado
   */
  async findTeamByName(teamName) {
    try {
      const team = await this.prisma.team.findFirst({
        where: {
          name: {
            contains: teamName,
            mode: 'insensitive'
          }
        }
      });

      return team;
    } catch (error) {
      console.error('Erro ao buscar time:', error);
      throw error;
    }
  }

  /**
   * Atualizar foto do time
   * @param {string} teamName - Nome do time
   * @param {string} photoUrl - URL da foto
   * @returns {Promise<Object>} - Time atualizado
   */
  async updateTeamPhoto(teamName, photoUrl) {
    try {
      const team = await this.findTeamByName(teamName);
      
      if (!team) {
        throw new Error(`Time "${teamName}" não encontrado!`);
      }

      const updatedTeam = await this.prisma.team.update({
        where: { id: team.id },
        data: { logoUrl: photoUrl }
      });

      console.log(`Foto atualizada para ${team.name}: ${photoUrl}`);
      return updatedTeam;

    } catch (error) {
      console.error('Erro ao atualizar foto:', error);
      throw error;
    }
  }

  /**
   * Definir ordem das ligas
   * @param {Array<string>} leagueOrder - Array de IDs em ordem
   * @returns {Promise<boolean>} - Sucesso
   */
  async setLeagueOrder(leagueOrder) {
    try {
      for (let i = 0; i < leagueOrder.length; i++) {
        await this.prisma.league.update({
          where: { id: leagueOrder[i] },
          data: { order: i + 1 }
        });
      }

      console.log('Ordem das ligas atualizada:', leagueOrder);
      return true;

    } catch (error) {
      console.error('Erro ao definir ordem das ligas:', error);
      throw error;
    }
  }

  /**
   * Buscar últimas partidas
   * @param {number} limit - Limite de partidas
   * @returns {Promise<Array>} - Últimas partidas
   */
  async getRecentMatches(limit = 10) {
    try {
      const matches = await this.prisma.match.findMany({
        where: { status: 'FINISHED' },
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          },
          league: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return matches;
    } catch (error) {
      console.error('Erro ao buscar partidas recentes:', error);
      throw error;
    }
  }

  /**
   * Processar resultado completo (salvar partida + atualizar estatísticas + ordenar)
   * @param {Object} matchData - Dados da partida
   * @returns {Promise<Object>} - Resultado completo
   */
  async processMatchResult(matchData) {
    try {
      // 1. Salvar partida
      const match = await this.saveMatch(matchData);

      // 2. Atualizar estatísticas
      await this.updateTeamStats(match.id);

      // 3. Buscar classificação ordenada
      const standings = await this.getOrderedStandings(match.leagueId, match.league.season);

      console.log(`Processo completo para partida ${match.id} finalizado!`);
      
      return {
        success: true,
        match,
        standings,
        message: 'Partida registrada e classificação atualizada com sucesso!'
      };

    } catch (error) {
      console.error('Erro ao processar resultado:', error);
      throw error;
    }
  }

  /**
   * Encerrar conexão com Prisma
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = MatchManager;
