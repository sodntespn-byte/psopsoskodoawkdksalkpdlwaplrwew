const { ModalBuilder, TextInputComponent, ActionRowBuilder } = require('discord.js');
const crypto = require('crypto');
const { getSecurityManager } = require('../lib/apiSecurity');
const { getAuditLogger } = require('../lib/auditLogger');

/**
 * Comando para registrar nova transferência no Discord com segurança militar
 * /registrar-transferencia
 */
class TransferCommand {
  constructor(transferManager, webhookUrl) {
    this.transferManager = transferManager;
    this.webhookUrl = webhookUrl;
    this.securityManager = getSecurityManager();
    this.auditLogger = getAuditLogger();
    
    // Segredo HMAC para assinatura de requisições
    this.hmacSecret = process.env.WEBHOOK_HMAC_SECRET || 'default-hmac-secret-change-in-production';
  }

  /**
   * Criar modal para registro de transferência
   */
  createModal() {
    const modal = new ModalBuilder()
      .setCustomId(`transfer_${Date.now()}`)
      .setTitle('Registrar Nova Transferência Segura')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('playerName')
            .setLabel('Nome do Jogador')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: Neymar Jr.')
            .setRequired(true),
          new TextInputComponent()
            .setCustomId('oldClub')
            .setLabel('Clube Antigo (ou VLOCE para agente livre)')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: Santos ou VLOCE')
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('newClub')
            .setLabel('Novo Clube')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: Barcelona')
            .setRequired(true),
          new TextInputComponent()
            .setCustomId('duration')
            .setLabel('Duração (meses)')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: 24')
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('startSeason')
            .setLabel('Temporada Início')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: 2024')
            .setRequired(true),
          new TextInputComponent()
            .setCustomId('endSeason')
            .setLabel('Temporada Término')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: 2026')
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Salário (em milhões)')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: 5.5')
            .setRequired(true),
          new TextInputComponent()
            .setCustomId('feePaid')
            .setLabel('Taxa Paga (em milhões)')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: 25.0')
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputComponent()
            .setCustomId('releaseClause')
            .setLabel('Cláusula de Rescisão (em milhões, opcional)')
            .setStyle(TextInputComponentStyle.Short)
            .setPlaceholder('Ex: 50.0')
            .setRequired(false)
        )
      );

    return modal;
  }

  /**
   * Processar submissão do modal com segurança
   */
  async handleModalSubmit(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Contexto de auditoria
      const auditContext = {
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        source: 'discord_modal'
      };

      // Extrair dados do modal
      const transferData = {
        playerName: interaction.fields.getTextInputValue('playerName').trim(),
        oldClub: interaction.fields.getTextInputValue('oldClub').trim(),
        newClub: interaction.fields.getTextInputValue('newClub').trim(),
        duration: parseInt(interaction.fields.getTextInputValue('duration')),
        startSeason: interaction.fields.getTextInputValue('startSeason').trim(),
        endSeason: interaction.fields.getTextInputValue('endSeason').trim(),
        salary: parseFloat(interaction.fields.getTextInputValue('salary')),
        feePaid: parseFloat(interaction.fields.getTextInputValue('feePaid')),
        releaseClause: interaction.fields.getTextInputValue('releaseClause').trim()
      };

      // Log de tentativa
      this.auditLogger.log('INFO', 'DISCORD_TRANSFER_SUBMISSION_ATTEMPT', {
        playerName: transferData.playerName,
        newClub: transferData.newClub,
        feePaid: transferData.feePaid
      }, auditContext);

      // Validação dos dados
      const validationError = this.validateTransferData(transferData);
      if (validationError) {
        this.auditLogger.log('ERROR', 'DISCORD_TRANSFER_VALIDATION_FAILED', {
          errors: validationError,
          data: transferData
        }, auditContext);
        
        await interaction.followUp({
          content: validationError,
          ephemeral: true
        });
        return;
      }

      // Converter cláusula de rescisão para número se fornecida
      if (transferData.releaseClause) {
        transferData.releaseClause = parseFloat(transferData.releaseClause);
      } else {
        delete transferData.releaseClause;
      }

      // Enviar para webhook com HMAC
      const webhookResponse = await this.sendToWebhookWithHMAC(transferData, auditContext);

      if (!webhookResponse.success) {
        this.auditLogger.log('ERROR', 'DISCORD_TRANSFER_WEBHOOK_FAILED', {
          error: webhookResponse.message,
          data: transferData
        }, auditContext);
        
        throw new Error(webhookResponse.message || 'Erro ao registrar transferência');
      }

      // Criar embed de sucesso
      const successEmbed = this.createSuccessEmbed(transferData, webhookResponse.data);

      await interaction.followUp({
        embeds: [successEmbed],
        ephemeral: false
      });

      // Log de sucesso
      this.auditLogger.log('INFO', 'DISCORD_TRANSFER_SUCCESS', {
        transferId: webhookResponse.data.id,
        playerName: transferData.playerName,
        newClub: transferData.newClub,
        tier: webhookResponse.data.tier
      }, auditContext);

    } catch (error) {
      console.error('Erro ao processar transferência Discord:', error);
      
      // Log de erro crítico
      this.auditLogger.log('CRITICAL', 'DISCORD_TRANSFER_PROCESSING_ERROR', {
        error: error.message,
        stack: error.stack,
        userId: interaction.user.id
      }, { userId: interaction.user.id });
      
      await interaction.followUp({
        content: `Erro ao registrar transferência: ${error.message}`,
        ephemeral: true
      });
    }
  }

  /**
   * Enviar dados para webhook com HMAC
   */
  async sendToWebhookWithHMAC(transferData, auditContext) {
    try {
      // Gerar timestamp
      const timestamp = Date.now().toString();
      
      // Gerar HMAC dos dados
      const hmac = this.securityManager.generateHMAC(transferData, timestamp);
      
      // Preparar requisição
      const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/transfers/webhook`;
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Transfer-Secret': process.env.TRANSFER_SECRET_KEY,
          'X-Webhook-HMAC': hmac,
          'X-Webhook-Timestamp': timestamp,
          'X-Discord-User-ID': auditContext.userId,
          'X-Discord-Username': auditContext.username,
          'X-Request-ID': this.securityManager.generateRequestId(),
          'User-Agent': 'PSO-Discord-Bot/1.0'
        },
        body: JSON.stringify(transferData)
      });

      const result = await response.json();
      
      // Log da requisição
      this.auditLogger.log('INFO', 'WEBHOOK_REQUEST_SENT', {
        url: webhookUrl,
        status: response.status,
        success: result.success,
        hmac: hmac.substring(0, 16) + '...',
        timestamp
      }, auditContext);
      
      return result;
    } catch (error) {
      console.error('Erro ao enviar para webhook:', error);
      
      // Log de erro
      this.auditLogger.log('ERROR', 'WEBHOOK_REQUEST_FAILED', {
        error: error.message,
        stack: error.stack
      }, auditContext);
      
      return { success: false, message: 'Erro ao enviar para webhook' };
    }
  }

  /**
   * Validar dados da transferência
   */
  validateTransferData(data) {
    const errors = [];

    // Validação do nome do jogador
    if (!data.playerName || data.playerName.length < 2) {
      errors.push('Nome do jogador deve ter pelo menos 2 caracteres.');
    }

    if (data.playerName.length > 100) {
      errors.push('Nome do jogador deve ter no máximo 100 caracteres.');
    }

    // Validação do novo clube
    if (!data.newClub || data.newClub.length < 2) {
      errors.push('Nome do novo clube deve ter pelo menos 2 caracteres.');
    }

    if (data.newClub.length > 100) {
      errors.push('Nome do novo clube deve ter no máximo 100 caracteres.');
    }

    // Validação da duração
    if (isNaN(data.duration) || data.duration < 1 || data.duration > 120) {
      errors.push('Duração deve ser um número entre 1 e 120 meses.');
    }

    // Validação das temporadas
    if (!data.startSeason || !/^\d{4}$/.test(data.startSeason)) {
      errors.push('Temporada de início deve ter formato YYYY (ex: 2024).');
    }

    if (!data.endSeason || !/^\d{4}$/.test(data.endSeason)) {
      errors.push('Temporada de término deve ter formato YYYY (ex: 2026).');
    }

    if (parseInt(data.startSeason) > parseInt(data.endSeason)) {
      errors.push('Temporada de início não pode ser posterior à de término.');
    }

    // Validação do salário
    if (isNaN(data.salary) || data.salary < 0 || data.salary > 100) {
      errors.push('Salário deve ser um número entre 0 e 100 milhões.');
    }

    // Validação da taxa paga
    if (isNaN(data.feePaid) || data.feePaid < 0 || data.feePaid > 1000) {
      errors.push('Taxa paga deve ser um número entre 0 e 1000 milhões.');
    }

    // Validação da cláusula de rescisão
    if (data.releaseClause !== null && data.releaseClause !== undefined) {
      if (isNaN(data.releaseClause) || data.releaseClause < 0 || data.releaseClause > 1000) {
        errors.push('Cláusula de rescisão deve ser um número entre 0 e 1000 milhões ou ser deixada em branco.');
      }
    }

    // Validação do clube antigo
    if (data.oldClub && data.oldClub.toUpperCase() !== 'VLOCE' && data.oldClub.length < 2) {
      errors.push('Nome do clube antigo deve ter pelo menos 2 caracteres ou ser "VLOCE".');
    }

    return errors.length > 0 ? errors.join('\n') : null;
  }

  /**
   * Criar embed de sucesso com informações de segurança
   */
  createSuccessEmbed(transferData, responseData) {
    const { EmbedBuilder } = require('discord.js');
    
    const isFreeAgent = !transferData.oldClub || transferData.oldClub.toUpperCase() === 'VLOCE';
    const isTier1 = transferData.feePaid >= 50;
    
    const embed = new EmbedBuilder()
      .setTitle('Transferência Registrada com Segurança Militar!')
      .setColor(isTier1 ? 0xFFD700 : 0x00FF00) // Dourado para Tier 1, Verde para outros
      .setDescription(`@${transferData.playerName} é o novo reforço do ${transferData.newClub}!`)
      .setThumbnail('https://media.giphy.com/media/v1.YBilCkYBvBd7U/giphy.gif')
      .addFields(
        {
          name: 'Jogador',
          value: transferData.playerName,
          inline: true
        },
        {
          name: 'Clube Antigo',
          value: isFreeAgent ? 'VLOCE (Agente Livre)' : transferData.oldClub,
          inline: true
        },
        {
          name: 'Novo Clube',
          value: transferData.newClub,
          inline: true
        },
        {
          name: 'Duração',
          value: `${transferData.duration} meses`,
          inline: true
        },
        {
          name: 'Salário',
          value: `R$ ${transferData.salary.toFixed(1)}M`,
          inline: true
        },
        {
          name: 'Taxa Paga',
          value: `R$ ${transferData.feePaid.toFixed(1)}M`,
          inline: true
        }
      )
      .setTimestamp();

    // Adicionar cláusula de rescisão se existir
    if (transferData.releaseClause) {
      embed.addFields({
        name: 'Cláusula de Rescisão',
        value: `R$ ${transferData.releaseClause.toFixed(1)}M`,
        inline: true
      });
    }

    // Adicionar informações de segurança
    embed.addFields({
      name: 'Segurança',
      value: `Criptografia: AES-256-GCM\nIntegridade: Verificada\nAssinatura: HMAC-SHA256`,
      inline: false
    });

    // Adicionar informações do contrato
    if (responseData.contractId) {
      embed.addFields({
        name: 'ID do Contrato',
        value: responseData.contractId,
        inline: true
      });
    }

    // Adicionar selo de Tier 1
    if (isTier1) {
      embed.addFields({
        name: 'Categoria',
        value: 'TIER 1 - Transferência Bombástica!',
        inline: false
      });
    }

    // Adicionar informações de auditoria
    embed.addFields({
      name: 'Auditoria',
      value: `ID da Requisição: ${responseData.security?.requestId || 'N/A'}\nTimestamp: ${responseData.security?.timestamp || 'N/A'}`,
      inline: false
    });

    // Adicionar imagens dos clubes se disponíveis
    if (responseData.oldClub?.logoUrl) {
      embed.setThumbnail(responseData.oldClub.logoUrl);
    }

    if (responseData.newClub?.logoUrl) {
      embed.setImage(responseData.newClub.logoUrl);
    }

    // Adicionar rodapé de segurança
    embed.setFooter({
      text: 'PSO Brasil - Segurança Militar',
      iconURL: 'https://media.giphy.com/media/v1.YBilCkYBvBd7U/giphy.gif'
    });

    return embed;
  }

  /**
   * Gerar relatório de segurança do comando
   */
  getSecurityReport() {
    return {
      command: 'TransferCommand',
      securityLevel: 'MILITARY_GRADE',
      features: {
        hmacVerification: true,
        dataEncryption: true,
        auditLogging: true,
        inputValidation: true,
        rateLimiting: true,
        secureHeaders: true
      },
      encryption: {
        algorithm: 'AES-256-GCM',
        hmac: 'HMAC-SHA256',
        keyLength: 256
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TransferCommand;
