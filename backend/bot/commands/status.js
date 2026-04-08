const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const PSOEmbedBuilder = require('../../lib/embedBuilder');

/**
 * Comando /status - Diagnóstico do Sistema
 * Interface técnica sem emojis com barras de progresso
 */

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Verificar status do sistema PSO Brasil')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  public: false, // Requer permissão de admin
  cooldown: 30, // 30 segundos cooldown
  
  async execute(interaction, bot) {
    await interaction.deferReply();

    try {
      // Obter métricas do health monitor
      const metrics = bot.healthMonitor?.getMetrics() || {};
      
      // Calcular latência do bot
      const startTime = Date.now();
      await interaction.fetchReply();
      const botLatency = Date.now() - startTime;

      // Obter status do Discord
      const discordStatus = {
        ping: bot.client.ws.ping,
        uptime: bot.client.uptime,
        guilds: bot.client.guilds.cache.size,
        users: bot.client.users.cache.size
      };

      // Criar embed técnico usando o builder
      const embedBuilder = new PSOEmbedBuilder();
      
      // Preparar dados técnicos
      const statusData = {
        databaseStatus: metrics.databaseStatus,
        siteStatus: metrics.siteStatus,
        responseTime: metrics.responseTime,
        isMonitoring: metrics.isMonitoring,
        uptime: metrics.uptime,
        memoryUsage: metrics.memoryUsage,
        nodeVersion: metrics.nodeVersion,
        platform: metrics.platform,
        errors: metrics.errors
      };

      // Adicionar métricas do Discord
      statusData.botLatency = botLatency;
      statusData.discordPing = discordStatus.ping;
      statusData.discordUptime = discordStatus.uptime;
      statusData.guilds = discordStatus.guilds;
      statusData.users = discordStatus.users;

      // Criar embed técnico
      const embed = embedBuilder.createStatusEmbed(statusData);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('[STATUS] Erro ao executar comando:', error);
      
      await interaction.editReply({
        content: 'Erro ao obter status do sistema. Tente novamente.',
        ephemeral: true
      });
    }
  }
};
