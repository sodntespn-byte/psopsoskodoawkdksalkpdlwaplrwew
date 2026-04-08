// Cliente JavaScript para atualização de classificação em tempo real

class StandingsManager {
  constructor() {
    this.socket = null;
    this.currentLeague = null;
    this.currentSeason = null;
    this.callbacks = new Map();
  }

  /**
   * Inicializa conexão WebSocket
   * @param {string} serverUrl - URL do servidor WebSocket
   */
  initializeWebSocket(serverUrl = 'http://localhost:3000') {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    // Event listeners
    this.socket.on('connect', () => {
      console.log('Conectado ao servidor WebSocket');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado do servidor WebSocket');
      this.emit('disconnected');
    });

    this.socket.on('standings-updated', (data) => {
      console.log('Classificação atualizada:', data);
      this.emit('standings-updated', data);
    });

    this.socket.on('match-finished', (data) => {
      console.log('Partida finalizada:', data);
      this.emit('match-finished', data);
    });

    this.socket.on('current-standings', (data) => {
      console.log('Classificação recebida:', data);
      this.emit('current-standings', data);
    });

    this.socket.on('live-match-update', (data) => {
      console.log('Atualização de partida ao vivo:', data);
      this.emit('live-match-update', data);
    });

    this.socket.on('error', (error) => {
      console.error('Erro no WebSocket:', error);
      this.emit('error', error);
    });

    return this.socket;
  }

  /**
   * Entra em uma sala de liga para receber atualizações
   * @param {string} leagueId - ID da liga
   * @param {string} season - Temporada
   */
  joinLeague(leagueId, season) {
    if (!this.socket) {
      throw new Error('WebSocket não inicializado');
    }

    this.currentLeague = leagueId;
    this.currentSeason = season;

    this.socket.emit('join-league', leagueId);
    this.socket.emit('get-standings', { leagueId, season });
  }

  /**
   * Atualiza resultado de partida
   * @param {string} matchId - ID da partida
   * @param {number} homeScore - Gols do time mandante
   * @param {number} awayScore - Gols do time visitante
   */
  async updateMatchResult(matchId, homeScore, awayScore) {
    try {
      const response = await fetch(`/api/matches/${matchId}/update-standings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          homeScore,
          awayScore
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      console.log('Resultado atualizado com sucesso:', result.data);
      this.emit('match-updated', result.data);

      return result.data;
    } catch (error) {
      console.error('Erro ao atualizar resultado:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Busca classificação atual
   * @param {string} leagueId - ID da liga
   * @param {string} season - Temporada
   * @param {Object} options - Opções de busca
   */
  async getStandings(leagueId, season, options = {}) {
    try {
      const params = new URLSearchParams({
        season: season || this.currentSeason,
        limit: options.limit || 20,
        offset: options.offset || 0
      });

      const response = await fetch(`/api/leagues/${leagueId}/standings?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar classificação:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Registra callback para eventos
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função callback
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  /**
   * Emite evento
   * @param {string} event - Nome do evento
   * @param {*} data - Dados do evento
   */
  emit(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro no callback do evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Desconecta do WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks.clear();
  }
}

// Exemplo de uso
const standingsManager = new StandingsManager();

// Configurar eventos
standingsManager.on('connected', () => {
  console.log('Conectado ao servidor de classificação!');
});

standingsManager.on('standings-updated', (data) => {
  console.log('Classificação atualizada:', data);
  updateUI(data.standings);
});

standingsManager.on('match-finished', (data) => {
  console.log('Partida finalizada:', data);
  showMatchResult(data.match);
});

standingsManager.on('error', (error) => {
  console.error('Erro:', error);
  showError(error.message);
});

// Funções de UI
function updateUI(standings) {
  const tableBody = document.getElementById('standings-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  
  standings.forEach((team, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${team.position}</td>
      <td>
        <img src="${team.team.logoUrl}" alt="${team.team.name}" class="w-6 h-6 mr-2">
        ${team.team.name}
      </td>
      <td>${team.points}</td>
      <td>${team.matchesPlayed}</td>
      <td>${team.wins}-${team.draws}-${team.losses}</td>
      <td>${team.goalsFor}</td>
      <td>${team.goalsAgainst}</td>
      <td>${team.goalDifference}</td>
      <td>${team.recentForm}</td>
    `;
    tableBody.appendChild(row);
  });
}

function showMatchResult(match) {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
  notification.innerHTML = `
    <h4 class="font-bold">Partida Finalizada!</h4>
    <p>${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}</p>
    <p class="text-sm">Vencedor: ${match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam}</p>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
  errorDiv.innerHTML = `
    <h4 class="font-bold">Erro!</h4>
    <p>${message}</p>
  `;
  
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Função para atualizar resultado de partida
async function updateMatchResult(matchId, homeScore, awayScore) {
  try {
    await standingsManager.updateMatchResult(matchId, homeScore, awayScore);
    console.log('Resultado atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar resultado:', error);
  }
}

// Inicialização quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar WebSocket
  standingsManager.initializeWebSocket();
  
  // Entrar na liga padrão
  const leagueId = 'default-league-id';
  const season = '2024';
  
  standingsManager.joinLeague(leagueId, season);
});

// Export para uso global
window.standingsManager = standingsManager;
window.updateMatchResult = updateMatchResult;
