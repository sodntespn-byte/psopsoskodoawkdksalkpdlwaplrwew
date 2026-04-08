const { Client, GatewayIntentBits, Collection, REST, Routes, ShardingManager } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const { getEncryptionManager } = require('../lib/encryption');
const path = require('path');
const fs = require('fs');

/**
 * PSO Brasil Discord Bot - Main Handler with Sharding and Caching
 * Versão 3.0 - Sistema Configurável e Escalável
 */

class PSODiscordBot {
  constructor() {
    this.client = null;
    this.prisma = null;
    this.encryptionManager = null;
    this.commands = new Collection();
    this.cooldowns = new Collection();
    
    // Sistema de Cache
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutos
    this.configCache = new Map();
    this.configCacheTTL = 10 * 60 * 1000; // 10 minutos
    
    // Rate Limiting por usuário
    this.userRateLimits = new Map();
    this.rateLimitWindow = 60 * 1000; // 1 minuto
    this.maxCommandsPerWindow = 10;
    
    // Logging
    this.logBuffer = [];
    this.logFlushInterval = 30 * 1000; // 30 segundos
    
    // WebSocket para comunicação com site
    this.io = null;
  }

  /**
   * Inicializar o bot
   */
  async initialize() {
    console.log('[PSO-BOT] Inicializando PSO Brasil Discord Bot v3.0...');
    
    // Inicializar Prisma
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
    
    // Inicializar Encryption Manager
    this.encryptionManager = getEncryptionManager();
    
    // Configurar cliente Discord
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ],
      presence: {
        status: 'online',
        activities: [{
          name: 'PSO Brasil - Gestão de Liga',
          type: 3 // Watching
        }]
      }
    });
    
    // Carregar comandos
    await this.loadCommands();
    
    // Configurar eventos
    this.setupEventHandlers();
    
    // Iniciar flush de logs
    this.startLogFlush();
    
    // Iniciar limpeza de cache
    this.startCacheCleanup();
    
    console.log('[PSO-BOT] Inicialização concluída!');
    
    return this.client;
  }

  /**
   * Carregar comandos do bot
   */
  async loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    console.log(`[PSO-BOT] Carregando ${commandFiles.length} comandos...`);
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        this.commands.set(command.data.name, command);
        console.log(`[PSO-BOT] Comando carregado: ${command.data.name}`);
      } else {
        console.warn(`[PSO-BOT] Comando ${file} não tem propriedade 'data' ou 'execute'`);
      }
    }
  }

  /**
   * Configurar handlers de eventos
   */
  setupEventHandlers() {
    // Ready
    this.client.once('ready', async () => {
      console.log(`[PSO-BOT] Bot logado como ${this.client.user.tag}`);
      console.log(`[PSO-BOT] Servidores: ${this.client.guilds.cache.size}`);
      
      // Registrar comandos slash
      await this.registerSlashCommands();
      
      // Inicializar configurações dos servidores
      await this.initializeGuildConfigs();
    });
    
    // Interaction Create
    this.client.on('interactionCreate', async (interaction) => {
      await this.handleInteraction(interaction);
    });
    
    // Guild Create (novo servidor)
    this.client.on('guildCreate', async (guild) => {
      console.log(`[PSO-BOT] Novo servidor: ${guild.name} (${guild.id})`);
      await this.createGuildConfig(guild);
    });
    
    // Guild Delete (servidor removido)
    this.client.on('guildDelete', async (guild) => {
      console.log(`[PSO-BOT] Servidor removido: ${guild.name} (${guild.id})`);
    });
    
    // Error handling
    this.client.on('error', (error) => {
      console.error('[PSO-BOT] Erro do cliente:', error);
    });
    
    this.client.on('warn', (warning) => {
      console.warn('[PSO-BOT] Aviso:', warning);
    });
    
    process.on('unhandledRejection', (error) => {
      console.error('[PSO-BOT] Rejeição não tratada:', error);
    });
  }

  /**
   * Registrar comandos slash
   */
  async registerSlashCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    
    const commandsData = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
    
    try {
      console.log(`[PSO-BOT] Registrando ${commandsData.length} comandos slash...`);
      
      // Global commands
      await rest.put(
        Routes.applicationCommands(this.client.user.id),
        { body: commandsData }
      );
      
      console.log('[PSO-BOT] Comandos slash registrados com sucesso!');
    } catch (error) {
      console.error('[PSO-BOT] Erro ao registrar comandos:', error);
    }
  }

  /**
   * Inicializar configurações dos servidores
   */
  async initializeGuildConfigs() {
    for (const guild of this.client.guilds.cache.values()) {
      await this.createGuildConfig(guild);
    }
  }

  /**
   * Criar configuração para um servidor
   */
  async createGuildConfig(guild) {
    try {
      const existingConfig = await this.prisma.serverConfig.findUnique({
        where: { guildId: guild.id }
      });
      
      if (!existingConfig) {
        await this.prisma.serverConfig.create({
          data: {
            guildId: guild.id,
            guildName: guild.name,
            leagueStatus: 'CLOSED',
            currentSeason: '2024',
            adminRoleIds: [],
            modRoleIds: []
          }
        });
        console.log(`[PSO-BOT] Configuração criada para: ${guild.name}`);
      }
    } catch (error) {
      console.error(`[PSO-BOT] Erro ao criar config para ${guild.name}:`, error);
    }
  }

  /**
   * Handler de interações
   */
  async handleInteraction(interaction) {
    // Rate limiting
    if (!this.checkRateLimit(interaction.user.id)) {
      await interaction.reply({
        content: 'Você está enviando comandos rápido demais. Aguarde um momento.',
        ephemeral: true
      });
      return;
    }
    
    // Verificar se é comando
    if (!interaction.isChatInputCommand()) {
      // Verificar se é select menu ou modal
      if (interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
        await this.handleComponentInteraction(interaction);
      }
      return;
    }
    
    const command = this.commands.get(interaction.commandName);
    
    if (!command) {
      console.warn(`[PSO-BOT] Comando não encontrado: ${interaction.commandName}`);
      return;
    }
    
    // Verificar permissões
    const hasPermission = await this.checkPermissions(interaction, command);
    if (!hasPermission) {
      await interaction.reply({
        content: 'Você não tem permissão para usar este comando.',
        ephemeral: true
      });
      return;
    }
    
    // Cooldown
    const cooldownKey = `${interaction.user.id}-${command.data.name}`;
    if (this.cooldowns.has(cooldownKey)) {
      const expirationTime = this.cooldowns.get(cooldownKey);
      if (Date.now() < expirationTime) {
        const timeLeft = (expirationTime - Date.now()) / 1000;
        await interaction.reply({
          content: `Aguarde ${timeLeft.toFixed(1)} segundos antes de usar este comando novamente.`,
          ephemeral: true
        });
        return;
      }
    }
    
    // Definir cooldown
    const cooldownAmount = (command.cooldown || 3) * 1000;
    this.cooldowns.set(cooldownKey, Date.now() + cooldownAmount);
    setTimeout(() => this.cooldowns.delete(cooldownKey), cooldownAmount);
    
    // Executar comando
    try {
      await command.execute(interaction, this);
      
      // Log da ação
      await this.logAction(interaction, command.data.name, 'SUCCESS');
      
    } catch (error) {
      console.error(`[PSO-BOT] Erro ao executar comando ${command.data.name}:`, error);
      
      await this.logAction(interaction, command.data.name, 'FAILED', error.message);
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'Ocorreu um erro ao executar este comando.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: 'Ocorreu um erro ao executar este comando.',
          ephemeral: true
        });
      }
    }
  }

  /**
   * Handler de componentes (select menus, modals)
   */
  async handleComponentInteraction(interaction) {
    const customId = interaction.customId;
    
    // Roteamento baseado no customId
    if (customId.startsWith('config_')) {
      const configHandler = require('./handlers/configHandler');
      await configHandler.handle(interaction, this);
    } else if (customId.startsWith('market_')) {
      const marketHandler = require('./handlers/marketHandler');
      await marketHandler.handle(interaction, this);
    } else if (customId.startsWith('match_')) {
      const matchHandler = require('./handlers/matchHandler');
      await matchHandler.handle(interaction, this);
    }
  }

  /**
   * Verificar permissões do usuário
   */
  async checkPermissions(interaction, command) {
    // Comandos públicos não precisam de permissão especial
    if (command.public) return true;
    
    const member = interaction.member;
    const guildId = interaction.guild.id;
    
    // Buscar configuração do servidor
    const config = await this.getGuildConfig(guildId);
    
    if (!config) return false;
    
    // Verificar se é admin
    const adminRoles = config.adminRoleIds || [];
    const modRoles = config.modRoleIds || [];
    const allAllowedRoles = [...adminRoles, ...modRoles];
    
    const hasAllowedRole = member.roles.cache.some(role => 
      allAllowedRoles.includes(role.id)
    );
    
    // Verificar se é owner do servidor
    const isGuildOwner = interaction.guild.ownerId === interaction.user.id;
    
    return hasAllowedRole || isGuildOwner || interaction.user.id === process.env.BOT_OWNER_ID;
  }

  /**
   * Verificar rate limit
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.userRateLimits.get(userId);
    
    if (!userLimit) {
      this.userRateLimits.set(userId, {
        count: 1,
        resetTime: now + this.rateLimitWindow
      });
      return true;
    }
    
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + this.rateLimitWindow;
      return true;
    }
    
    if (userLimit.count >= this.maxCommandsPerWindow) {
      return false;
    }
    
    userLimit.count++;
    return true;
  }

  /**
   * Obter configuração do servidor (com cache)
   */
  async getGuildConfig(guildId) {
    // Verificar cache
    const cached = this.configCache.get(guildId);
    if (cached && Date.now() - cached.timestamp < this.configCacheTTL) {
      return cached.data;
    }
    
    // Buscar do banco
    const config = await this.prisma.serverConfig.findUnique({
      where: { guildId }
    });
    
    if (config) {
      this.configCache.set(guildId, {
        data: config,
        timestamp: Date.now()
      });
    }
    
    return config;
  }

  /**
   * Atualizar configuração do servidor
   */
  async updateGuildConfig(guildId, data) {
    const updated = await this.prisma.serverConfig.update({
      where: { guildId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
    
    // Atualizar cache
    this.configCache.set(guildId, {
      data: updated,
      timestamp: Date.now()
    });
    
    return updated;
  }

  /**
   * Registrar ação no log
   */
  async logAction(interaction, command, status, errorMessage = null) {
    const logEntry = {
      guildId: interaction.guild?.id || 'DM',
      action: status === 'SUCCESS' ? `${command.toUpperCase()}_EXECUTED` : `${command.toUpperCase()}_FAILED`,
      command: command,
      userId: interaction.user.id,
      username: interaction.user.username,
      status: status,
      errorMessage: errorMessage,
      data: {
        channelId: interaction.channel?.id,
        options: interaction.options?.data
      },
      createdAt: new Date()
    };
    
    // Adicionar ao buffer
    this.logBuffer.push(logEntry);
    
    // Flush se buffer estiver grande
    if (this.logBuffer.length >= 10) {
      await this.flushLogs();
    }
  }

  /**
   * Flush dos logs para o banco
   */
  async flushLogs() {
    if (this.logBuffer.length === 0) return;
    
    try {
      await this.prisma.botLog.createMany({
        data: this.logBuffer
      });
      
      console.log(`[PSO-BOT] ${this.logBuffer.length} logs salvos`);
      this.logBuffer = [];
    } catch (error) {
      console.error('[PSO-BOT] Erro ao salvar logs:', error);
    }
  }

  /**
   * Iniciar flush automático de logs
   */
  startLogFlush() {
    setInterval(() => {
      this.flushLogs();
    }, this.logFlushInterval);
  }

  /**
   * Limpeza automática de cache
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      
      // Limpar config cache
      for (const [key, value] of this.configCache.entries()) {
        if (now - value.timestamp > this.configCacheTTL) {
          this.configCache.delete(key);
        }
      }
      
      // Limpar cache geral
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheTTL) {
          this.cache.delete(key);
        }
      }
    }, this.cacheTTL);
  }

  /**
   * Notificar site via WebSocket
   */
  notifyWebsite(event, data) {
    if (this.io) {
      this.io.emit(event, data);
      console.log(`[PSO-BOT] Evento enviado ao site: ${event}`);
    }
  }

  /**
   * Definir instância do Socket.IO
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Conectar ao Discord
   */
  async login() {
    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('[PSO-BOT] Erro ao fazer login:', error);
      throw error;
    }
  }

  /**
   * Desconectar
   */
  async destroy() {
    await this.flushLogs();
    await this.prisma.$disconnect();
    await this.client.destroy();
  }
}

module.exports = PSODiscordBot;
