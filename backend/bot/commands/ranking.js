const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../models');
const { Op } = require('sequelize');

/**
 * Comando /ranking - Mostra top players do PSO Brasil
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Visualize o ranking dos melhores players do PSO Brasil')
    .addIntegerOption(option =>
      option
        .setName('top')
        .setDescription('Quantos players mostrar (padrão: 10)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    ),

  async execute(interaction) {
    const topCount = interaction.options.getInteger('top') || 10;

    // Cores PSO Brasil
    const PSO_GREEN = '#22C55E';
    const PSO_YELLOW = '#FACC15';

    try {
      // Buscar top players
      const topPlayers = await User.findAll({
        order: [['rank', 'DESC']],
        limit: topCount,
        attributes: ['id', 'username', 'rank', 'wins', 'losses', 'goals', 'discordId', 'isOnline']
      });

      if (topPlayers.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setTitle('🔷 Ranking PSO Brasil')
          .setDescription('Nenhum player encontrado ainda! Bora jogar e subir no ranking?')
          .setColor('#9CA3AF')
          .setTimestamp()
          .setFooter({ 
            text: 'PSO Brasil • Ranking Oficial', 
            iconURL: 'https://psobrasil.squareweb.app/logo.png' 
          });

        return await interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
      }

      // Criar descrição do ranking
      let rankingText = '';
      
      topPlayers.forEach((player, index) => {
        const pos = index + 1;
        const posEmoji = pos === 1 ? '👑' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `**${pos}.**`;
        const totalMatches = player.wins + player.losses;
        const winRate = totalMatches > 0 ? ((player.wins / totalMatches) * 100).toFixed(0) : 0;
        const statusEmoji = player.isOnline ? '🟢' : '⚫';
        
        rankingText += `${posEmoji} **${player.username}** ${statusEmoji}\n`;
        rankingText += `   📊 Rating: \`${player.rank}\` | ✅ ${winRate}% WR | 🥅 ${player.goals} gols\n\n`;
      });

      const rankingEmbed = new EmbedBuilder()
        .setTitle(`🔷 Ranking PSO Brasil • TOP ${topCount}`)
        .setDescription(rankingText)
        .setColor(PSO_GREEN)
        .setTimestamp()
        .setFooter({ 
          text: `PSO Brasil • ${topPlayers.length} players no ranking`, 
          iconURL: 'https://psobrasil.squareweb.app/logo.png' 
        })
        .addFields(
          {
            name: '📈 Estatísticas Gerais',
            value: 
              `👑 Líder: **${topPlayers[0].username}** (Rating: ${topPlayers[0].rank})\n` +
              `🎯 Total de Gols: **${topPlayers.reduce((sum, p) => sum + p.goals, 0)}**\n` +
              `⚽ Partidas: **${topPlayers.reduce((sum, p) => sum + p.wins + p.losses, 0)}**`,
            inline: false
          }
        );

      // Adicionar dica para subir no ranking
      rankingEmbed.addFields({
        name: '💡 Dica',
        value: 'Jogue partidas ranqueadas, mantenha win rate alto e marque gols para subir!',
        inline: false
      });

      await interaction.reply({ embeds: [rankingEmbed] });

    } catch (error) {
      console.error('[COMANDO RANKING] Erro:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Erro')
        .setDescription('Não foi possível carregar o ranking agora! Tenta de novo mais tarde.')
        .setColor('#EF4444')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
