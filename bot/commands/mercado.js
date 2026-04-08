const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

/**
 * Comando /mercado anunciar - Anunciar transferência no mercado
 * Abre um modal para preencher dados do contrato
 * Interface limpa sem emojis
 */

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mercado')
    .setDescription('Gerenciar o mercado de transferências')
    .addSubcommand(subcommand =>
      subcommand
        .setName('anunciar')
        .setDescription('Anunciar uma nova transferência no mercado')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ultimos')
        .setDescription('Ver as últimas transferências anunciadas')
    ),
  
  public: false, // Requer permissão de admin
  cooldown: 10,
  
  async execute(interaction, bot) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'anunciar') {
      await this.handleAnunciar(interaction, bot);
    } else if (subcommand === 'ultimos') {
      await this.handleUltimos(interaction, bot);
    }
  },
  
  async handleAnunciar(interaction, bot) {
    // Criar modal para preencher dados do contrato
    const modal = new ModalBuilder()
      .setCustomId('market_transfer_modal')
      .setTitle('Anunciar Transferência - PSO Brasil');
    
    // Campo: Nome do Jogador
    const playerNameInput = new TextInputBuilder()
      .setCustomId('player_name')
      .setLabel('Nome do Jogador')
      .setPlaceholder('Ex: Neymar Jr.')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);
    
    // Campo: Clube Antigo
    const oldClubInput = new TextInputBuilder()
      .setCustomId('old_club')
      .setLabel('Clube Antigo (ou VLOCE para Agente Livre)')
      .setPlaceholder('Ex: Santos ou VLOCE')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(100);
    
    // Campo: Novo Clube
    const newClubInput = new TextInputBuilder()
      .setCustomId('new_club')
      .setLabel('Novo Clube')
      .setPlaceholder('Ex: Barcelona')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);
    
    // Campo: Duração do Contrato
    const durationInput = new TextInputBuilder()
      .setCustomId('duration')
      .setLabel('Duração (meses)')
      .setPlaceholder('Ex: 24')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(3);
    
    // Campo: Salário
    const salaryInput = new TextInputBuilder()
      .setCustomId('salary')
      .setLabel('Salário (em milhões)')
      .setPlaceholder('Ex: 5.5')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(10);
    
    // Criar rows
    const row1 = new ActionRowBuilder().addComponents(playerNameInput);
    const row2 = new ActionRowBuilder().addComponents(oldClubInput);
    const row3 = new ActionRowBuilder().addComponents(newClubInput);
    const row4 = new ActionRowBuilder().addComponents(durationInput);
    const row5 = new ActionRowBuilder().addComponents(salaryInput);
    
    // Adicionar rows ao modal
    modal.addComponents(row1, row2, row3, row4, row5);
    
    // Mostrar modal
    await interaction.showModal(modal);
  },
  
  async handleUltimos(interaction, bot) {
    await interaction.deferReply();
    
    try {
      // Buscar últimas transferências
      const transfers = await bot.prisma.transfer.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          oldClub: { select: { name: true, logoUrl: true } },
          newClub: { select: { name: true, logoUrl: true } }
        }
      });
      
      if (transfers.length === 0) {
        await interaction.editReply('Nenhuma transferência registrada ainda.');
        return;
      }
      
      // Criar embed
      const embed = new EmbedBuilder()
        .setTitle('Ultimas Transferencias - Mercado PSO Brasil')
        .setColor(0xffd700) // Dourado
        .setDescription('Transferências mais recentes no mercado')
        .setTimestamp();
      
      transfers.forEach(transfer => {
        const oldClub = transfer.oldClub ? transfer.oldClub.name : 'VLOCE';
        const newClub = transfer.newClub ? transfer.newClub.name : 'Desconhecido';
        
        embed.addFields({
          name: transfer.playerName,
          value: `${oldClub} -> ${newClub}\nContrato: ${transfer.duration} meses\nSalario: R$ ${transfer.salary}M`,
          inline: true
        });
      });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('[MERCADO] Erro ao buscar transferencias:', error);
      await interaction.editReply('Erro ao buscar transferencias.');
    }
  }
};
