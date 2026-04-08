const { EmbedBuilder } = require('discord.js');
const PSOEmbedBuilder = require('../../lib/embedBuilder');

/**
 * Handler para modais de partidas
 * Processa os dados do modal e salva no banco
 */

class MatchHandler {
  constructor() {
    this.embedBuilder = new PSOEmbedBuilder();
  }

  async handle(interaction, bot) {
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'match_register_modal') {
        await this.handleMatchModal(interaction, bot);
      }
    }
  }

  async handleMatchModal(interaction, bot) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Extrair dados do modal
      const homeTeam = interaction.fields.getTextInputValue('home_team');
      const awayTeam = interaction.fields.getTextInputValue('away_team');
      const homeScore = parseInt(interaction.fields.getTextInputValue('home_score'));
      const awayScore = parseInt(interaction.fields.getTextInputValue('away_score'));
      const round = interaction.fields.getTextInputValue('round') || 'Amistoso';

      // Validar dados
      if (!homeTeam || !awayTeam || isNaN(homeScore) || isNaN(awayScore)) {
        await interaction.editReply({
          content: 'Dados inválidos. Por favor, preencha todos os campos corretamente.'
        });
        return;
      }

      // Buscar times no banco
      const homeTeamData = await bot.prisma.team.findFirst({
        where: { name: { contains: homeTeam, mode: 'insensitive' } }
      });

      const awayTeamData = await bot.prisma.team.findFirst({
        where: { name: { contains: awayTeam, mode: 'insensitive' } }
      });

      if (!homeTeamData || !awayTeamData) {
        await interaction.editReply({
          content: `Um ou ambos os times não foram encontrados: "${homeTeam}" ou "${awayTeam}"`
        });
        return;
      }

      // Buscar ou criar liga
      let league = await bot.prisma.league.findFirst({
        where: { name: { contains: round, mode: 'insensitive' } } 
      });

      if (!league) {
        league = await bot.prisma.league.create({
          data: {
            name: round,
            country: 'Brasil',
            season: '2024'
          }
        });
      }

      // Criar partida no banco
      const match = await bot.prisma.match.create({
        data: {
          homeTeamId: homeTeamData.id,
          awayTeamId: awayTeamData.id,
          leagueId: league.id,
          matchDate: new Date(),
          status: 'FINISHED',
          homeScore,
          awayScore,
          round
        },
        include: {
          homeTeam: { select: { name: true, logoUrl: true } },
          awayTeam: { select: { name: true, logoUrl: true } }
        }
      });

      // Atualizar estatísticas dos times
      await this.updateTeamStats(bot, homeTeamData.id, awayTeamData.id, homeScore, awayScore);

      // Criar log
      await bot.prisma.botLog.create({
        data: {
          guildId: interaction.guild.id,
          action: 'MATCH_REGISTERED',
          command: '/partida registrar',
          userId: interaction.user.id,
          username: interaction.user.username,
          matchId: match.id,
          status: 'SUCCESS',
          data: {
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            homeScore,
            awayScore,
            round
          }
        }
      });

      // Enviar confirmação no canal configurado
      await this.announceMatch(interaction, bot, match, homeTeam, awayTeam, homeScore, awayScore);

      // Notificar site via WebSocket
      bot.notifyWebsite('new-match', {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore,
        awayScore,
        round,
        timestamp: new Date().toISOString()
      });

      // Notificar atualização de classificação
      bot.notifyWebsite('standings-updated', {
        leagueId: league.id,
        timestamp: new Date().toISOString()
      });

      await interaction.editReply({
        content: `Partida registrada: ${homeTeam} ${homeScore} x ${awayScore} ${awayTeam}. ID: ${match.id}`
      });

    } catch (error) {
      console.error('[MATCH_HANDLER] Erro ao processar partida:', error);

      // Log do erro
      await bot.prisma.botLog.create({
        data: {
          guildId: interaction.guild.id,
          action: 'MATCH_REGISTERED',
          command: '/partida registrar',
          userId: interaction.user.id,
          username: interaction.user.username,
          status: 'FAILED',
          errorMessage: error.message
        }
      });

      await interaction.editReply({
        content: 'Erro ao registrar partida. Verifique os dados e tente novamente.'
      });
    }
  }

  async updateTeamStats(bot, homeTeamId, awayTeamId, homeScore, awayScore) {
    try {
      // Determinar resultado
      let homeResult, awayResult;
      if (homeScore > awayScore) {
        homeResult = { wins: 1, points: 3 };
        awayResult = { losses: 1, points: 0 };
      } else if (homeScore < awayScore) {
        homeResult = { losses: 1, points: 0 };
        awayResult = { wins: 1, points: 3 };
      } else {
        homeResult = { draws: 1, points: 1 };
        awayResult = { draws: 1, points: 1 };
      }

      // Atualizar ou criar estatísticas do time da casa
      const homeStats = await bot.prisma.teamStats.findUnique({
        where: { teamId: homeTeamId }
      });

      if (homeStats) {
        await bot.prisma.teamStats.update({
          where: { teamId: homeTeamId },
          data: {
            wins: homeStats.wins + (homeResult.wins || 0),
            losses: homeStats.losses + (homeResult.losses || 0),
            draws: homeStats.draws + (homeResult.draws || 0),
            goalsFor: homeStats.goalsFor + homeScore,
            goalsAgainst: homeStats.goalsAgainst + awayScore,
            points: homeStats.points + homeResult.points,
            matchesPlayed: homeStats.matchesPlayed + 1
          }
        });
      } else {
        await bot.prisma.teamStats.create({
          data: {
            teamId: homeTeamId,
            wins: homeResult.wins || 0,
            losses: homeResult.losses || 0,
            draws: homeResult.draws || 0,
            goalsFor: homeScore,
            goalsAgainst: awayScore,
            points: homeResult.points,
            matchesPlayed: 1,
            season: '2024'
          }
        });
      }

      // Atualizar ou criar estatísticas do time visitante
      const awayStats = await bot.prisma.teamStats.findUnique({
        where: { teamId: awayTeamId }
      });

      if (awayStats) {
        await bot.prisma.teamStats.update({
          where: { teamId: awayTeamId },
          data: {
            wins: awayStats.wins + (awayResult.wins || 0),
            losses: awayStats.losses + (awayResult.losses || 0),
            draws: awayStats.draws + (awayResult.draws || 0),
            goalsFor: awayStats.goalsFor + awayScore,
            goalsAgainst: awayStats.goalsAgainst + homeScore,
            points: awayStats.points + awayResult.points,
            matchesPlayed: awayStats.matchesPlayed + 1
          }
        });
      } else {
        await bot.prisma.teamStats.create({
          data: {
            teamId: awayTeamId,
            wins: awayResult.wins || 0,
            losses: awayResult.losses || 0,
            draws: awayResult.draws || 0,
            goalsFor: awayScore,
            goalsAgainst: homeScore,
            points: awayResult.points,
            matchesPlayed: 1,
            season: '2024'
          }
        });
      }

    } catch (error) {
      console.error('[MATCH_HANDLER] Erro ao atualizar estatísticas:', error);
    }
  }

  async announceMatch(interaction, bot, match, homeTeamName, awayTeamName, homeScore, awayScore) {
    try {
      // Buscar configuração do servidor
      const config = await bot.getGuildConfig(interaction.guild.id);

      if (!config || !config.resultsChannelId) {
        console.log('[MATCH_HANDLER] Canal de resultados não configurado');
        return;
      }

      const channel = await interaction.guild.channels.fetch(config.resultsChannelId);
      if (!channel) {
        console.log('[MATCH_HANDLER] Canal não encontrado');
        return;
      }

      // Preparar dados para o embed técnico
      const matchData = {
        id: match.id,
        homeTeamName,
        awayTeamName,
        homeScore,
        awayScore,
        matchDate: match.matchDate,
        round: match.round,
        leagueName: match.league?.name || 'PSO BRASIL',
        venue: match.venue,
        status: match.status
      };

      // Preparar logos dos clubes
      const clubLogos = {
        homeTeam: match.homeTeam?.logoUrl,
        awayTeam: match.awayTeam?.logoUrl
      };

      // Criar embed técnico
      const embed = this.embedBuilder.createMatchEmbed(matchData, clubLogos);
      
      // Criar botões de ação
      const actionRow = this.embedBuilder.createMatchButtons(match.id);

      // Enviar mensagem com embed e botões
      await channel.send({ 
        embeds: [embed],
        components: [actionRow]
      });

      console.log('[MATCH_HANDLER] Anúncio técnico enviado no canal de resultados');

    } catch (error) {
      console.error('[MATCH_HANDLER] Erro ao enviar anúncio:', error);
    }
  }
}

module.exports = new MatchHandler();
