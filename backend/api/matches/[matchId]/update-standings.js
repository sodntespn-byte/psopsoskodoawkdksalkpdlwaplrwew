const { updateStandings, invalidateCache } = require('../../lib/standings');

/**
 * API Route para atualizar classificação após resultado de partida
 * POST /api/matches/[matchId]/update-standings
 * 
 * Body esperado:
 * {
 *   "homeScore": number,
 *   "awayScore": number
 * }
 */
module.exports = async (req, res) => {
  // Verificar método HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido. Use POST.'
    });
  }

  try {
    const { matchId } = req.query;
    const { homeScore, awayScore } = req.body;

    // Validação dos dados de entrada
    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'ID da partida é obrigatório'
      });
    }

    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Placar deve conter números válidos'
      });
    }

    if (homeScore < 0 || awayScore < 0) {
      return res.status(400).json({
        success: false,
        message: 'Placar não pode ser negativo'
      });
    }

    // Buscar a partida para obter informações necessárias
    const { PrismaClient } = require('../../lib/prisma');
    const prisma = new PrismaClient();

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true
      }
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Partida não encontrada'
      });
    }

    if (match.status === 'FINISHED') {
      return res.status(400).json({
        success: false,
        message: 'Esta partida já foi finalizada'
      });
    }

    // Atualizar classificação
    const result = await updateStandings({
      matchId,
      homeScore,
      awayScore,
      leagueId: match.leagueId
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Invalidar cache para atualizar páginas estáticas
    try {
      await invalidateCache(match.leagueId, match.league.season);
    } catch (cacheError) {
      console.error('Erro ao invalidar cache:', cacheError);
      // Não falhar a requisição se cache falhar
    }

    // Enviar notificação via WebSocket se disponível
    try {
      const io = req.app.get('io');
      if (io) {
        // Broadcast para todos os clientes conectados
        io.emit('standings-updated', {
          leagueId: match.leagueId,
          season: match.league.season,
          standings: result.data.standings,
          match: result.data.match
        });

        // Broadcast específico para a liga
        io.to(`league-${match.leagueId}`).emit('match-finished', {
          match: result.data.match,
          standings: result.data.standings
        });
      }
    } catch (wsError) {
      console.error('Erro ao enviar notificação WebSocket:', wsError);
    }

    // Retornar sucesso
    res.status(200).json({
      success: true,
      message: 'Classificação atualizada com sucesso',
      data: result.data
    });

  } catch (error) {
    console.error('Erro na API de atualização de classificação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Fechar conexão Prisma se necessário
    if (typeof prisma !== 'undefined') {
      await prisma.$disconnect();
    }
  }
};
