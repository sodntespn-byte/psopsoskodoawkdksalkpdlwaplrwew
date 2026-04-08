/**
 * PSO Brasil - Health Monitor Module
 * Monitoramento ativo do site e banco de dados
 * Alertas automáticos para Discord
 */

const { EmbedBuilder } = require('discord.js');
const https = require('https');
const http = require('http');

class HealthMonitor {
  constructor(bot, prisma) {
    this.bot = bot;
    this.prisma = prisma;
    this.isRunning = false;
    this.interval = null;
    this.errors = [];
    this.maxErrors = 10;
    this.checkInterval = 5 * 60 * 1000; // 5 minutos
    this.siteUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.healthEndpoint = '/api/health';
    
    // Métricas
    this.metrics = {
      lastCheck: null,
      uptime: 0,
      responseTime: 0,
      databaseStatus: 'unknown',
      siteStatus: 'unknown',
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  /**
   * Iniciar monitoramento
   */
  start() {
    if (this.isRunning) {
      console.log('[HEALTH] Monitoramento já está rodando');
      return;
    }

    console.log('[HEALTH] Iniciando monitoramento ativo...');
    this.isRunning = true;
    
    // Verificação inicial
    this.performHealthCheck();
    
    // Configurar verificação periódica
    this.interval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
    
    console.log(`[HEALTH] Monitoramento iniciado - Intervalo: ${this.checkInterval / 1000}s`);
  }

  /**
   * Parar monitoramento
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isRunning = false;
    console.log('[HEALTH] Monitoramento parado');
  }

  /**
   * Verificação completa de saúde
   */
  async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      // Verificar site
      const siteStatus = await this.checkSiteHealth();
      
      // Verificar banco de dados
      const dbStatus = await this.checkDatabaseHealth();
      
      // Obter métricas do sistema
      const systemMetrics = this.getSystemMetrics();
      
      // Atualizar métricas
      this.metrics = {
        lastCheck: new Date(),
        uptime: process.uptime(),
        responseTime: Date.now() - startTime,
        databaseStatus: dbStatus,
        siteStatus: siteStatus,
        ...systemMetrics
      };

      // Verificar se há falhas críticas
      if (siteStatus === 'offline' || dbStatus === 'offline') {
        await this.sendCriticalAlert(siteStatus, dbStatus);
      }

      console.log(`[HEALTH] Check concluído - Site: ${siteStatus}, DB: ${dbStatus}, Tempo: ${this.metrics.responseTime}ms`);
      
    } catch (error) {
      console.error('[HEALTH] Erro na verificação de saúde:', error);
      await this.logError('HEALTH_CHECK_ERROR', error);
    }
  }

  /**
   * Verificar saúde do site
   */
  async checkSiteHealth() {
    return new Promise((resolve) => {
      const url = new URL(this.siteUrl + this.healthEndpoint);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        timeout: 10000, // 10 segundos timeout
        headers: {
          'User-Agent': 'PSO-Brasil-Health-Monitor/1.0'
        }
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve('online');
          } else {
            resolve(`error_${res.statusCode}`);
          }
        });
      });

      req.on('error', (error) => {
        resolve('offline');
      });

      req.on('timeout', () => {
        req.destroy();
        resolve('timeout');
      });

      req.end();
    });
  }

  /**
   * Verificar saúde do banco de dados
   */
  async checkDatabaseHealth() {
    try {
      // Query simples para testar conexão
      const result = await this.prisma.$queryRaw`SELECT 1 as test`;
      
      if (result && result.length > 0) {
        return 'online';
      } else {
        return 'error_no_data';
      }
    } catch (error) {
      console.error('[HEALTH] Erro na verificação do banco:', error.message);
      
      // Classificar tipo de erro
      if (error.message.includes('timeout')) {
        return 'timeout';
      } else if (error.message.includes('connection')) {
        return 'offline';
      } else {
        return 'error_query';
      }
    }
  }

  /**
   * Obter métricas do sistema
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      memoryUsage: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  /**
   * Enviar alerta crítico para Discord
   */
  async sendCriticalAlert(siteStatus, dbStatus) {
    try {
      // Buscar configuração do servidor
      const guilds = this.bot.client.guilds.cache;
      
      for (const guild of guilds.values()) {
        const config = await this.bot.getGuildConfig(guild.id);
        
        if (config && config.adminChannelId) {
          const channel = await guild.channels.fetch(config.adminChannelId);
          
          if (channel && channel.isTextBased()) {
            const embed = this.createCriticalAlertEmbed(siteStatus, dbStatus);
            await channel.send({ embeds: [embed] });
            console.log(`[HEALTH] Alerta crítico enviado para ${guild.name}`);
            break; // Enviar apenas para o primeiro servidor com canal configurado
          }
        }
      }
    } catch (error) {
      console.error('[HEALTH] Erro ao enviar alerta crítico:', error);
    }
  }

  /**
   * Criar embed de alerta crítico
   */
  createCriticalAlertEmbed(siteStatus, dbStatus) {
    const embed = new EmbedBuilder()
      .setTitle('Alerta Crítico - Sistema PSO Brasil')
      .setDescription('Falha detectada nos serviços do sistema')
      .setColor(0xdc2626) // Vermelho alerta
      .addFields(
        {
          name: 'Status do Site',
          value: this.getStatusIcon(siteStatus) + ' ' + this.getStatusText(siteStatus),
          inline: true
        },
        {
          name: 'Status do Banco',
          value: this.getStatusIcon(dbStatus) + ' ' + this.getStatusText(dbStatus),
          inline: true
        },
        {
          name: 'Timestamp',
          value: new Date().toLocaleString('pt-BR'),
          inline: false
        }
      )
      .setFooter({ text: 'Sistema de Monitoramento PSO Brasil' })
      .setTimestamp();

    return embed;
  }

  /**
   * Obter ícone de status (sem emojis)
   */
  getStatusIcon(status) {
    switch (status) {
      case 'online': return 'ONLINE';
      case 'offline': return 'OFFLINE';
      case 'timeout': return 'TIMEOUT';
      default: return 'ERROR';
    }
  }

  /**
   * Obter texto de status
   */
  getStatusText(status) {
    switch (status) {
      case 'online': return 'Funcionando';
      case 'offline': return 'Fora do ar';
      case 'timeout': return 'Timeout';
      case 'error_500': return 'Erro 500';
      case 'error_query': return 'Erro na query';
      default: return 'Erro desconhecido';
    }
  }

  /**
   * Log de erro
   */
  async logError(type, error) {
    const errorEntry = {
      id: Date.now().toString(),
      type,
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      severity: 'critical'
    };

    // Adicionar ao array de erros
    this.errors.unshift(errorEntry);
    
    // Manter apenas os últimos erros
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log no console
    console.error(`[HEALTH ERROR] ${type}: ${error.message}`);
  }

  /**
   * Obter métricas atuais
   */
  getMetrics() {
    return {
      ...this.metrics,
      errors: this.errors.slice(0, 3), // Últimos 3 erros
      isMonitoring: this.isRunning,
      checkInterval: this.checkInterval / 1000
    };
  }

  /**
   * Criar barra de progresso em texto
   */
  createProgressBar(percentage, total = 10) {
    const filled = Math.round((percentage / 100) * total);
    const empty = total - filled;
    return '[' + '|'.repeat(filled) + '-'.repeat(empty) + ']';
  }

  /**
   * Obter status de memória formatado
   */
  getMemoryStatus() {
    const memUsage = this.metrics.memoryUsage || {};
    const total = 512; // SquareCloud geralmente oferece 512MB
    const used = memUsage.heapUsed || 0;
    const percentage = Math.min((used / total) * 100, 100);
    
    return {
      used: used,
      total: total,
      percentage: percentage,
      bar: this.createProgressBar(percentage)
    };
  }
}

module.exports = HealthMonitor;
