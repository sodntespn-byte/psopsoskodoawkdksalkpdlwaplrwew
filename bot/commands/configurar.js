const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const PSOEmbedBuilder = require('../../lib/embedBuilder');

/**
 * Comando /configurar - Configuração dinâmica do servidor
 * Interface técnica limpa com Select Menus para configurar canais e cargos
 */

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configurar')
    .setDescription('Configurar o PSO Brasil Bot para este servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  public: false, // Requer permissão de admin
  cooldown: 5,
  
  async execute(interaction, bot) {
    const embedBuilder = new PSOEmbedBuilder();
    
    // Buscar configuração atual
    const config = await bot.getGuildConfig(interaction.guild.id);
    
    // Criar embed técnico de configuração
    const embed = embedBuilder.createConfigEmbed({
      guildName: interaction.guild.name,
      leagueStatus: config?.leagueStatus || 'Não configurado',
      currentSeason: config?.currentSeason || '2024',
      configuredBy: config?.configuredBy || 'N/A',
      resultsChannelId: config?.resultsChannelId,
      marketChannelId: config?.marketChannelId,
      adminChannelId: config?.adminChannelId,
      technicalLogsChannelId: config?.technicalLogsChannelId,
      adminRoleIds: config?.adminRoleIds || [],
      modRoleIds: config?.modRoleIds || []
    });
    
    // Criar select menu para escolher o que configurar
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('config_main_menu')
      .setPlaceholder('Selecione o que deseja configurar')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Canal de Resultados')
          .setDescription('Definir canal para anúncios de resultados')
          .setValue('config_results_channel'),
        
        new StringSelectMenuOptionBuilder()
          .setLabel('Canal de Mercado')
          .setDescription('Definir canal para anúncios de transferências')
          .setValue('config_market_channel'),
        
        new StringSelectMenuOptionBuilder()
          .setLabel('Canal de Logs')
          .setDescription('Definir canal para logs administrativos')
          .setValue('config_logs_channel'),
        
        new StringSelectMenuOptionBuilder()
          .setLabel('Canal de Logs Técnicos')
          .setDescription('Definir canal para logs técnicos e diagnósticos')
          .setValue('config_technical_logs_channel'),
        
        new StringSelectMenuOptionBuilder()
          .setLabel('Cargos de Admin')
          .setDescription('Definir cargos administrativos')
          .setValue('config_admin_roles'),
        
        new StringSelectMenuOptionBuilder()
          .setLabel('Cargos de Moderador')
          .setDescription('Definir cargos de moderador')
          .setValue('config_mod_roles'),
        
        new StringSelectMenuOptionBuilder()
          .setLabel('Status da Liga')
          .setDescription('Alterar status da liga')
          .setValue('config_league_status'),
        
        new StringSelectMenuOptionBuilder()
          .setLabel('Ver Configurações Atuais')
          .setDescription('Ver todas as configurações atuais')
          .setValue('config_view_current')
      );
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }
};
