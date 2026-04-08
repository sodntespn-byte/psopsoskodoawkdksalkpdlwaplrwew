/**
 * PSO Brasil - Unified Server
 * Combina site + bot Discord em uma única aplicação
 * Otimizado para deploy na SquareCloud
 */

require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');

// Bot Discord
const PSODiscordBot = require('./bot/botHandler');

// API Routes
const matchRoutes = require('./api/matches/recent');
const transferRoutes = require('./api/transfers/index');
const webhookRoutes = require('./api/transfers/webhook');
const standingsRoutes = require('./api/leagues/[leagueId]/standings');

// Configurações
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Inicializar Express
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Inicializar Prisma
const prisma = new PrismaClient({
  log: NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

// Inicializar Bot Discord
const bot = new PSODiscordBot();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.socket.io"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(compression());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// API Routes
app.use('/api/matches/recent', matchRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/transfers/webhook', webhookRoutes);
app.use('/api/leagues/:leagueId/standings', standingsRoutes);

// API Dashboard - Bot Logs
app.get('/api/bot/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const filter = req.query.filter || 'ALL';
    
    const where = {};
    if (filter === 'SUCCESS') where.status = 'SUCCESS';
    if (filter === 'FAILED') where.status = 'FAILED';
    
    const logs = await prisma.botLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Dashboard - Bot Stats
app.get('/api/bot/stats', async (req, res) => {
  try {
    const [
      totalCommands,
      totalTransfers,
      totalMatches,
      successLogs,
      failedLogs
    ] = await Promise.all([
      prisma.botLog.count(),
      prisma.transfer.count(),
      prisma.match.count(),
      prisma.botLog.count({ where: { status: 'SUCCESS' } }),
      prisma.botLog.count({ where: { status: 'FAILED' } })
    ]);
    
    res.json({
      success: true,
      data: {
        totalCommands,
        totalTransfers,
        totalMatches,
        activeUsers: successLogs + failedLogs,
        botStatus: bot.client?.readyState === 0 ? 'ONLINE' : 'OFFLINE'
      }
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    bot: bot.client?.readyState === 0 ? 'ONLINE' : 'OFFLINE'
  });
});

// Pages Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'dashboard.html'));
});

app.get('/classificacao', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'classificacao.html'));
});

app.get('/transferencias', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'transferencias.html'));
});

app.get('/times', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'times.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'admin.html'));
});

// WebSocket
io.on('connection', (socket) => {
  console.log('[WS] Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('[WS] Cliente desconectado:', socket.id);
  });
  
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`[WS] Cliente ${socket.id} entrou na sala: ${room}`);
  });
});

// Set Socket.IO no bot para notificações
bot.setSocketIO(io);

// Iniciar servidor e bot
async function start() {
  try {
    // Verificar conexão com banco
    await prisma.$connect();
    console.log('[SERVER] Conectado ao PostgreSQL');
    
    // Inicializar bot Discord
    await bot.initialize();
    await bot.login();
    console.log('[SERVER] Bot Discord iniciado');
    
    // Iniciar HTTP server
    httpServer.listen(PORT, () => {
      console.log(`[SERVER] Servidor rodando na porta ${PORT}`);
      console.log(`[SERVER] Ambiente: ${NODE_ENV}`);
      console.log(`[SERVER] URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
    });
    
  } catch (error) {
    console.error('[SERVER] Erro ao iniciar:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SERVER] Encerrando...');
  
  await bot.destroy();
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('[SERVER] Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n[SERVER] Encerrando...');
  
  await bot.destroy();
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('[SERVER] Servidor encerrado');
    process.exit(0);
  });
});

start();
