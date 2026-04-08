const { PrismaClient } = require('../../lib/prisma');

/**
 * API Route para buscar resultados recentes
 * GET /api/matches/recent?leagueId=xxx&limit=10
 * 
 * Query params:
 * - leagueId: ID da liga (opcional)
 * - limit: Limite de resultados (padrão: 10)
 * - season: Temporada (opcional)
 */
module.exports = async (req, res) => {
  // Verificar método HTTP
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido. Use GET.'
    });
  }

  try {
    const { leagueId, limit = 10, season } = req.query;

    // Configurar Prisma
    const prisma = new PrismaClient();

    // Construir where clause
    const whereClause = {
      status: 'FINISHED'
    };

    // Adicionar filtro de liga se especificado
    if (leagueId) {
      whereClause.leagueId = leagueId;
    }

    // Adicionar filtro de temporada se especificado
    if (season) {
      whereClause.league = {
        season: season
      };
    }

    // Buscar partidas recentes
    const matches = await prisma.match.findMany({
      where: whereClause,
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            logoUrl: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            logoUrl: true
          }
        },
        league: {
          select: {
            id: true,
            name: true,
            season: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { matchDate: 'desc' }
      ],
      take: Math.min(parseInt(limit), 50) // Máximo 50 resultados
    });

    // Adicionar informações adicionais
    const enhancedMatches = matches.map(match => {
      const winner = match.homeScore > match.awayScore ? match.homeTeam.name :
                     match.homeScore < match.awayScore ? match.awayTeam.name : 'Empate';
      
      const isHomeWinner = match.homeScore > match.awayScore;
      const isDraw = match.homeScore === match.awayScore;

      return {
        ...match,
        winner,
        isHomeWinner,
        isDraw,
        goalDifference: Math.abs(match.homeScore - match.awayScore),
        totalGoals: match.homeScore + match.awayScore,
        formattedDate: new Date(match.matchDate).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    });

    // Retornar resposta
    res.status(200).json({
      success: true,
      message: 'Resultados recentes encontrados',
      data: {
        matches: enhancedMatches,
        total: enhancedMatches.length,
        filters: {
          leagueId: leagueId || 'todas',
          limit: parseInt(limit),
          season: season || 'todas'
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro na API de resultados recentes:', error);
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
