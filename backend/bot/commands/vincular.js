const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../models');
const crypto = require('crypto');

/**
 * Comando /vincular - Vincula conta do Discord ao site PSO Brasil
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('vincular')
    .setDescription('Vincule sua conta do Discord ao perfil do PSO Brasil')
    .addStringOption(option =>
      option
        .setName('codigo')
        .setDescription('Código de vinculação do site (ou deixe em branco para gerar um novo)')
        .setRequired(false)
    ),

  async execute(interaction, bot) {
    const codigo = interaction.options.getString('codigo');
    const discordId = interaction.user.id;
    const discordUsername = interaction.user.username;
    const discordAvatar = interaction.user.displayAvatarURL({ dynamic: true });

    // Embed base com identidade visual PSO
    const createEmbed = (title, description, color = '#22C55E') => {
      return new EmbedBuilder()
        .setTitle(`🔷 ${title}`)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ 
          text: 'PSO Brasil • Sistema de Vinculação', 
          iconURL: 'https://psobrasil.squareweb.app/logo.png' 
        });
    };

    try {
      // Verificar se usuário já está vinculado
      const existingUser = await User.findOne({ where: { discordId } });
      
      if (existingUser) {
        return await interaction.reply({
          embeds: [createEmbed(
            'Conta Já Vinculada',
            `Ei ${discordUsername}! Sua conta já está vinculada ao perfil **${existingUser.username}** no PSO Brasil.\n\n` +
            `📊 Rating: ${existingUser.rank}\n` +
            `⚽ Partidas: ${existingUser.wins + existingUser.losses}\n` +
            `🎯 Gols: ${existingUser.goals}\n\n` +
            `Use **/perfil** para ver seus stats completos!`
          )],
          ephemeral: true
        });
      }

      // Se não forneceu código, gerar um novo
      if (!codigo) {
        const novoCodigo = crypto.randomBytes(4).toString('hex').toUpperCase();
        
        // Armazenar código temporário no cache (5 minutos)
        bot.discordLinkCodes = bot.discordLinkCodes || new Map();
        bot.discordLinkCodes.set(novoCodigo, {
          discordId,
          discordUsername,
          discordAvatar,
          expires: Date.now() + 5 * 60 * 1000
        });

        return await interaction.reply({
          embeds: [createEmbed(
            'Código Gerado',
            `🔑 **Seu código de vinculação:** \`${novoCodigo}\`\n\n` +
            `1. Acesse o site **psobrasil.squareweb.app**\n` +
            `2. Faça login na sua conta\n` +
            `3. Vá em **Dashboard > Configurações**\n` +
            `4. Cole o código: **${novoCodigo}**\n\n` +
            `⚠️ Código expira em **5 minutos**!`
          )],
          ephemeral: true
        });
      }

      // Verificar código fornecido
      const linkData = bot.discordLinkCodes?.get(codigo.toUpperCase());
      
      if (!linkData || linkData.expires < Date.now()) {
        return await interaction.reply({
          embeds: [createEmbed(
            'Código Inválido',
            `❌ Código **${codigo}** inválido ou expirado!\n\n` +
            `Use **/vincular** sem código para gerar um novo.`,
            '#EF4444'
          )],
          ephemeral: true
        });
      }

      // Código válido - procurar usuário no site pelo email ou verificar se usuário existe
      // Por enquanto, vamos criar uma vinculação básica
      // Na implementação real, o site teria que confirmar este código

      return await interaction.reply({
        embeds: [createEmbed(
          'Aguardando Confirmação',
          `⏳ Código **${codigo}** validado!\n\n` +
          `Agora você precisa confirmar a vinculação no site.\n` +
          `Assim que confirmar, seus dados serão sincronizados automaticamente.\n\n` +
          `📊 Stats, rankings e conquistas aparecerão aqui no Discord!`
        )],
        ephemeral: true
      });

    } catch (error) {
      console.error('[COMANDO VINCULAR] Erro:', error);
      return await interaction.reply({
        embeds: [createEmbed(
          'Erro',
          '❌ Algo deu errado! Tenta de novo mais tarde ou chama o suporte.',
          '#EF4444'
        )],
        ephemeral: true
      });
    }
  }
};
