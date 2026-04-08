const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType } = require('discord.js');
const PSOEmbedBuilder = require('../../lib/embedBuilder');

/**
 * Handler para modais de mercado (transferências)
 * Processa os dados do modal, criptografa valores sensíveis e salva no banco
 */

class MarketHandler {
  constructor() {
    this.embedBuilder = new PSOEmbedBuilder();
  }

  async handle(interaction, bot) {
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'market_transfer_modal') {
        await this.handleTransferModal(interaction, bot);
      }
    }
  }

  async handleTransferModal(interaction, bot) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Extrair dados do modal
      const playerName = interaction.fields.getTextInputValue('player_name');
      const oldClub = interaction.fields.getTextInputValue('old_club') || 'VLOCE';
      const newClub = interaction.fields.getTextInputValue('new_club');
      const duration = parseInt(interaction.fields.getTextInputValue('duration'));
      const salary = parseFloat(interaction.fields.getTextInputValue('salary'));

      // Validar dados
      if (!playerName || !newClub || isNaN(duration) || isNaN(salary)) {
        await interaction.editReply({
          content: 'Dados inválidos. Por favor, preencha todos os campos corretamente.'
        });
        return;
      }

      // Buscar times no banco
      const oldTeam = oldClub.toUpperCase() !== 'VLOCE' 
        ? await bot.prisma.team.findFirst({ where: { name: { contains: oldClub, mode: 'insensitive' } } })
        : null;
        
      const newTeam = await bot.prisma.team.findFirst({ 
        where: { name: { contains: newClub, mode: 'insensitive' } } 
      });

      if (!newTeam) {
        await interaction.editReply({
          content: `Time "${newClub}" não encontrado no banco de dados.`
        });
        return;
      }

      // Calcular valores adicionais
      const feePaid = salary * 2; // Taxa estimada
      const releaseClause = salary * 5; // Cláusula estimada

      // Criptografar dados sensíveis
      const encryptedData = bot.encryptionManager.encryptFields({
        salary,
        feePaid,
        releaseClause
      }, ['salary', 'feePaid', 'releaseClause']);

      // Criar transferência no banco
      const transfer = await bot.prisma.transfer.create({
        data: {
          playerName,
          oldClubId: oldTeam ? oldTeam.id : null,
          newClubId: newTeam.id,
          duration,
          startSeason: '2024',
          endSeason: '2026',
          salary: encryptedData.salary,
          feePaid: encryptedData.feePaid,
          releaseClause: encryptedData.releaseClause
        },
        include: {
          oldClub: { select: { name: true, logoUrl: true } },
          newClub: { select: { name: true, logoUrl: true } }
        }
      });

      // Criar log
      await bot.prisma.botLog.create({
        data: {
          guildId: interaction.guild.id,
          action: 'TRANSFER_REGISTERED',
          command: '/mercado anunciar',
          userId: interaction.user.id,
          username: interaction.user.username,
          transferId: transfer.id,
          status: 'SUCCESS',
          data: {
            playerName,
            oldClub: oldClub,
            newClub: newClub,
            duration
          },
          encryptedData: JSON.stringify({
            salary: encryptedData.salary,
            feePaid: encryptedData.feePaid,
            releaseClause: encryptedData.releaseClause
          })
        }
      });

      // Enviar confirmação no canal configurado
      await this.announceTransfer(interaction, bot, transfer, playerName, oldClub, newClub, duration, salary);

      // Notificar site via WebSocket
      bot.notifyWebsite('new-transfer', {
        id: transfer.id,
        playerName,
        oldClub: transfer.oldClub,
        newClub: transfer.newClub,
        duration,
        timestamp: new Date().toISOString()
      });

      await interaction.editReply({
        content: `Transferência de ${playerName} registrada com sucesso! ID: ${transfer.id}`
      });

    } catch (error) {
      console.error('[MARKET_HANDLER] Erro ao processar transferência:', error);
      
      // Log do erro
      await bot.prisma.botLog.create({
        data: {
          guildId: interaction.guild.id,
          action: 'TRANSFER_REGISTERED',
          command: '/mercado anunciar',
          userId: interaction.user.id,
          username: interaction.user.username,
          status: 'FAILED',
          errorMessage: error.message
        }
      });

      await interaction.editReply({
        content: 'Erro ao registrar transferência. Verifique os dados e tente novamente.'
      });
    }
  }

  async announceTransfer(interaction, bot, transfer, playerName, oldClubName, newClubName, duration, salary) {
    try {
      // Buscar configuração do servidor
      const config = await bot.getGuildConfig(interaction.guild.id);
      
      if (!config || !config.marketChannelId) {
        console.log('[MARKET_HANDLER] Canal de mercado não configurado');
        return;
      }

      const channel = await interaction.guild.channels.fetch(config.marketChannelId);
      if (!channel) {
        console.log('[MARKET_HANDLER] Canal não encontrado');
        return;
      }

      // Preparar dados para o embed técnico
      const transferData = {
        id: transfer.id,
        playerName,
        oldClubName,
        newClubName,
        duration,
        salary: salary * 1000000, // Converter para reais
        feePaid: transfer.feePaid * 1000000,
        releaseClause: transfer.releaseClause ? transfer.releaseClause * 1000000 : null,
        timestamp: transfer.timestamp
      };

      // Preparar logos dos clubes
      const clubLogos = {
        newClub: transfer.newClub?.logoUrl,
        oldClub: transfer.oldClub?.logoUrl
      };

      // Criar embed técnico
      const embed = this.embedBuilder.createTransferEmbed(transferData, clubLogos);
      
      // Criar botões de ação
      const actionRow = this.embedBuilder.createTransferButtons(transfer.id);

      // Enviar mensagem com embed e botões
      await channel.send({ 
        embeds: [embed],
        components: [actionRow]
      });

      console.log('[MARKET_HANDLER] Anúncio técnico enviado no canal de mercado');

    } catch (error) {
      console.error('[MARKET_HANDLER] Erro ao enviar anúncio:', error);
    }
  }
}

module.exports = new MarketHandler();
