const { Server } = require('socket.io');

/**
 * Middleware para WebSocket - atualizações em tempo real
 * Configura servidor WebSocket para notificações de classificação
 */

function setupWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://seusite.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Armazenar conexões ativas por liga
  const leagueConnections = new Map();

  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Entrar em sala de liga específica
    socket.on('join-league', (leagueId) => {
      socket.join(`league-${leagueId}`);
      
      if (!leagueConnections.has(leagueId)) {
        leagueConnections.set(leagueId, new Set());
      }
      leagueConnections.get(leagueId).add(socket.id);
      
      console.log(`Cliente ${socket.id} entrou na liga ${leagueId}`);
      
      // Enviar classificação atual ao entrar
      sendCurrentStandings(socket, leagueId);
    });

    // Sair de sala de liga
    socket.on('leave-league', (leagueId) => {
      socket.leave(`league-${leagueId}`);
      
      if (leagueConnections.has(leagueId)) {
        leagueConnections.get(leagueId).delete(socket.id);
        
        if (leagueConnections.get(leagueId).size === 0) {
          leagueConnections.delete(leagueId);
        }
      }
      
      console.log(`Cliente ${socket.id} saiu da liga ${leagueId}`);
    });

    // Solicitar classificação atual
    socket.on('get-standings', async (data) => {
      const { leagueId, season } = data;
      await sendCurrentStandings(socket, leagueId, season);
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      
      // Remover de todas as ligas
      leagueConnections.forEach((connections, leagueId) => {
        connections.delete(socket.id);
        
        if (connections.size === 0) {
          leagueConnections.delete(leagueId);
        }
      });
    });

    // Erro
    socket.on('error', (error) => {
      console.error(`Erro no socket ${socket.id}:`, error);
    });
  });

  // Anexar io ao app para uso em outras rotas
  return io;
}

/**
 * Envia classificação atual para um cliente específico
 * @param {Object} socket - Socket do cliente
 * @param {string} leagueId - ID da liga
 * @param {string} season - Temporada (opcional)
 */
async function sendCurrentStandings(socket, leagueId, season) {
  try {
    const { getLeagueStandings } = require('../lib/standings');
    const standings = await getLeagueStandings(leagueId, season);
    
    socket.emit('current-standings', {
      leagueId,
      season,
      standings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao enviar classificação atual:', error);
    socket.emit('error', {
      message: 'Erro ao buscar classificação',
      error: error.message
    });
  }
}

/**
 * Broadcast de atualização de classificação para todos os clientes de uma liga
 * @param {Object} io - Instância do Socket.IO
 * @param {string} leagueId - ID da liga
 * @param {Object} data - Dados da atualização
 */
function broadcastStandingsUpdate(io, leagueId, data) {
  io.to(`league-${leagueId}`).emit('standings-updated', {
    ...data,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Broadcast de classificação para liga ${leagueId}:`, {
    clients: io.sockets.adapter.rooms.get(`league-${leagueId}`)?.size || 0,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast de resultado de partida
 * @param {Object} io - Instância do Socket.IO
 * @param {string} leagueId - ID da liga
 * @param {Object} matchData - Dados da partida
 */
function broadcastMatchResult(io, leagueId, matchData) {
  io.to(`league-${leagueId}`).emit('match-finished', {
    ...matchData,
    timestamp: new Date().toISOString()
  });
  
  // Também broadcast geral para home page
  io.emit('live-match-result', {
    leagueId,
    ...matchData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Notificação de partida ao vivo
 * @param {Object} io - Instância do Socket.IO
 * @param {string} leagueId - ID da liga
 * @param {Object} matchData - Dados da partida ao vivo
 */
function broadcastLiveMatch(io, leagueId, matchData) {
  io.to(`league-${leagueId}`).emit('live-match-update', {
    ...matchData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Estatísticas do WebSocket
 * @param {Object} io - Instância do Socket.IO
 */
function getWebSocketStats(io) {
  const stats = {
    connectedClients: io.engine.clientsCount,
    rooms: Array.from(io.sockets.adapter.rooms.keys()).length,
    timestamp: new Date().toISOString()
  };
  
  return stats;
}

module.exports = {
  setupWebSocket,
  sendCurrentStandings,
  broadcastStandingsUpdate,
  broadcastMatchResult,
  broadcastLiveMatch,
  getWebSocketStats
};
