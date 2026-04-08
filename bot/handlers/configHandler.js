const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType } = require('discord.js');

/**
 * Handler para configuração do servidor
 * Gerencia os select menus de configuração
 */

class ConfigHandler {
  async handle(interaction, bot) {
    if (!interaction.isStringSelectMenu()) return;

    const customId = interaction.customId;

    switch (customId) {
      case 'config_main_menu':
        await this.handleMainMenu(interaction, bot);
        break;
      case 'config_results_channel_select':
        await this.handleResultsChannelSelect(interaction, bot);
        break;
      case 'config_market_channel_select':
        await this.handleMarketChannelSelect(interaction, bot);
        break;
      case 'config_logs_channel_select':
        await this.handleLogsChannelSelect(interaction, bot);
        break;
      case 'config_admin_roles_select':
        await this.handleAdminRolesSelect(interaction, bot);
        break;
      case 'config_mod_roles_select':
        await this.handleModRolesSelect(interaction, bot);
        break;
      case 'config_league_status_select':
        await this.handleLeagueStatusSelect(interaction, bot);
        break;
    }
  }

  async handleMainMenu(interaction, bot) {
    const selectedValue = interaction.values[0];

    switch (selectedValue) {
      case 'config_results_channel':
        await this.showResultsChannelSelector(interaction);
        break;
      case 'config_market_channel':
        await this.showMarketChannelSelector(interaction);
        break;
      case 'config_logs_channel':
        await this.showLogsChannelSelector(interaction);
        break;
      case 'config_admin_roles':
        await this.showAdminRolesSelector(interaction);
        break;
      case 'config_mod_roles':
        await this.showModRolesSelector(interaction);
        break;
      case 'config_league_status':
        await this.showLeagueStatusSelector(interaction);
        break;
      case 'config_view_current':
        await this.showCurrentConfig(interaction, bot);
        break;
    }
  }

  async showResultsChannelSelector(interaction) {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('config_results_channel_select')
      .setPlaceholder('Selecione o canal para resultados')
      .setChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    await interaction.update({
      content: 'Selecione o canal onde os resultados das partidas serao anunciados:',
      components: [row],
      embeds: []
    });
  }

  async showMarketChannelSelector(interaction) {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('config_market_channel_select')
      .setPlaceholder('Selecione o canal para mercado')
      .setChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    await interaction.update({
      content: 'Selecione o canal onde as transferencias serao anunciadas:',
      components: [row],
      embeds: []
    });
  }

  async showLogsChannelSelector(interaction) {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('config_logs_channel_select')
      .setPlaceholder('Selecione o canal para logs')
      .setChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    await interaction.update({
      content: 'Selecione o canal onde os logs administrativos serao enviados:',
      components: [row],
      embeds: []
    });
  }

  async showAdminRolesSelector(interaction) {
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId('config_admin_roles_select')
      .setPlaceholder('Selecione os cargos de admin')
      .setMinValues(1)
      .setMaxValues(5);

    const row = new ActionRowBuilder().addComponents(roleSelect);

    await interaction.update({
      content: 'Selecione os cargos que terao permissao de administrador:',
      components: [row],
      embeds: []
    });
  }

  async showModRolesSelector(interaction) {
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId('config_mod_roles_select')
      .setPlaceholder('Selecione os cargos de moderador')
      .setMinValues(1)
      .setMaxValues(5);

    const row = new ActionRowBuilder().addComponents(roleSelect);

    await interaction.update({
      content: 'Selecione os cargos que terao permissao de moderador:',
      components: [row],
      embeds: []
    });
  }

  async showLeagueStatusSelector(interaction) {
    const statusSelect = new StringSelectMenuBuilder()
      .setCustomId('config_league_status_select')
      .setPlaceholder('Selecione o status da liga')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Aberta')
          .setDescription('Liga aberta para jogos')
          .setValue('OPEN'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Fechada')
          .setDescription('Liga fechada')
          .setValue('CLOSED'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Inscricoes Abertas')
          .setDescription('Periodo de inscricoes')
          .setValue('REGISTRATION'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Janela de Transferencias')
          .setDescription('Mercado aberto')
          .setValue('TRANSFER_WINDOW'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Playoffs')
          .setDescription('Fase de playoffs')
          .setValue('PLAYOFFS'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Entre Temporadas')
          .setDescription('Periodo de descanso')
          .setValue('OFFSEASON')
      );

    const row = new ActionRowBuilder().addComponents(statusSelect);

    await interaction.update({
      content: 'Selecione o status atual da liga:',
      components: [row],
      embeds: []
    });
  }

  async handleResultsChannelSelect(interaction, bot) {
    const channelId = interaction.values[0];
    const guildId = interaction.guild.id;

    await bot.updateGuildConfig(guildId, { resultsChannelId: channelId });

    await this.showSuccessMessage(interaction, 'Canal de resultados configurado com sucesso!');
  }

  async handleMarketChannelSelect(interaction, bot) {
    const channelId = interaction.values[0];
    const guildId = interaction.guild.id;

    await bot.updateGuildConfig(guildId, { marketChannelId: channelId });

    await this.showSuccessMessage(interaction, 'Canal de mercado configurado com sucesso!');
  }

  async handleLogsChannelSelect(interaction, bot) {
    const channelId = interaction.values[0];
    const guildId = interaction.guild.id;

    await bot.updateGuildConfig(guildId, { adminChannelId: channelId });

    await this.showSuccessMessage(interaction, 'Canal de logs configurado com sucesso!');
  }

  async handleAdminRolesSelect(interaction, bot) {
    const roleIds = interaction.values;
    const guildId = interaction.guild.id;

    await bot.updateGuildConfig(guildId, { adminRoleIds: roleIds });

    await this.showSuccessMessage(interaction, `${roleIds.length} cargo(s) de admin configurado(s)!`);
  }

  async handleModRolesSelect(interaction, bot) {
    const roleIds = interaction.values;
    const guildId = interaction.guild.id;

    await bot.updateGuildConfig(guildId, { modRoleIds: roleIds });

    await this.showSuccessMessage(interaction, `${roleIds.length} cargo(s) de moderador configurado(s)!`);
  }

  async handleLeagueStatusSelect(interaction, bot) {
    const status = interaction.values[0];
    const guildId = interaction.guild.id;

    await bot.updateGuildConfig(guildId, { leagueStatus: status });

    const statusLabels = {
      'OPEN': 'Aberta',
      'CLOSED': 'Fechada',
      'REGISTRATION': 'Inscricoes Abertas',
      'TRANSFER_WINDOW': 'Janela de Transferencias',
      'PLAYOFFS': 'Playoffs',
      'OFFSEASON': 'Entre Temporadas'
    };

    await this.showSuccessMessage(interaction, `Status da liga alterado para: ${statusLabels[status]}`);
  }

  async showCurrentConfig(interaction, bot) {
    const guildId = interaction.guild.id;
    const config = await bot.getGuildConfig(guildId);

    if (!config) {
      await interaction.update({
        content: 'Configuracao nao encontrada. Execute o comando novamente para criar.',
        components: [],
        embeds: []
      });
      return;
    }

    const statusLabels = {
      'OPEN': 'Aberta',
      'CLOSED': 'Fechada',
      'REGISTRATION': 'Inscricoes Abertas',
      'TRANSFER_WINDOW': 'Janela de Transferencias',
      'PLAYOFFS': 'Playoffs',
      'OFFSEASON': 'Entre Temporadas'
    };

    const embed = new EmbedBuilder()
      .setTitle('Configuracoes Atuais - PSO Brasil')
      .setColor(0x009c3b)
      .addFields(
        { name: 'Canal de Resultados', value: config.resultsChannelId ? `<#${config.resultsChannelId}>` : 'Nao configurado', inline: true },
        { name: 'Canal de Mercado', value: config.marketChannelId ? `<#${config.marketChannelId}>` : 'Nao configurado', inline: true },
        { name: 'Canal de Logs', value: config.adminChannelId ? `<#${config.adminChannelId}>` : 'Nao configurado', inline: true },
        { name: 'Cargos de Admin', value: config.adminRoleIds.length > 0 ? `${config.adminRoleIds.length} cargo(s)` : 'Nao configurado', inline: true },
        { name: 'Cargos de Mod', value: config.modRoleIds.length > 0 ? `${config.modRoleIds.length} cargo(s)` : 'Nao configurado', inline: true },
        { name: 'Status da Liga', value: statusLabels[config.leagueStatus] || config.leagueStatus, inline: true },
        { name: 'Temporada Atual', value: config.currentSeason, inline: true }
      )
      .setTimestamp();

    await interaction.update({
      content: 'Estas sao as configuracoes atuais do servidor:',
      embeds: [embed],
      components: []
    });
  }

  async showSuccessMessage(interaction, message) {
    await interaction.update({
      content: `Configuracao salva: ${message}`,
      components: [],
      embeds: []
    });
  }
}

module.exports = new ConfigHandler();
