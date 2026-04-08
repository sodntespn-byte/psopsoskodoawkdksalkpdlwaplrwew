/**
 * API Routes para Notícias - Módulo de Imprensa
 * GET /api/news - Listar notícias
 * GET /api/news/:id - Obter notícia específica
 * POST /api/news - Criar notícia (admin)
 * PUT /api/news/:id - Atualizar notícia (admin)
 * DELETE /api/news/:id - Deletar notícia (admin)
 */

const { PrismaClient } = require('../../lib/prisma');

const prisma = new PrismaClient();

/**
 * GET /api/news
 * Listar notícias com filtros e paginação
 */
module.exports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      featured,
      published = true
    } = req.query;

    // Construir filtros
    const where = {};
    
    if (published !== 'all') {
      where.published = published === 'true';
    }
    
    if (category && category !== 'ALL') {
      where.category = category;
    }
    
    if (featured) {
      where.featured = featured === 'true';
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { subtitle: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } }
      ];
    }

    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Buscar notícias
    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy: [
          { featured: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take,
        include: {
          _count: {
            select: { viewCount: true }
          }
        }
      }),
      prisma.news.count({ where })
    ]);

    // Incrementar view count para estatísticas
    if (news.length > 0) {
      await prisma.news.updateMany({
        where: { id: { in: news.map(n => n.id) } },
        data: { viewCount: { increment: 1 } }
      });
    }

    res.json({
      success: true,
      data: news,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[API_NEWS] Erro ao listar notícias:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * GET /api/news/:id
 * Obter notícia específica
 */
module.exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await prisma.news.findUnique({
      where: { id },
      include: {
        _count: {
          select: { viewCount: true }
        }
      }
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'Notícia não encontrada',
        code: 'NOT_FOUND'
      });
    }

    // Incrementar view count
    await prisma.news.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({
      success: true,
      data: { ...news, viewCount: news.viewCount + 1 }
    });

  } catch (error) {
    console.error('[API_NEWS] Erro ao obter notícia:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * POST /api/news
 * Criar nova notícia (admin)
 */
module.exports.create = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      content,
      coverImageUrl,
      category = 'GENERAL',
      tags = [],
      featured = false,
      published = true
    } = req.body;

    // Validação básica
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Título e conteúdo são obrigatórios',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validar categoria
    const validCategories = ['GENERAL', 'CHRONICLE', 'INTERVIEW', 'URGENT', 'ANALYSIS', 'HIGHLIGHTS', 'TRANSFER', 'MATCH_REPORT'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Categoria inválida',
        code: 'INVALID_CATEGORY'
      });
    }

    // Calcular tempo de leitura
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));

    // Criar notícia
    const news = await prisma.news.create({
      data: {
        title,
        subtitle,
        content,
        coverImageUrl,
        category,
        authorId: 'system', // Em produção, usar auth
        authorName: 'Sistema',
        published,
        featured,
        tags,
        readTime,
        publishedAt: published ? new Date() : null
      }
    });

    res.status(201).json({
      success: true,
      data: news,
      message: 'Notícia criada com sucesso'
    });

  } catch (error) {
    console.error('[API_NEWS] Erro ao criar notícia:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * PUT /api/news/:id
 * Atualizar notícia (admin)
 */
module.exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      content,
      coverImageUrl,
      category,
      tags,
      featured,
      published
    } = req.body;

    // Verificar se notícia existe
    const existingNews = await prisma.news.findUnique({
      where: { id }
    });

    if (!existingNews) {
      return res.status(404).json({
        success: false,
        error: 'Notícia não encontrada',
        code: 'NOT_FOUND'
      });
    }

    // Calcular tempo de leitura se conteúdo foi alterado
    let readTime = existingNews.readTime;
    if (content && content !== existingNews.content) {
      const wordsPerMinute = 200;
      const wordCount = content.split(/\s+/).length;
      readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    }

    // Atualizar notícia
    const news = await prisma.news.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(content && { content, readTime }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(category && { category }),
        ...(tags && { tags }),
        ...(featured !== undefined && { featured }),
        ...(published !== undefined && { 
          published,
          publishedAt: published && !existingNews.publishedAt ? new Date() : existingNews.publishedAt
        }),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: news,
      message: 'Notícia atualizada com sucesso'
    });

  } catch (error) {
    console.error('[API_NEWS] Erro ao atualizar notícia:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * DELETE /api/news/:id
 * Deletar notícia (admin)
 */
module.exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se notícia existe
    const existingNews = await prisma.news.findUnique({
      where: { id }
    });

    if (!existingNews) {
      return res.status(404).json({
        success: false,
        error: 'Notícia não encontrada',
        code: 'NOT_FOUND'
      });
    }

    // Deletar notícia
    await prisma.news.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Notícia deletada com sucesso'
    });

  } catch (error) {
    console.error('[API_NEWS] Erro ao deletar notícia:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * GET /api/news/stats
 * Estatísticas das notícias
 */
module.exports.getStats = async (req, res) => {
  try {
    const [
      totalNews,
      publishedNews,
      featuredNews,
      totalViews,
      categoryStats
    ] = await Promise.all([
      prisma.news.count(),
      prisma.news.count({ where: { published: true } }),
      prisma.news.count({ where: { featured: true } }),
      prisma.news.aggregate({ _sum: { viewCount: true } }),
      prisma.news.groupBy({
        by: ['category'],
        _count: { category: true },
        where: { published: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalNews,
        published: publishedNews,
        featured: featuredNews,
        totalViews: totalViews._sum.viewCount || 0,
        categories: categoryStats.reduce((acc, stat) => {
          acc[stat.category] = stat._count.category;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('[API_NEWS] Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};
