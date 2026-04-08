const { PrismaClient } = require('../../lib/prisma');

/**
 * API Route para buscar transferências
 * GET /api/transfers
 * 
 * Query params:
 * - limit: Limite de transferências (padrão: 20)
 * - offset: Offset para paginação (padrão: 0)
 * - season: Filtrar por temporada (opcional)
 * - clubId: Filtrar por clube (opcional)
 * - active: Apenas transferências ativas (padrão: true)
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
    const { 
      limit = 20, 
      offset = 0, 
      season, 
      clubId, 
      active = true 
    } = req.query;

    // Configurar Prisma
    const prisma = new PrismaClient();

    // Construir where clause
    const whereClause = {
      isActive: active === 'true'
    };

    // Adicionar filtro de temporada se especificado
    if (season) {
      whereClause.startSeason = season;
    }

    // Adicionar filtro de clube se especificado
    if (clubId) {
      whereClause.OR = [
        { oldClubId: clubId },
        { newClubId: clubId }
      ];
    }

    // Buscar transferências
    const transfers = await prisma.transfer.findMany({
      where: whereClause,
      include: {
        oldClub: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        },
        newClub: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: Math.min(parseInt(limit), 100), // Máximo 100
      skip: parseInt(offset)
    });

    // Adicionar informações adicionais
    const enhancedTransfers = transfers.map(transfer => ({
      ...transfer,
      isFreeAgent: !transfer.oldClubId,
      formattedSalary: `R$ ${transfer.salary.toFixed(1)}M`,
      formattedFee: `R$ ${transfer.feePaid.toFixed(1)}M`,
      formattedReleaseClause: transfer.releaseClause 
        ? `R$ ${transfer.releaseClause.toFixed(1)}M` 
        : 'Sem cláusula',
      announcement: `@${transfer.playerName} é o novo reforço do ${transfer.newClub.name}!`,
      contractId: `#${transfer.id.slice(-8).toUpperCase()}`,
      formattedDate: new Date(transfer.timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      tier: this.calculateTransferTier(transfer.feePaid),
      isRecent: new Date() - new Date(transfer.timestamp) < 7 * 24 * 60 * 60 * 1000 // 7 dias
    }));

    // Calcular estatísticas
    const stats = await calculateTransferStats(prisma, whereClause);

    // Retornar resposta
    res.status(200).json({
      success: true,
      message: 'Transferências encontradas com sucesso',
      data: {
        transfers: enhancedTransfers,
        stats,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: enhancedTransfers.length,
          hasMore: enhancedTransfers.length === parseInt(limit)
        },
        filters: {
          season: season || 'todas',
          clubId: clubId || 'todos',
          active: active === 'true'
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro na API de transferências:', error);
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

/**
 * Calcular tier da transferência baseado no valor pago
 * @param {number} feePaid - Valor pago em milhões
 * @returns {string} - Tier da transferência
 */
function calculateTransferTier(feePaid) {
  if (feePaid >= 50) return 'TIER_1'; // Bombástico
  if (feePaid >= 20) return 'TIER_2'; // Expressivo
  if (feePaid >= 10) return 'TIER_3'; // Médio
  if (feePaid >= 5) return 'TIER_4'; // Baixo
  return 'TIER_5'; // Mínimo
}

/**
 * Calcular estatísticas das transferências
 * @param {PrismaClient} prisma - Cliente Prisma
 * @param {Object} whereClause - Filtros aplicados
 * @returns {Promise<Object>} - Estatísticas
 */
async function calculateTransferStats(prisma, whereClause) {
  try {
    // Total de transferências
    const totalTransfers = await prisma.transfer.count({
      where: whereClause
    });

    // Valor total gasto
    const transfersWithFee = await prisma.transfer.findMany({
      where: whereClause,
      select: { feePaid: true }
    });

    const totalSpent = transfersWithFee.reduce((sum, transfer) => sum + transfer.feePaid, 0);

    // Transferências por tier
    const tierStats = {};
    transfersWithFee.forEach(transfer => {
      const tier = calculateTransferTier(transfer.feePaid);
      tierStats[tier] = (tierStats[tier] || 0) + 1;
    });

    // Clubes mais ativos
    const clubStats = await prisma.transfer.groupBy({
      by: ['newClubId'],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: 'desc'
      },
      take: 5
    });

    // Buscar nomes dos clubes
    const clubIds = clubStats.map(stat => stat.newClubId);
    const clubs = await prisma.team.findMany({
      where: { id: { in: clubIds } },
      select: { id: true, name: true }
    });

    const mostActiveClubs = clubStats.map(stat => {
      const club = clubs.find(c => c.id === stat.newClubId);
      return {
        clubId: stat.newClubId,
        clubName: club?.name || 'Desconhecido',
        transfers: stat._count
      };
    });

    return {
      totalTransfers,
      totalSpent: `R$ ${totalSpent.toFixed(1)}M`,
      averageFee: totalTransfers > 0 ? `R$ ${(totalSpent / totalTransfers).toFixed(1)}M` : 'R$ 0M',
      tierStats,
      mostActiveClubs
    };

  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    return {
      totalTransfers: 0,
      totalSpent: 'R$ 0M',
      averageFee: 'R$ 0M',
      tierStats: {},
      mostActiveClubs: []
    };
  }
}
