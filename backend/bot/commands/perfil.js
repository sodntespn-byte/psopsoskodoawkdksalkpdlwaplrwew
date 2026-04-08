const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../models');

/**
 * Comando /perfil - Mostra perfil do usuário vinculado
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Visualize seu perfil PSO Brasil ou de outro player vinculado')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Mencione um usuário do Discord para ver o perfil dele')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const discordId = targetUser.id;

    // Cores PSO Brasil
    const PSO_GREEN = '#22C55E';
    const PSO_YELLOW = '#FACC15';
    const PSO_DARK = '#121212';

    try {
      // Buscar usuário no banco
      const user = await User.findOne({ where: { discordId } });

      if (!user) {
        const noLinkEmbed = new EmbedBuilder()
          .setTitle('🔷 Perfil Não Encontrado')
          .setDescription(
            targetUser.id === interaction.user.id
              ? `Ei ${targetUser.username}! Você ainda não vinculou sua conta do Discord ao PSO Brasil.\n\n` +
                `Use **/vincular** para conectar seu perfil e aparecer aqui com seus stats!`
              : `O usuário ${targetUser.username} ainda não vinculou a conta ao PSO Brasil.`
          )
          .setColor('#9CA3AF')
          .setTimestamp()
          .setFooter({ 
            text: 'PSO Brasil • Sistema de Perfil', 
            iconURL: 'https://psobrasil.squareweb.app/logo.png' 
          });

        return await interaction.reply({ embeds: [noLinkEmbed], ephemeral: true });
      }

      // Calcular estatísticas
      const totalMatches = user.wins + user.losses;
      const winRate = totalMatches > 0 ? ((user.wins / totalMatches) * 100).toFixed(1) : '0.0';
      const goalsPerMatch = totalMatches > 0 ? (user.goals / totalMatches).toFixed(2) : '0.00';
      
      // Determinar rank visual
      let rankEmoji = '🥉';
      let rankTitle = 'Bronze';
      if (user.rank >= 2000) { rankEmoji = '🥈'; rankTitle = 'Prata'; }
      if (user.rank >= 3000) { rankEmoji = '🥇'; rankTitle = 'Ouro'; }
      if (user.rank >= 4000) { rankEmoji = '💎'; rankTitle = 'Diamante'; }
      if (user.rank >= 4500) { rankEmoji = '👑'; rankTitle = 'Lenda'; }

      // Criar embed do perfil
      const profileEmbed = new EmbedBuilder()
        .setTitle(`🔷 Perfil PSO Brasil • ${user.username}`)
        .setDescription(
          `**${rankEmoji} ${rankTitle}** • Rating: **${user.rank}**\n` +
          `"${user.bio || 'Sem bio ainda. Bora jogar!'}"`
        )
        .setColor(PSO_GREEN)
        .setThumbnail(discordId === interaction.user.id ? interaction.user.displayAvatarURL({ dynamic: true }) : targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { 
            name: '📊 Stats da Temporada', 
            value: 
              `⚽ **${totalMatches}** Partidas\n` +
              `✅ **${user.wins}** Vitórias\n` +
              `❌ **${user.losses}** Derrotas\n` +
              `📈 **${winRate}%** Win Rate`,
            inline: true 
          },
          { 
            name: '🎯 Performance', 
            value: 
              `🥅 **${user.goals}** Gols\n` +
              `🅰️ **${user.assists}** Assists\n` +
              `🔥 **${goalsPerMatch}** Gols/Jogo\n` +
              `🎮 Estilo: **${user.playStyle || 'balanced'}**`,
            inline: true 
          },
          { 
            name: '🏆 Conquistas', 
            value: 
              `🥇 Torneios: **0**\n` +
              `⭐ MVP: **0x**\n` +
              `🎯 Clean Sheets: **0**\n` +
              `📅 Registro: **${new Date(user.createdAt).toLocaleDateString('pt-BR')}**`,
            inline: true 
          }
        )
        .setTimestamp()
        .setFooter({ 
          text: `PSO Brasil • Último login: ${new Date(user.lastLogin).toLocaleDateString('pt-BR')}`, 
          iconURL: 'https://psobrasil.squareweb.app/logo.png' 
        });

      // Adicionar campos extras se existir time favorito
      if (user.favoriteTeam) {
        profileEmbed.addFields({
          name: '⚽ Time do Coração',
          value: user.favoriteTeam,
          inline: false
        });
      }

      // Adicionar status online
      const statusEmoji = user.isOnline ? '🟢 Online' : '⚫ Offline';
      profileEmbed.addFields({
        name: '📡 Status',
        value: statusEmoji,
        inline: false
      });

      await interaction.reply({ embeds: [profileEmbed] });

    } catch (error) {
      console.error('[COMANDO PERFIL] Erro:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Erro')
        .setDescription('Algo deu errado ao buscar o perfil! Tenta de novo mais tarde.')
        .setColor('#EF4444')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
