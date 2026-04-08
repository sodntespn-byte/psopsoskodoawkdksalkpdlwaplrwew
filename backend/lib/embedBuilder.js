/**
 * PSO Brasil - Embed Builder
 * Sistema técnico e imersivo para criação de Embeds Discord
 * Estilo limpo, profissional e sem emojis
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class PSOEmbedBuilder {
  constructor() {
    // Cores padrão do sistema
    this.colors = {
      success: 0x00FF41,    // Verde Neon
      warning: 0xFFD700,    // Amarelo Elétrico
      info: 0x000080,       // Azul Marinho
      error: 0xdc2626,      // Vermelho Alerta
      primary: 0x009c3b,    // Verde Brasil
      secondary: 0x6b7280   // Cinza
    };

    // URL do logo do bot
    this.botLogo = 'https://i.imgur.com/PSOBrasilLogo.png'; // Substituir com URL real
    this.fallbackLogo = 'https://i.imgur.com/NitegyLogo.png'; // Logo alternativo
    
    // Separadores visuais
    this.dividers = {
      main: '                    ',
      section: '                    ',
      light: '                    '
    };
  }

  /**
   * Criar embed base com configurações padrão
   */
  createBase(options = {}) {
    const embed = new EmbedBuilder()
      .setColor(options.color || this.colors.primary)
      .setTimestamp();

    // Author field com logo do bot
    if (options.showAuthor !== false) {
      embed.setAuthor({
        name: 'PSO BRASIL BOT',
        iconURL: this.botLogo,
        url: 'https://pso-brasil.com' // URL do site
      });
    }

    // Footer padrão
    if (options.showFooter !== false) {
      embed.setFooter({
        text: 'SISTEMA DE GESTÃO PSO BRASIL | ENCRYPTED AES-256-GCM'
      });
    }

    return embed;
  }

  /**
   * Criar embed de transferência técnica
   */
  createTransferEmbed(transferData, clubLogos = {}) {
    const embed = this.createBase({ color: this.colors.success });
    
    embed.setTitle('RELATÓRIO DE TRANSFERÊNCIA DE ATLETA');
    
    // Thumbnail do novo clube
    if (clubLogos.newClub) {
      embed.setThumbnail(clubLogos.newClub);
    }

    // Seção principal da transferência
    embed.addFields({
      name: '                    ',
      value: this.formatTransferDetails(transferData),
      inline: false
    });

    // Seção financeira
    embed.addFields({
      name: '                    ',
      value: this.formatFinancialDetails(transferData),
      inline: false
    });

    // Seção de validação
    embed.addFields({
      name: '                    ',
      value: this.formatValidationDetails(transferData),
      inline: false
    });

    // ID da transação
    embed.addFields({
      name: '**ID DO CONTRATO:**',
      value: `\`${transferData.id?.substring(0, 8) || 'N/A'}...\``,
      inline: true
    });

    embed.addFields({
      name: '**DATA DE REGISTRO:**',
      value: new Date(transferData.timestamp || Date.now()).toLocaleString('pt-BR'),
      inline: true
    });

    return embed;
  }

  /**
   * Criar embed de resultado de partida
   */
  createMatchEmbed(matchData, clubLogos = {}) {
    const embed = this.createBase({ color: this.colors.info });
    
    embed.setTitle('RELATÓRIO DE PARTIDA - LIGA PSO BRASIL');
    
    // Thumbnail do time vencedor
    const winnerLogo = matchData.homeScore > matchData.awayScore ? 
      clubLogos.homeTeam : clubLogos.awayTeam;
    if (winnerLogo) {
      embed.setThumbnail(winnerLogo);
    }

    // Seção do placar
    embed.addFields({
      name: '                    ',
      value: this.formatMatchScore(matchData),
      inline: false
    });

    // Seção de estatísticas
    embed.addFields({
      name: '                    ',
      value: this.formatMatchStats(matchData),
      inline: false
    });

    // ID da partida
    embed.addFields({
      name: '**ID DA PARTIDA:**',
      value: `\`${matchData.id?.substring(0, 8) || 'N/A'}...\``,
      inline: true
    });

    embed.addFields({
      name: '**DATA DA PARTIDA:**',
      value: new Date(matchData.matchDate || Date.now()).toLocaleString('pt-BR'),
      inline: true
    });

    return embed;
  }

  /**
   * Criar embed de configuração
   */
  createConfigEmbed(configData) {
    const embed = this.createBase({ color: this.colors.warning });
    
    embed.setTitle('PAINEL DE CONFIGURAÇÃO - SERVIDOR PSO BRASIL');
    
    // Status da configuração
    embed.addFields({
      name: '                    ',
      value: this.formatConfigStatus(configData),
      inline: false
    });

    // Canais configurados
    embed.addFields({
      name: '                    ',
      value: this.formatConfigChannels(configData),
      inline: false
    });

    // Cargos configurados
    embed.addFields({
      name: '                    ',
      value: this.formatConfigRoles(configData),
      inline: false
    });

    return embed;
  }

  /**
   * Criar embed de status técnico
   */
  createStatusEmbed(statusData) {
    const isHealthy = statusData.databaseStatus === 'online' && 
                     statusData.siteStatus === 'online';
    
    const embed = this.createBase({ 
      color: isHealthy ? this.colors.success : this.colors.error 
    });
    
    embed.setTitle('DIAGNÓSTICO DO SISTEMA - PSO BRASIL');
    
    // Status principal
    embed.addFields({
      name: '                    ',
      value: this.formatSystemStatus(statusData),
      inline: false
    });

    // Métricas de desempenho
    embed.addFields({
      name: '                    ',
      value: this.formatPerformanceMetrics(statusData),
      inline: false
    });

    // Erros recentes
    if (statusData.errors && statusData.errors.length > 0) {
      embed.addFields({
        name: '                    ',
        value: this.formatRecentErrors(statusData.errors),
        inline: false
      });
    }

    return embed;
  }

  /**
   * Criar action row com botões técnicos
   */
  createActionRow(buttons = []) {
    const row = new ActionRowBuilder();
    
    buttons.forEach(button => {
      const buttonBuilder = new ButtonBuilder()
        .setLabel(button.label)
        .setStyle(button.style || ButtonStyle.Secondary);

      if (button.url) {
        buttonBuilder.setURL(button.url);
      } else if (button.customId) {
        buttonBuilder.setCustomId(button.customId);
      }

      if (button.emoji) {
        buttonBuilder.setEmoji(button.emoji);
      }

      row.addComponents(buttonBuilder);
    });

    return row;
  }

  /**
   * Formatar detalhes da transferência
   */
  formatTransferDetails(data) {
    return `**[ DADOS DA TRANSFERÊNCIA ]**\n` +
           `**NOME DO ATLETA:** ${data.playerName || 'N/A'}\n` +
           `**[ CLUBE ANTERIOR ]** ${data.oldClubName || 'VLOCE'}\n` +
           `**[ CLUBE ATUAL ]** ${data.newClubName || 'N/A'}\n` +
           `**[ DURAÇÃO DO CONTRATO ]** ${data.duration || 0} meses`;
  }

  /**
   * Formatar detalhes financeiros
   */
  formatFinancialDetails(data) {
    const salary = this.formatCurrency(data.salary || 0);
    const fee = this.formatCurrency(data.feePaid || 0);
    const clause = data.releaseClause ? this.formatCurrency(data.releaseClause) : 'N/A';

    return `**[ DADOS FINANCEIROS ]**\n` +
           `**SALÁRIOS:** ${salary}\n` +
           `**TAXA DE TRANSFERÊNCIA:** ${fee}\n` +
           `**CLÁUSULA DE RESCISÃO:** ${clause}`;
  }

  /**
   * Formatar detalhes de validação
   */
  formatValidationDetails(data) {
    return `**[ STATUS DA VALIDAÇÃO ]**\n` +
           `**[ CRIPTOGRAFIA ]** ATIVADA\n` +
           `**[ ASSINATURA DIGITAL ]** VÁLIDA\n` +
           `**[ REGISTRO BLOCKCHAIN ]** PENDENTE`;
  }

  /**
   * Formatar placar da partida
   */
  formatMatchScore(data) {
    const homeScore = data.homeScore || 0;
    const awayScore = data.awayScore || 0;
    const winner = homeScore > awayScore ? data.homeTeamName : 
                   awayScore > homeScore ? data.awayTeamName : 'EMPATE';

    return `**[ PLACAR OFICIAL ]**\n` +
           `**[ TIME DA CASA ]** ${data.homeTeamName || 'N/A'}: **${homeScore}**\n` +
           `**[ TIME VISITANTE ]** ${data.awayTeamName || 'N/A'}: **${awayScore}**\n` +
           `**[ RESULTADO ]** ${winner}`;
  }

  /**
   * Formatar estatísticas da partida
   */
  formatMatchStats(data) {
    return `**[ ESTATÍSTICAS DA PARTIDA ]**\n` +
           `**[ RODADA ]** ${data.round || 'N/A'}\n` +
           `**[ LIGA ]** ${data.leagueName || 'N/A'}\n` +
           `**[ ESTÁDIO ]** ${data.venue || 'N/A'}\n` +
           `**[ STATUS ]** ${data.status || 'FINALIZADO'}`;
  }

  /**
   * Formatar status da configuração
   */
  formatConfigStatus(data) {
    return `**[ STATUS DA CONFIGURAÇÃO ]**\n` +
           `**[ SERVIDOR ]** ${data.guildName || 'N/A'}\n` +
           `**[ LIGA ]** ${data.leagueStatus || 'N/A'}\n` +
           `**[ TEMPORADA ]** ${data.currentSeason || 'N/A'}\n` +
           `**[ CONFIGURADO POR ]** ${data.configuredBy || 'N/A'}`;
  }

  /**
   * Formatar canais configurados
   */
  formatConfigChannels(data) {
    const channels = [
      { name: 'Resultados', id: data.resultsChannelId },
      { name: 'Mercado', id: data.marketChannelId },
      { name: 'Logs', id: data.adminChannelId },
      { name: 'Logs Técnicos', id: data.technicalLogsChannelId }
    ];

    const formattedChannels = channels
      .filter(ch => ch.id)
      .map(ch => `**[ CANAL DE ${ch.name.toUpperCase()} ]** <#${ch.id}>`)
      .join('\n') || 'Nenhum canal configurado';

    return `**[ CANAIS CONFIGURADOS ]**\n${formattedChannels}`;
  }

  /**
   * Formatar cargos configurados
   */
  formatConfigRoles(data) {
    const roles = [
      { name: 'Administradores', ids: data.adminRoleIds },
      { name: 'Moderadores', ids: data.modRoleIds }
    ];

    const formattedRoles = roles
      .filter(r => r.ids && r.ids.length > 0)
      .map(r => `**[ CARGOS DE ${r.name.toUpperCase()} ]** ${r.ids.map(id => `<@&${id}>`).join(', ')}`)
      .join('\n') || 'Nenhum cargo configurado';

    return `**[ CARGOS CONFIGURADOS ]**\n${formattedRoles}`;
  }

  /**
   * Formatar status do sistema
   */
  formatSystemStatus(data) {
    const dbStatus = data.databaseStatus?.toUpperCase() || 'DESCONHECIDO';
    const siteStatus = data.siteStatus?.toUpperCase() || 'DESCONHECIDO';
    const botStatus = data.isMonitoring ? 'ATIVO' : 'INATIVO';

    return `**[ STATUS DOS SERVIÇOS ]**\n` +
           `**[ BANCO DE DADOS ]** ${dbStatus}\n` +
           `**[ SITE ]** ${siteStatus}\n` +
           `**[ MONITORAMENTO ]** ${botStatus}`;
  }

  /**
   * Formatar métricas de desempenho
   */
  formatPerformanceMetrics(data) {
    const latency = data.responseTime || 0;
    const uptime = this.formatUptime(data.uptime || 0);
    const memory = this.formatMemory(data.memoryUsage);

    return `**[ MÉTRICAS DE DESEMPENHO ]**\n` +
           `**[ LATÊNCIA ]** ${latency}ms\n` +
           `**[ UPTIME ]** ${uptime}\n` +
           `**[ MEMÓRIA ]** ${memory}`;
  }

  /**
   * Formatar erros recentes
   */
  formatRecentErrors(errors) {
    const recentErrors = errors.slice(0, 3);
    
    if (recentErrors.length === 0) {
      return `**[ ERROS RECENTES ]**\nNenhum erro registrado`;
    }

    const formatted = recentErrors.map((error, index) => {
      const time = new Date(error.timestamp).toLocaleTimeString('pt-BR');
      return `**[ ERRO ${index + 1} ]** ${error.type}\n` +
             `**[ HORÁRIO ]** ${time}\n` +
             `**[ MENSAGEM ]** ${error.message?.substring(0, 100) || 'N/A'}...`;
    }).join('\n\n');

    return `**[ ERROS RECENTES ]**\n${formatted}`;
  }

  /**
   * Formatar moeda brasileira
   */
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Formatar uptime
   */
  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Formatar uso de memória
   */
  formatMemory(memoryUsage) {
    if (!memoryUsage) return 'N/A';
    
    const used = memoryUsage.heapUsed || 0;
    const total = 512; // SquareCloud geralmente 512MB
    const percentage = ((used / total) * 100).toFixed(1);

    return `${used}MB / ${total}MB (${percentage}%)`;
  }

  /**
   * Criar botões padrão para transferências
   */
  createTransferButtons(transferId) {
    return this.createActionRow([
      {
        label: 'Ver no Site',
        style: ButtonStyle.Link,
        url: `https://pso-brasil.com/transferencias#${transferId}`
      },
      {
        label: 'Detalhes do Contrato',
        style: ButtonStyle.Secondary,
        customId: `transfer_details_${transferId}`
      },
      {
        label: 'Abrir Tabela',
        style: ButtonStyle.Success,
        customId: 'open_standings'
      }
    ]);
  }

  /**
   * Criar botões padrão para partidas
   */
  createMatchButtons(matchId) {
    return this.createActionRow([
      {
        label: 'Ver no Site',
        style: ButtonStyle.Link,
        url: `https://pso-brasil.com/partidas#${matchId}`
      },
      {
        label: 'Estatísticas',
        style: ButtonStyle.Secondary,
        customId: `match_stats_${matchId}`
      },
      {
        label: 'Classificação',
        style: ButtonStyle.Success,
        customId: 'open_standings'
      }
    ]);
  }
}

module.exports = PSOEmbedBuilder;
