const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

/**
 * Comando /partida registrar - Registrar resultado de partida
 * Abre um modal para preencher o placar
 * Interface limpa sem emojis
 */

module.exports = {
  data: new SlashCommandBuilder()
    .setName('partida')
    .setDescription('Gerenciar partidas da liga')
    .addSubcommand(subcommand =>
      subcommand
        .setName('registrar')
        .setDescription('Registrar resultado de uma partida')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ultimas')
        .setDescription('Ver as últimas partidas registradas')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('agenda')
        .setDescription('Ver agenda de partidas')
    ),
  
  public: false, // Requer permissão de admin
  cooldown: 10,
  
  async execute(interaction, bot) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'registrar') {
      await this.handleRegistrar(interaction, bot);
    } else if (subcommand === 'ultimas') {
      await this.handleUltimas(interaction, bot);
    } else if (subcommand === 'agenda') {
      await this.handleAgenda(interaction, bot);
    }
  },
  
  async handleRegistrar(interaction, bot) {
    // Criar modal para preencher dados da partida
    const modal = new ModalBuilder()
      .setCustomId('match_register_modal')
      .setTitle('Registrar Partida - PSO Brasil');
    
    // Campo: Time da Casa
    const homeTeamInput = new TextInputBuilder()
      .setCustomId('home_team')
      .setLabel('Time da Casa')
      .setPlaceholder('Ex: Flamengo')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);
    
    // Campo: Time Visitante
    const awayTeamInput = new TextInputBuilder()
      .setCustomId('away_team')
      .setLabel('Time Visitante')
      .setPlaceholder('Ex: Palmeiras')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);
    
    // Campo: Gols Time da Casa
    const homeScoreInput = new TextInputBuilder()
      .setCustomId('home_score')
      .setLabel('Gols - Time da Casa')
      .setPlaceholder('Ex: 2')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(2);
    
    // Campo: Gols Time Visitante
    const awayScoreInput = new TextInputBuilder()
      .setCustomId('away_score')
      .setLabel('Gols - Time Visitante')
      .setPlaceholder('Ex: 1')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(2);
    
    // Campo: Liga/Rodada (Opcional)
    const roundInput = new TextInputBuilder()
      .setCustomId('round')
      .setLabel('Liga/Rodada (Opcional)')
      .setPlaceholder('Ex: Brasileirao 2024 - Rodada 10')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(100);
    
    // Criar rows
    const row1 = new ActionRowBuilder().addComponents(homeTeamInput);
    const row2 = new ActionRowBuilder().addComponents(awayTeamInput);
    const row3 = new ActionRowBuilder().addComponents(homeScoreInput);
    const row4 = new ActionRowBuilder().addComponents(awayScoreInput);
    const row5 = new ActionRowBuilder().addComponents(roundInput);
    
    // Adicionar rows ao modal
    modal.addComponents(row1, row2, row3, row4, row5);
    
    // Mostrar modal
    await interaction.showModal(modal);
  },
  
  async handleUltimas(interaction, bot) {
    await interaction.deferReply();
    
    try {
      // Buscar últimas partidas
      const matches = await bot.prisma.match.findMany({
        take: 5,
        orderBy: { matchDate: 'desc' },
        include: {
          homeTeam: { select: { name: true, logoUrl: true } },
          awayTeam: { select: { name: true, logoUrl: true } }
        }
      });
      
      if (matches.length === 0) {
        await interaction.editReply('Nenhuma partida registrada ainda.');
        return;
      }
      
      // Criar embed
      const embed = new EmbedBuilder()
        .setTitle('Ultimas Partidas - PSO Brasil')
        .setColor(0x009c3b) // Verde Brasil
        .setDescription('Resultados das partidas mais recentes')
        .setTimestamp();
      
      matches.forEach(match => {
        const homeTeam = match.homeTeam ? match.homeTeam.name : 'Desconhecido';
        const awayTeam = match.awayTeam ? match.awayTeam.name : 'Desconhecido';
        const homeScore = match.homeScore || 0;
        const awayScore = match.awayScore || 0;
        
        embed.addFields({
          name: `${homeTeam} vs ${awayTeam}`,
          value: `Placar: ${homeScore} x ${awayScore}`,
          inline: true
        });
      });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('[PARTIDA] Erro ao buscar partidas:', error);
      await interaction.editReply('Erro ao buscar partidas.');
    }
  },
  
  async handleAgenda(interaction, bot) {
    await interaction.deferReply();
    
    try {
      // Buscar partidas futuras
      const matches = await bot.prisma.match.findMany({
        where: {
          matchDate: {
            gte: new Date()
          },
          status: 'SCHEDULED'
        },
        take: 5,
        orderBy: { matchDate: 'asc' },
        include: {
          homeTeam: { select: { name: true, logoUrl: true } },
          awayTeam: { select: { name: true, logoUrl: true } }
        }
      });
      
      if (matches.length === 0) {
        await interaction.editReply('Nenhuma partida agendada.');
        return;
      }
      
      // Criar embed
      const embed = new EmbedBuilder()
        .setTitle('Agenda de Partidas - PSO Brasil')
        .setColor(0x009c3b)
        .setDescription('Proximas partidas agendadas')
        .setTimestamp();
      
      matches.forEach(match => {
        const homeTeam = match.homeTeam ? match.homeTeam.name : 'Desconhecido';
        const awayTeam = match.awayTeam ? match.awayTeam.name : 'Desconhecido';
        const date = new Date(match.matchDate).toLocaleDateString('pt-BR');
        
        embed.addFields({
          name: `${homeTeam} vs ${awayTeam}`,
          value: `Data: ${date}`,
          inline: true
        });
      });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('[PARTIDA] Erro ao buscar agenda:', error);
      await interaction.editReply('Erro ao buscar agenda de partidas.');
    }
  }
};
