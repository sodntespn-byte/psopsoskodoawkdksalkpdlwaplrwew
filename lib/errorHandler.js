/**
 * PSO Brasil - Global Error Handler
 * Captura exceções críticas e envia para Discord
 */

const { EmbedBuilder } = require('discord.js');

class ErrorHandler {
  constructor(bot, prisma) {
    this.bot = bot;
    this.prisma = prisma;
    this.errorQueue = [];
    this.maxQueueSize = 50;
    this.isProcessing = false;
    this.criticalErrors = new Set([
      'ENCRYPTION_ERROR',
      'WEBHOOK_ERROR',
      'DATABASE_ERROR',
      'AUTHENTICATION_ERROR',
      'VALIDATION_ERROR',
      'SYSTEM_ERROR'
    ]);
  }

  /**
   * Inicializar handlers globais
   */
  initialize() {
    // Capturar exceções não tratadas
    process.on('uncaughtException', (error) => {
      this.handleCriticalError('UNCAUGHT_EXCEPTION', error, 'Exceção não capturada no processo');
    });

    // Capturar rejeições não tratadas
    process.on('unhandledRejection', (reason, promise) => {
      const error = new Error(`Unhandled Rejection: ${reason}`);
      error.stack = promise?.stack || error.stack;
      this.handleCriticalError('UNHANDLED_REJECTION', error, 'Rejeição não tratada na Promise');
    });

    // Capturar warnings do Node.js
    process.on('warning', (warning) => {
      this.handleWarning(warning);
    });

    console.log('[ERROR_HANDLER] Sistema de captura de erros inicializado');
  }

  /**
   * Capturar erro crítico
   */
  async handleCriticalError(type, error, context = '') {
    const errorData = {
      id: Date.now().toString(),
      type,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      severity: this.criticalErrors.has(type) ? 'critical' : 'high',
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    // Adicionar à fila
    this.errorQueue.unshift(errorData);
    
    // Limitar tamanho da fila
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(0, this.maxQueueSize);
    }

    // Log no console
    console.error(`[CRITICAL_ERROR] ${type}: ${error.message}`);
    console.error(`Context: ${context}`);
    console.error(`Stack: ${error.stack}`);

    // Salvar no banco se possível
    await this.saveErrorToDatabase(errorData);

    // Enviar para Discord
    await this.sendErrorToDiscord(errorData);

    // Tentar recuperação automática para certos erros
    await this.attemptRecovery(type, error);
  }

  /**
   * Capturar erro específico (AES-256-GCM, Webhook, etc)
   */
  async handleSpecificError(type, error, additionalData = {}) {
    const errorData = {
      id: Date.now().toString(),
      type,
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      severity: 'high',
      additionalData,
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    };

    // Adicionar à fila
    this.errorQueue.unshift(errorData);
    
    // Log no console
    console.error(`[SPECIFIC_ERROR] ${type}: ${error.message}`);
    
    // Salvar no banco
    await this.saveErrorToDatabase(errorData);
    
    // Enviar para Discord
    await this.sendErrorToDiscord(errorData);
  }

  /**
   * Capturar warning
   */
  handleWarning(warning) {
    console.warn(`[WARNING] ${warning.name}: ${warning.message}`);
    
    // Salvar warnings no banco para análise futura
    this.saveWarningToDatabase(warning);
  }

  /**
   * Salvar erro no banco de dados
   */
  async saveErrorToDatabase(errorData) {
    try {
      // Usar a tabela BotLog existente para registrar erros críticos
      await this.prisma.botLog.create({
        data: {
          guildId: 'SYSTEM', // Erro de sistema
          action: `ERROR_${errorData.type}`,
          command: 'SYSTEM_ERROR',
          userId: 'SYSTEM',
          username: 'SYSTEM',
          status: 'FAILED',
          errorMessage: errorData.message,
          data: {
            type: errorData.type,
            context: errorData.context,
            stack: errorData.stack?.substring(0, 1000), // Limitar tamanho
            process: errorData.process,
            additionalData: errorData.additionalData
          }
        }
      });
    } catch (dbError) {
      console.error('[ERROR_HANDLER] Falha ao salvar erro no banco:', dbError.message);
    }
  }

  /**
   * Salvar warning no banco
   */
  async saveWarningToDatabase(warning) {
    try {
      await this.prisma.botLog.create({
        data: {
          guildId: 'SYSTEM',
          action: 'WARNING',
          command: 'SYSTEM_WARNING',
          userId: 'SYSTEM',
          username: 'SYSTEM',
          status: 'PENDING',
          data: {
            name: warning.name,
            message: warning.message,
            stack: warning.stack?.substring(0, 500)
          }
        }
      });
    } catch (dbError) {
      console.error('[ERROR_HANDLER] Falha ao salvar warning no banco:', dbError.message);
    }
  }

  /**
   * Enviar erro para Discord
   */
  async sendErrorToDiscord(errorData) {
    try {
      // Buscar servidores com canal de admin configurado
      const guilds = this.bot.client.guilds.cache;
      
      for (const guild of guilds.values()) {
        const config = await this.bot.getGuildConfig(guild.id);
        
        if (config && config.adminChannelId) {
          const channel = await guild.channels.fetch(config.adminChannelId);
          
          if (channel && channel.isTextBased()) {
            const embed = this.createErrorEmbed(errorData);
            await channel.send({ embeds: [embed] });
            
            // Enviar apenas para o primeiro servidor com canal configurado
            console.log(`[ERROR_HANDLER] Erro enviado para Discord: ${guild.name}`);
            break;
          }
        }
      }
    } catch (discordError) {
      console.error('[ERROR_HANDLER] Falha ao enviar erro para Discord:', discordError.message);
    }
  }

  /**
   * Criar embed de erro para Discord
   */
  createErrorEmbed(errorData) {
    const isCritical = errorData.severity === 'critical';
    const color = isCritical ? 0xdc2626 : 0xf59e0b; // Vermelho alerta ou amarelo elétrico
    
    const embed = new EmbedBuilder()
      .setTitle(`Erro ${isCritical ? 'Crítico' : 'Alta Prioridade'} - Sistema PSO Brasil`)
      .setDescription(`Tipo: ${errorData.type}`)
      .setColor(color)
      .addFields(
        {
          name: 'Mensagem',
          value: this.truncateText(errorData.message, 200),
          inline: false
        },
        {
          name: 'Contexto',
          value: errorData.context || 'Não especificado',
          inline: true
        },
        {
          name: 'Severidade',
          value: errorData.severity.toUpperCase(),
          inline: true
        },
        {
          name: 'Timestamp',
          value: new Date(errorData.timestamp).toLocaleString('pt-BR'),
          inline: true
        }
      )
      .setFooter({ text: `ID: ${errorData.id} | PID: ${errorData.process.pid}` })
      .setTimestamp();

    // Adicionar informações do processo
    if (errorData.process) {
      embed.addFields({
        name: 'Processo',
        value: `Uptime: ${this.formatUptime(errorData.process.uptime * 1000)}\n` +
               `Memória: ${Math.round(errorData.process.memory.heapUsed / 1024 / 1024)}MB\n` +
               `Node.js: ${errorData.process.nodeVersion}`,
        inline: false
      });
    }

    // Adicionar dados adicionais se existirem
    if (errorData.additionalData && Object.keys(errorData.additionalData).length > 0) {
      embed.addFields({
        name: 'Dados Adicionais',
        value: this.formatAdditionalData(errorData.additionalData),
        inline: false
      });
    }

    // Adicionar stack trace truncado
    if (errorData.stack) {
      embed.addFields({
        name: 'Stack Trace (primeiras linhas)',
        value: '```' + this.truncateText(errorData.stack, 500) + '```',
        inline: false
      });
    }

    return embed;
  }

  /**
   * Tentar recuperação automática
   */
  async attemptRecovery(type, error) {
    switch (type) {
      case 'DATABASE_ERROR':
        // Tentar reconectar ao banco
        console.log('[RECOVERY] Tentando reconectar ao banco de dados...');
        try {
          await this.prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5s
          await this.prisma.$connect();
          console.log('[RECOVERY] Banco de dados reconectado com sucesso');
        } catch (reconnectError) {
          console.error('[RECOVERY] Falha na reconexão do banco:', reconnectError.message);
        }
        break;

      case 'ENCRYPTION_ERROR':
        // Limpar cache de criptografia
        console.log('[RECOVERY] Limpando cache de criptografia...');
        if (this.bot.encryptionManager) {
          this.bot.encryptionManager.clearCache?.();
        }
        break;

      case 'WEBHOOK_ERROR':
        // Limpar cache de webhooks
        console.log('[RECOVERY] Limpando cache de webhooks...');
        if (this.bot.webhookCache) {
          this.bot.webhookCache.clear();
        }
        break;

      default:
        // Para outros erros, apenas log
        console.log(`[RECOVERY] Nenhuma recuperação automática disponível para: ${type}`);
    }
  }

  /**
   * Obter erros recentes
   */
  getRecentErrors(limit = 10) {
    return this.errorQueue.slice(0, limit);
  }

  /**
   * Limpar fila de erros
   */
  clearErrorQueue() {
    this.errorQueue = [];
    console.log('[ERROR_HANDLER] Fila de erros limpa');
  }

  /**
   * Obter estatísticas de erros
   */
  getErrorStats() {
    const stats = {
      total: this.errorQueue.length,
      byType: {},
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      last24h: 0,
      last1h: 0
    };

    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    this.errorQueue.forEach(error => {
      // Por tipo
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Por severidade
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Por tempo
      const errorTime = new Date(error.timestamp).getTime();
      if (errorTime > oneHourAgo) stats.last1h++;
      if (errorTime > oneDayAgo) stats.last24h++;
    });

    return stats;
  }

  /**
   * Formatar uptime
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  }

  /**
   * Truncar texto
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Formatar dados adicionais
   */
  formatAdditionalData(data) {
    const formatted = [];
    for (const [key, value] of Object.entries(data)) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      formatted.push(`${key}: ${this.truncateText(valueStr, 100)}`);
    }
    return formatted.join('\n') || 'Nenhum dado adicional';
  }
}

module.exports = ErrorHandler;
