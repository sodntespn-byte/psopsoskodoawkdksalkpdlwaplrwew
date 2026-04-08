const { EmbedBuilder } = require('discord.js');
const { User } = require('../../models');

/**
 * Serviço de Notificações do Bot PSO Brasil
 * Envia mensagens automáticas sobre ranking, novos campeões, etc.
 */
class BotNotificationService {
  constructor(bot) {
    this.bot = bot;
    this.client = bot.client;
    this.notificationChannel = null;
    this.lastTopPlayers = new Map();
  }

  /**
   * Inicializar serviço de notificações
   */
  async initialize() {
    // Buscar canal de notificações (pode ser configurado via env ou database)
    const channelId = process.env.DISCORD_NOTIFICATION_CHANNEL;
    if (channelId) {
      this.notificationChannel = await this.client.channels.fetch(channelId).catch(() => null);
    }

    // Iniciar monitoramento periódico
    this.startRankingMonitor();
    
    console.log('[BOT-NOTIFY] Serviço de notificações inicializado');
  }

  /**
   * Monitorar mudanças no ranking
   */
  startRankingMonitor() {
    // Verificar a cada 5 minutos
    setInterval(async () => {
      await this.checkRankingChanges();
    }, 5 * 60 * 1000);

    // Verificação inicial
    this.checkRankingChanges();
  }

  /**
   * Verificar mudanças no ranking
   */
  async checkRankingChanges() {
    try {
      const topPlayers = await User.findAll({
        order: [['rank', 'DESC']],
        limit: 5,
        attributes: ['id', 'username', 'rank', 'wins', 'discordId', 'isOnline']
      });

      // Verificar se houve mudanças
      for (let i = 0; i < topPlayers.length; i++) {
        const player = topPlayers[i];
        const currentPos = i + 1;
        const lastPos = this.lastTopPlayers.get(player.id);

        if (lastPos && lastPos !== currentPos) {
          // Houve mudança de posição!
          const isUp = currentPos < lastPos;
          await this.sendRankingChangeNotification(player, currentPos, lastPos, isUp);
        }

        this.lastTopPlayers.set(player.id, currentPos);
      }
    } catch (error) {
      console.error('[BOT-NOTIFY] Erro ao verificar ranking:', error);
    }
  }

  /**
   * Enviar notificação de mudança no ranking
   */
  async sendRankingChangeNotification(player, newPos, oldPos, isUp) {
    if (!this.notificationChannel) return;

    const posDiff = Math.abs(oldPos - newPos);
    const emoji = isUp ? '📈' : '📉';
    const color = isUp ? '#22C55E' : '#EF4444';
    const action = isUp ? 'SUBIU' : 'DESCEU';

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${action} NO RANKING!`)
      .setDescription(
        `**${player.username}** ${isUp ? 'deu aquele clutch' : 'tomou um L'} e ${action.toLowerCase()}!\n\n` +
        `Posição: **${oldPos}** → **${newPos}** (${posDiff} lugar${posDiff > 1 ? 'es' : ''})\n` +
        `Rating: **${player.rank}**\n` +
        `Wins: **${player.wins}**`
      )
      .setColor(color)
      .setTimestamp()
      .setFooter({ 
        text: 'PSO Brasil • Ranking Oficial', 
        iconURL: 'https://psobrasil.squareweb.app/logo.png' 
      });

    await this.notificationChannel.send({ embeds: [embed] });
  }

  /**
   * Notificar novo campeão/MVP
   */
  async notifyNewChampion(user, tournamentName) {
    if (!this.notificationChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('🏆 NOVO CAMPEÃO DETECTADO!')
      .setDescription(
        `**${user.username}** acabou de levar o **${tournamentName}**!\n\n` +
        `Rating atual: **${user.rank}**\n` +
        `Vitórias: **${user.wins}**\n\n` +
        `GG WP! 🎉`
      )
      .setColor('#FACC15')
      .setTimestamp()
      .setFooter({ 
        text: 'PSO Brasil • Campeão Oficial', 
        iconURL: 'https://psobrasil.squareweb.app/logo.png' 
      });

    await this.notificationChannel.send({ 
      embeds: [embed],
      content: '🎉 @everyone Temos um novo campeão!'
    });
  }

  /**
   * Notificar novo MVP
   */
  async notifyNewMVP(user) {
    if (!this.notificationChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('👑 NOVO MVP DA SEMANA!')
      .setDescription(
        `**${user.username}** foi eleito o MVP do brasileirão!\n\n` +
        `Performance absurda na última temporada.\n` +
        `Rating: **${user.rank}** | Gols: **${user.goals}**\n\n` +
        `Bora jogar igual! 🔥`
      )
      .setColor('#FACC15')
      .setTimestamp()
      .setFooter({ 
        text: 'PSO Brasil • MVP Oficial', 
        iconURL: 'https://psobrasil.squareweb.app/logo.png' 
      });

    await this.notificationChannel.send({ 
      embeds: [embed],
      content: '👑 @everyone Novo MVP detectado!'
    });
  }

  /**
   * Notificar subida de divisão
   */
  async notifyDivisionUp(user, oldRank, newRank) {
    if (!this.notificationChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('⬆️ SUBIU DE DIVISÃO!')
      .setDescription(
        `**${user.username}** subiu de patamar!\n\n` +
        `De **${oldRank}** para **${newRank}**\n\n` +
        `Aquele grind valendo! 💪`
      )
      .setColor('#22C55E')
      .setTimestamp()
      .setFooter({ 
        text: 'PSO Brasil • Progressão', 
        iconURL: 'https://psobrasil.squareweb.app/logo.png' 
      });

    await this.notificationChannel.send({ embeds: [embed] });
  }

  /**
   * Enviar DM de boas-vindas para novo usuário registrado
   */
  async sendWelcomeDM(discordId, siteUsername, discordUsername) {
    try {
      const user = await this.client.users.fetch(discordId).catch(() => null);
      if (!user) {
        console.log(`[BOT-NOTIFY] Usuário Discord ${discordId} não encontrado para DM`);
        return false;
      }

      const { EmbedBuilder } = require('discord.js');
      
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('🔷 Bem-vindo à PSO Brasil!')
        .setDescription(
          `E aí, **${siteUsername}**! 🎉\n\n` +
          `Sua conta foi criada com sucesso e já está vinculada ao Discord!\n\n` +
          `**O que você pode fazer agora:**\n` +
          `• Use **/perfil** no servidor para ver seus stats\n` +
          `• Use **/ranking** para ver os melhores players\n` +
          `• Participe dos drafts e suba no ranking!\n\n` +
          `Bora jogar! ⚽🔥`
        )
        .setColor('#22C55E')
        .setTimestamp()
        .setFooter({ 
          text: 'PSO Brasil • Liga Oficial', 
          iconURL: 'https://psobrasil.squareweb.app/logo.png' 
        });

      await user.send({ embeds: [welcomeEmbed] });
      console.log(`[BOT-NOTIFY] DM de boas-vindas enviada para ${discordUsername} (${discordId})`);
      return true;
      
    } catch (error) {
      console.error('[BOT-NOTIFY] Erro ao enviar DM de boas-vindas:', error);
      return false;
    }
  }

  /**
   * Atualizar cargos do Discord baseado no ranking
   */
  async updateDiscordRoles(guild, user) {
    try {
      const member = await guild.members.fetch(user.discordId).catch(() => null);
      if (!member) return;

      // Definir cargos baseado no rating
      let roleName = null;
      if (user.rank >= 4500) roleName = '👑 Lenda';
      else if (user.rank >= 4000) roleName = '💎 Diamante';
      else if (user.rank >= 3000) roleName = '🥇 Ouro';
      else if (user.rank >= 2000) roleName = '🥈 Prata';
      else if (user.rank >= 1000) roleName = '🥉 Bronze';

      if (roleName) {
        // Verificar se cargo existe
        let role = guild.roles.cache.find(r => r.name === roleName);
        
        if (!role) {
          // Criar cargo se não existir
          role = await guild.roles.create({
            name: roleName,
            color: user.rank >= 4000 ? '#22C55E' : user.rank >= 3000 ? '#FACC15' : '#9CA3AF',
            reason: 'Cargo PSO Brasil Ranking'
          });
        }

        // Adicionar cargo ao membro
        await member.roles.add(role).catch(console.error);
      }
    } catch (error) {
      console.error('[BOT-NOTIFY] Erro ao atualizar cargos:', error);
    }
  }
}

module.exports = BotNotificationService;
