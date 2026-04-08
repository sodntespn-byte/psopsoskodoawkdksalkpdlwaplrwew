const { Client, GatewayIntentBits, EmbedBuilder, ModalBuilder, TextInputComponent, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { PrismaClient } = require('../lib/prisma');
const { updateStandings, getLeagueStandings } = require('../lib/standings');

class DiscordBot {
  constructor(token, webhookUrl) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
    
    this.token = token;
    this.webhookUrl = webhookUrl;
    this.prisma = new PrismaClient();
    this.activeModals = new Map(); // Para controlar modais abertos
  }

  async start() {
    await this.client.login(this.token);
    this.setupEventListeners();
    console.log('Bot Discord iniciado com sucesso!');
  }

  setupEventListeners() {
    // Comando /postar-resultado
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const { commandName } = interaction;

      switch (commandName) {
        case 'postar-resultado':
          await this.handlePostarResultado(interaction);
          break;
        case 'set-foto':
          await this.handleSetFoto(interaction);
          break;
        case 'set-ordem':
          await this.handleSetOrdem(interaction);
          break;
        case 'ultimos-resultados':
          await this.handleUltimosResultados(interaction);
          break;
        case 'classificacao':
          await this.handleClassificacao(interaction);
          break;
      }
    });

    // Resposta de modais
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isModalSubmit()) return;

      const modalId = interaction.customId;
      
      if (modalId.startsWith('resultado_')) {
        await this.handleResultadoSubmit(interaction);
      } else if (modalId.startsWith('foto_')) {
        await this.handleFotoSubmit(interaction);
      } else if (modalId.startsWith('ordem_')) {
        await this.handleOrdemSubmit(interaction);
      }
    });
  }

  // Comando /postar-resultado
  async handlePostarResultado(interaction) {
    const modal = new ModalBuilder()
      .setCustomId(`resultado_${Date.now()}`)
      .setTitle('Registrar Resultado da Partida')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('homeTeam')
            .setLabel('Time da Casa')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: Flamengo')
            .setRequired(true),
          new TextInputComponent()
            .setCustomId('homeScore')
            .setLabel('Gols Casa')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: 2')
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('awayScore')
            .setLabel('Gols Fora')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: 1')
            .setRequired(true),
          new TextInputComponent()
            .setCustomId('awayTeam')
            .setLabel('Time Fora')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: Palmeiras')
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('leagueId')
            .setLabel('ID da Liga')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: 1')
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
    this.activeModals.set(interaction.user.id, modalId);
  }

  // Processar submissão do formulário de resultado
  async handleResultadoSubmit(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const homeTeam = interaction.fields.getTextInputValue('homeTeam');
      const homeScore = parseInt(interaction.fields.getTextInputValue('homeScore'));
      const awayScore = parseInt(interaction.fields.getTextInputValue('awayScore'));
      const awayTeam = interaction.fields.getTextInputValue('awayTeam');
      const leagueId = interaction.fields.getTextInputValue('leagueId');

      // Validar dados
      if (!homeTeam || !awayTeam || isNaN(homeScore) || isNaN(awayScore)) {
        await interaction.followUp({
          content: 'Por favor, preencha todos os campos corretamente!',
          ephemeral: true
        });
        return;
      }

      // Buscar times no banco
      const [homeTeamData, awayTeamData] = await Promise.all([
        this.prisma.team.findFirst({ where: { name: { contains: homeTeam, mode: 'insensitive' } } }),
        this.prisma.team.findFirst({ where: { name: { contains: awayTeam, mode: 'insensitive' } } })
      ]);

      if (!homeTeamData || !awayTeamData) {
        await interaction.followUp({
          content: 'Um ou ambos os times não foram encontrados no banco de dados!',
          ephemeral: true
        });
        return;
      }

      // Criar partida
      const match = await this.prisma.match.create({
        data: {
          homeTeamId: homeTeamData.id,
          awayTeamId: awayTeamData.id,
          leagueId: leagueId,
          matchDate: new Date(),
          venue: 'Estádio',
          status: 'FINISHED',
          homeScore,
          awayScore,
          round: 'Rodada Única'
        }
      });

      // Atualizar classificação
      const standingsResult = await updateStandings({
        matchId: match.id,
        homeScore,
        awayScore,
        leagueId
      });

      // Enviar feedback de sucesso
      const successEmbed = new EmbedBuilder()
        .setTitle('Resultado Registrado com Sucesso!')
        .setColor('#00ff00')
        .setDescription('O site foi atualizado automaticamente.')
        .setThumbnail('https://media.giphy.com/media/v1.YBilCkYBvBd7U/giphy.gif')
        .addFields(
          { name: 'Time Casa', value: `${homeTeamData.name}`, inline: true },
          { name: 'Time Fora', value: `${awayTeamData.name}`, inline: true },
          { name: 'Placar', value: `${homeScore} x ${awayScore}`, inline: true },
          { name: 'Status', value: 'Atualizado no site', inline: true }
        )
        .setTimestamp();

      await interaction.followUp({
        embeds: [successEmbed],
        ephemeral: false
      });

      // Enviar webhook para atualização em tempo real
      await this.sendWebhookNotification({
        type: 'match_result',
        data: {
          homeTeam: homeTeamData,
          awayTeam: awayTeamData,
          homeScore,
          awayScore,
          matchId: match.id
        }
      });

    } catch (error) {
      console.error('Erro ao processar resultado:', error);
      await interaction.followUp({
        content: 'Ocorreu um erro ao processar o resultado. Tente novamente!',
        ephemeral: true
      });
    }
  }

  // Comando /set-foto
  async handleSetFoto(interaction) {
    const modal = new ModalBuilder()
      .setCustomId(`foto_${Date.now()}`)
      .setTitle('Atualizar Foto do Time')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('teamName')
            .setLabel('Nome do Time')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: Flamengo')
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('photoUrl')
            .setLabel('URL da Foto')
            .setStyle(TextInputComponentStyle.Paragraph)
            .setPlaceholder('https://exemplo.com/foto.png')
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
  }

  // Processar atualização de foto
  async handleFotoSubmit(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const teamName = interaction.fields.getTextInputValue('teamName');
      const photoUrl = interaction.fields.getTextInputValue('photoUrl');

      // Buscar time
      const team = await this.prisma.team.findFirst({
        where: { name: { contains: teamName, mode: 'insensitive' } }
      });

      if (!team) {
        await interaction.followUp({
          content: 'Time não encontrado no banco de dados!',
          ephemeral: true
        });
        return;
      }

      // Atualizar foto
      await this.prisma.team.update({
        where: { id: team.id },
        data: { logoUrl: photoUrl }
      });

      const successEmbed = new EmbedBuilder()
        .setTitle('Foto Atualizada!')
        .setColor('#00d1ff')
        .setDescription(`A foto do time ${team.name} foi atualizada com sucesso.`)
        .setThumbnail(photoUrl)
        .addFields(
          { name: 'Time', value: team.name },
          { name: 'Nova URL', value: photoUrl }
        )
        .setTimestamp();

      await interaction.followUp({
        embeds: [successEmbed],
        ephemeral: false
      });

      // Enviar webhook
      await this.sendWebhookNotification({
        type: 'team_photo_updated',
        data: { team, photoUrl }
      });

    } catch (error) {
      console.error('Erro ao atualizar foto:', error);
      await interaction.followUp({
        content: 'Ocorreu um erro ao atualizar a foto. Tente novamente!',
        ephemeral: true
      });
    }
  }

  // Comando /set-ordem
  async handleSetOrdem(interaction) {
    const modal = new ModalBuilder()
      .setCustomId(`ordem_${Date.now()}`)
      .setTitle('Definir Ordem das Ligas')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('leagueOrder')
            .setLabel('Ordem das Ligas (IDs separados por vírgula)')
            .setStyle(TextInputComponentStyle.Paragraph)
            .setPlaceholder('1,2,3,4')
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
  }

  // Processar definição de ordem
  async handleOrdemSubmit(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const leagueOrder = interaction.fields.getTextInputValue('leagueOrder');
      const leagueIds = leagueOrder.split(',').map(id => id.trim());

      // Atualizar ordem das ligas
      for (let i = 0; i < leagueIds.length; i++) {
        await this.prisma.league.update({
          where: { id: leagueIds[i] },
          data: { order: i + 1 }
        });
      }

      const successEmbed = new EmbedBuilder()
        .setTitle('Ordem das Ligas Atualizada!')
        .setColor('#ffd700')
        .setDescription(`A ordem das ligas foi definida com sucesso.`)
        .addFields(
          { name: 'Total de Ligas', value: leagueIds.length },
          { name: 'Nova Ordem', value: leagueOrder }
        )
        .setTimestamp();

      await interaction.followUp({
        embeds: [successEmbed],
        ephemeral: false
      });

      // Enviar webhook
      await this.sendWebhookNotification({
        type: 'league_order_updated',
        data: { leagueOrder: leagueIds }
      });

    } catch (error) {
      console.error('Erro ao definir ordem:', error);
      await interaction.followUp({
        content: 'Ocorreu um erro ao definir a ordem. Tente novamente!',
        ephemeral: true
      });
    }
  }

  // Comando /ultimos-resultados
  async handleUltimosResultados(interaction) {
    try {
      await interaction.deferReply();

      // Buscar últimas partidas
      const recentMatches = await this.prisma.match.findMany({
        where: { status: 'FINISHED' },
        include: {
          homeTeam: { select: { id: true, name: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, logoUrl: true } },
          league: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const embed = new EmbedBuilder()
        .setTitle('Últimos Resultados')
        .setColor('#00d1ff')
        .setDescription('Os 10 resultados mais recentes')
        .setTimestamp();

      recentMatches.forEach((match, index) => {
        const winner = match.homeScore > match.awayScore ? match.homeTeam.name :
                      match.homeScore < match.awayScore ? match.awayTeam.name : 'Empate';
        
        embed.addFields({
          name: `${index + 1}. ${match.homeTeam.name} ${match.homeScore} x ${match.awayScore} ${match.awayTeam.name}`,
          value: `Vencedor: ${winner} | ${match.league.name}`,
          inline: false
        });
      });

      await interaction.followUp({ embeds: [embed] });

    } catch (error) {
      console.error('Erro ao buscar resultados:', error);
      await interaction.followUp({
        content: 'Ocorreu um erro ao buscar os resultados.',
        ephemeral: true
      });
    }
  }

  // Comando /classificacao
  async handleClassificacao(interaction) {
    try {
      await interaction.deferReply();

      // Buscar classificação da primeira liga
      const league = await this.prisma.league.findFirst({
        orderBy: { order: 'asc' }
      });

      if (!league) {
        await interaction.followUp({
          content: 'Nenhuma liga encontrada!',
          ephemeral: true
        });
        return;
      }

      const standings = await getLeagueStandings(league.id, league.season);

      const embed = new EmbedBuilder()
        .setTitle(`Classificação - ${league.name}`)
        .setColor('#ffd700')
        .setDescription(`Temporada ${league.season}`)
        .setTimestamp();

      standings.slice(0, 10).forEach((team, index) => {
        const medal = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
        
        embed.addFields({
          name: `${medal}. ${team.team.name}`,
          value: `${team.points} pts | ${team.matchesPlayed} J | SG: ${team.goalDifference}`,
          inline: false
        });
      });

      await interaction.followUp({ embeds: [embed] });

    } catch (error) {
      console.error('Erro ao buscar classificação:', error);
      await interaction.followUp({
        content: 'Ocorreu um erro ao buscar a classificação.',
        ephemeral: true
      });
    }
  }

  // Enviar notificação via webhook
  async sendWebhookNotification(data) {
    try {
      const embed = new EmbedBuilder()
        .setTitle('Site Atualizado com Sucesso!')
        .setColor('#00ff00')
        .setThumbnail('https://media.giphy.com/media/v1.YBilCkYBvBd7U/giphy.gif')
        .setDescription('As informações foram atualizadas no site em tempo real.')
        .setTimestamp();

      if (data.type === 'match_result') {
        embed.addFields(
          { name: 'Partida', value: `${data.homeTeam.name} ${data.homeScore} x ${data.awayScore} ${data.awayTeam.name}` },
          { name: 'Status', value: 'Classificação atualizada' }
        );
        
        // Adicionar fotos dos times
        if (data.homeTeam.logoUrl) {
          embed.setThumbnail(data.homeTeam.logoUrl);
        }
      } else if (data.type === 'team_photo_updated') {
        embed.addFields(
          { name: 'Time', value: data.team.name },
          { name: 'Nova Foto', value: 'Atualizada' }
        );
        embed.setThumbnail(data.photoUrl);
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [embed.toJSON()]
        })
      });

      if (!response.ok) {
        console.error('Erro ao enviar webhook:', response.statusText);
      }

    } catch (error) {
      console.error('Erro ao enviar notificação webhook:', error);
    }
  }

  // Registrar comandos
  async registerCommands() {
    const commands = [
      {
        name: 'postar-resultado',
        description: 'Registrar resultado de uma partida',
        options: []
      },
      {
        name: 'set-foto',
        description: 'Atualizar a foto de um time',
        options: []
      },
      {
        name: 'set-ordem',
        description: 'Definir a ordem das ligas',
        options: []
      },
      {
        name: 'ultimos-resultados',
        description: 'Ver os últimos resultados',
        options: []
      },
      {
        name: 'classificacao',
        description: 'Ver a classificação atual',
        options: []
      }
    ];

    try {
      await this.client.application.commands.set(commands);
      console.log('Comandos registrados com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar comandos:', error);
    }
  }

  // Encerrar conexão
  async shutdown() {
    await this.prisma.$disconnect();
    this.client.destroy();
  }
}

module.exports = DiscordBot;
