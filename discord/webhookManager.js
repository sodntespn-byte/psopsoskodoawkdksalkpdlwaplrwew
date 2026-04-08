const { PrismaClient } = require('../lib/prisma');
const { getLeagueStandings } = require('../lib/standings');

class WebhookManager {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.prisma = new PrismaClient();
  }

  /**
   * Enviar notificação de sucesso para o Discord
   * @param {Object} data - Dados da notificação
   * @param {string} data.type - Tipo de notificação
   * @param {Object} data.matchData - Dados da partida (se aplicável)
   * @param {Object} data.teamData - Dados do time (se aplicável)
   * @param {Object} data.leagueData - Dados da liga (se aplicável)
   */
  async sendSuccessNotification(data) {
    try {
      const embed = this.createSuccessEmbed(data);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [embed],
          username: 'PSO Brasil Bot',
          avatar_url: 'https://media.giphy.com/media/v1.YBilCkYBvBd7U/giphy.gif'
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }

      console.log('Notificação enviada com sucesso para o Discord');
      return { success: true };

    } catch (error) {
      console.error('Erro ao enviar notificação webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Criar embed de sucesso baseado no tipo
   * @param {Object} data - Dados da notificação
   * @returns {Object} - Embed formatado
   */
  createSuccessEmbed(data) {
    const baseEmbed = {
      title: 'Site Atualizado com Sucesso!',
      color: 0x00ff00, // Verde
      timestamp: new Date().toISOString(),
      thumbnail: {
        url: 'https://media.giphy.com/media/v1.YBilCkYBvBd7U/giphy.gif'
      },
      footer: {
        text: 'PSO Brasil - Atualização Automática'
      }
    };

    switch (data.type) {
      case 'match_result':
        return this.createMatchResultEmbed(baseEmbed, data);
      case 'team_photo_updated':
        return this.createTeamPhotoEmbed(baseEmbed, data);
      case 'league_order_updated':
        return this.createLeagueOrderEmbed(baseEmbed, data);
      case 'standings_updated':
        return this.createStandingsUpdatedEmbed(baseEmbed, data);
      default:
        return {
          ...baseEmbed,
          description: 'O site foi atualizado com sucesso!'
        };
    }
  }

  /**
   * Criar embed para resultado de partida
   */
  createMatchResultEmbed(baseEmbed, data) {
    const { matchData, leagueData } = data;
    
    // Determinar vencedor
    const winner = matchData.homeScore > matchData.awayScore ? matchData.homeTeam.name :
                  matchData.homeScore < matchData.awayScore ? matchData.awayTeam.name : 'Empate';
    
    const isDraw = matchData.homeScore === matchData.awayScore;

    return {
      ...baseEmbed,
      description: 'Resultado da partida registrado e classificação atualizada!',
      fields: [
        {
          name: 'Partida',
          value: `${matchData.homeTeam.name} ${matchData.homeScore} x ${matchData.awayScore} ${matchData.awayTeam.name}`,
          inline: false
        },
        {
          name: 'Vencedor',
          value: isDraw ? 'Empate' : winner,
          inline: true
        },
        {
          name: 'Liga',
          value: leagueData?.name || 'Não especificada',
          inline: true
        },
        {
          name: 'Status',
          value: 'Classificação atualizada automaticamente',
          inline: false
        }
      ],
      image: {
        url: this.createMatchImage(matchData)
      }
    };
  }

  /**
   * Criar embed para atualização de foto de time
   */
  createTeamPhotoEmbed(baseEmbed, data) {
    const { teamData } = data;
    
    return {
      ...baseEmbed,
      description: `A foto do time ${teamData.name} foi atualizada com sucesso!`,
      fields: [
        {
          name: 'Time',
          value: teamData.name,
          inline: true
        },
        {
          name: 'Status',
          value: 'Foto atualizada no site',
          inline: true
        }
      ],
      thumbnail: {
        url: teamData.logoUrl
      }
    };
  }

  /**
   * Criar embed para atualização de ordem das ligas
   */
  createLeagueOrderEmbed(baseEmbed, data) {
    const { leagueData } = data;
    
    return {
      ...baseEmbed,
      description: 'A ordem das ligas foi atualizada com sucesso!',
      fields: [
        {
          name: 'Total de Ligas',
          value: leagueData?.length || 0,
          inline: true
        },
        {
          name: 'Status',
          value: 'Ordem atualizada no site',
          inline: true
        }
      ]
    };
  }

  /**
   * Criar embed para atualização da classificação
   */
  async createStandingsUpdatedEmbed(baseEmbed, data) {
    const { leagueId, season } = data;
    
    try {
      // Buscar classificação atualizada
      const standings = await getLeagueStandings(leagueId, season);
      const top3 = standings.slice(0, 3);

      const fields = top3.map((team, index) => ({
        name: `${index + 1}º ${team.team.name}`,
        value: `${team.points} pts | ${team.matchesPlayed} J | SG: ${team.goalDifference}`,
        inline: false
      }));

      return {
        ...baseEmbed,
        title: 'Classificação Atualizada!',
        description: 'A tabela de classificação foi atualizada com os novos resultados!',
        fields: fields.length > 0 ? fields : [{
          name: 'Status',
          value: 'Classificação atualizada',
          inline: false
        }]
      };
    } catch (error) {
      console.error('Erro ao criar embed de classificação:', error);
      return baseEmbed;
    }
  }

  /**
   * Criar URL de imagem para a partida (opcional)
   * @param {Object} matchData - Dados da partida
   * @returns {string} - URL da imagem
   */
  createMatchImage(matchData) {
    // Aqui você pode gerar uma imagem dinâmica com o placar
    // Por enquanto, retorna null ou uma URL padrão
    return null;
  }

  /**
   * Enviar notificação de erro
   * @param {string} error - Mensagem de erro
   * @param {string} context - Contexto do erro
   */
  async sendErrorNotification(error, context = 'Geral') {
    try {
      const embed = {
        title: 'Erro na Atualização',
        color: 0xff0000, // Vermelho
        description: 'Ocorreu um erro ao atualizar o site.',
        fields: [
          {
            name: 'Contexto',
            value: context,
            inline: true
          },
          {
            name: 'Erro',
            value: error,
            inline: true
          },
          {
            name: 'Hora',
            value: new Date().toLocaleString('pt-BR'),
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'PSO Brasil - Sistema de Erros'
        }
      };

      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [embed],
          username: 'PSO Brasil Bot',
          avatar_url: 'https://media.giphy.com/media/v1.YBilCkYBvBd7U/giphy.gif'
        })
      });

      console.log('Notificação de erro enviada com sucesso');
    } catch (webhookError) {
      console.error('Erro ao enviar notificação de erro:', webhookError);
    }
  }

  /**
   * Enviar notificação de partida ao vivo
   * @param {Object} matchData - Dados da partida
   * @param {Object} liveData - Dados ao vivo
   */
  async sendLiveMatchNotification(matchData, liveData) {
    try {
      const embed = {
        title: 'Partida ao Vivo!',
        color: 0xffd700, // Dourado
        description: 'Atualização de partida em andamento',
        fields: [
          {
            name: 'Partida',
            value: `${matchData.homeTeam.name} ${liveData.homeScore} x ${liveData.awayScore} ${matchData.awayTeam.name}`,
            inline: false
          },
          {
            name: 'Tempo',
            value: liveData.minute ? `${liveData.minute}'` : 'Ao vivo',
            inline: true
          },
          {
            name: 'Status',
            value: 'Partida em andamento',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'PSO Brasil - Partidas ao Vivo'
        }
      };

      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [embed],
          username: 'PSO Brasil Bot',
          avatar_url: 'https://media.giphy.com/media/v1.YBilCkYBvBd7U/giphy.gif'
        })
      });

      console.log('Notificação de partida ao vivo enviada');
    } catch (error) {
      console.error('Erro ao enviar notificação de partida ao vivo:', error);
    }
  }

  /**
   * Testar conexão com webhook
   */
  async testWebhook() {
    try {
      const embed = {
        title: 'Teste de Conexão',
        color: 0x00d1ff, // Azul
        description: 'Teste de conexão com o webhook do Discord',
        fields: [
          {
            name: 'Status',
            value: 'Conectado com sucesso!',
            inline: true
          },
          {
            name: 'Hora',
            value: new Date().toLocaleString('pt-BR'),
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [embed],
          username: 'PSO Brasil Bot',
          avatar_url: 'https://media.giphy.com/media/v1.YBilCkYBvBd7U/giphy.gif'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      return false;
    }
  }

  /**
   * Encerrar conexão com Prisma
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = WebhookManager;
