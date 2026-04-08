const { Client, GatewayIntentBits } = require('discord.js');
const DiscordBot = require('./discord/bot');
const MatchManager = require('./discord/matchManager');
const WebhookManager = require('./discord/webhookManager');
const { setupWebSocket } = require('./middleware/websocket');

// Configuração
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

class PSODiscordController {
  constructor() {
    this.bot = null;
    this.matchManager = new MatchManager();
    this.webhookManager = new WebhookManager(DISCORD_WEBHOOK_URL);
    this.io = null;
  }

  /**
   * Inicializar o sistema completo
   */
  async initialize() {
    try {
      console.log('Iniciando PSO Discord Controller...');
      
      // 1. Inicializar bot Discord
      await this.initializeBot();
      
      // 2. Inicializar servidor WebSocket
      await this.initializeWebSocket();
      
      // 3. Testar webhook
      await this.testWebhook();
      
      console.log('Sistema PSO Discord Controller iniciado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao inicializar sistema:', error);
      process.exit(1);
    }
  }

  /**
   * Inicializar bot Discord
   */
  async initializeBot() {
    this.bot = new DiscordBot(DISCORD_TOKEN, DISCORD_WEBHOOK_URL);
    
    // Registrar comandos
    await this.bot.registerCommands();
    
    // Iniciar bot
    await this.bot.start();
    
    console.log('Bot Discord iniciado!');
  }

  /**
   * Inicializar servidor WebSocket
   */
  async initializeWebSocket() {
    const express = require('express');
    const { createServer } = require('http');
    
    const app = express();
    const server = createServer(app);
    
    // Configurar WebSocket
    this.io = setupWebSocket(server);
    
    // Configurar middleware
    app.use(express.json());
    
    // Rotas API
    this.setupAPIRoutes(app);
    
    // Iniciar servidor
    server.listen(PORT, () => {
      console.log(`Servidor WebSocket rodando na porta ${PORT}`);
    });
  }

  /**
   * Configurar rotas API
   */
  setupAPIRoutes(app) {
    // Rota para atualização via webhook externo
    app.post('/api/webhook/match-result', async (req, res) => {
      try {
        const { homeTeamName, awayTeamName, homeScore, awayScore, leagueId } = req.body;
        
        // Processar resultado
        const result = await this.matchManager.processMatchResult({
          homeTeamName,
          awayTeamName,
          homeScore,
          awayScore,
          leagueId
        });
        
        // Enviar notificação via WebSocket
        if (this.io) {
          this.io.to(`league-${leagueId}`).emit('match-finished', {
            match: result.match,
            standings: result.standings
          });
        }
        
        // Enviar webhook para Discord
        await this.webhookManager.sendSuccessNotification({
          type: 'match_result',
          matchData: result.match,
          leagueData: result.match.league
        });
        
        res.json({ success: true, data: result });
        
      } catch (error) {
        console.error('Erro ao processar webhook:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Rota para atualizar foto de time
    app.post('/api/webhook/update-photo', async (req, res) => {
      try {
        const { teamName, photoUrl } = req.body;
        
        // Atualizar foto
        const team = await this.matchManager.updateTeamPhoto(teamName, photoUrl);
        
        // Enviar notificação via WebSocket
        if (this.io) {
          this.io.emit('team-photo-updated', {
            team,
            photoUrl
          });
        }
        
        // Enviar webhook para Discord
        await this.webhookManager.sendSuccessNotification({
          type: 'team_photo_updated',
          teamData: team
        });
        
        res.json({ success: true, data: team });
        
      } catch (error) {
        console.error('Erro ao atualizar foto:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Rota para definir ordem das ligas
    app.post('/api/webhook/set-league-order', async (req, res) => {
      try {
        const { leagueOrder } = req.body;
        
        // Atualizar ordem
        await this.matchManager.setLeagueOrder(leagueOrder);
        
        // Enviar notificação via WebSocket
        if (this.io) {
          this.io.emit('league-order-updated', { leagueOrder });
        }
        
        // Enviar webhook para Discord
        await this.webhookManager.sendSuccessNotification({
          type: 'league_order_updated',
          leagueData: leagueOrder
        });
        
        res.json({ success: true, data: { leagueOrder } });
        
      } catch (error) {
        console.error('Erro ao definir ordem:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Rota de saúde
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          discord: this.bot ? 'online' : 'offline',
          websocket: this.io ? 'online' : 'offline',
          webhook: DISCORD_WEBHOOK_URL ? 'configured' : 'not configured'
        }
      });
    });
  }

  /**
   * Testar webhook
   */
  async testWebhook() {
    try {
      const success = await this.webhookManager.testWebhook();
      
      if (success) {
        console.log('Webhook testado com sucesso!');
      } else {
        console.warn('Webhook não respondeu ao teste');
      }
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
    }
  }

  /**
   * Encerrar sistema
   */
  async shutdown() {
    try {
      console.log('Encerrando PSO Discord Controller...');
      
      // Encerrar bot
      if (this.bot) {
        await this.bot.shutdown();
      }
      
      // Encerrar match manager
      if (this.matchManager) {
        await this.matchManager.disconnect();
      }
      
      // Encerrar webhook manager
      if (this.webhookManager) {
        await this.webhookManager.disconnect();
      }
      
      console.log('Sistema encerrado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao encerrar sistema:', error);
    }
  }
}

// Inicializar sistema
const controller = new PSODiscordController();

// Tratamento de sinais
process.on('SIGINT', async () => {
  console.log('\nRecebido SIGINT. Encerrando sistema...');
  await controller.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nRecebido SIGTERM. Encerrando sistema...');
  await controller.shutdown();
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('uncaughtException', async (error) => {
  console.error('Erro não capturado:', error);
  await controller.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Rejeição não tratada:', reason);
  await controller.shutdown();
  process.exit(1);
});

// Inicializar
controller.initialize().catch(error => {
  console.error('Falha na inicialização:', error);
  process.exit(1);
});

module.exports = PSODiscordController;
