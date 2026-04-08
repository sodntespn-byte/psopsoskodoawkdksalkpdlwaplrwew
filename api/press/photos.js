/**
 * API Routes para Fotos - Módulo de Imprensa
 * GET /api/photos - Listar fotos
 * GET /api/photos/:id - Obter foto específica
 * POST /api/photos - Criar foto (admin)
 * PUT /api/photos/:id - Atualizar foto (admin)
 * DELETE /api/photos/:id - Deletar foto (admin)
 */

const { PrismaClient } = require('../../lib/prisma');

const prisma = new PrismaClient();

/**
 * GET /api/photos
 * Listar fotos com filtros e paginação
 */
module.exports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      featured,
      photographer
    } = req.query;

    // Construir filtros
    const where = {};
    
    if (category && category !== 'ALL') {
      where.category = category;
    }
    
    if (featured) {
      where.featured = featured === 'true';
    }
    
    if (photographer) {
      where.photographerName = { contains: photographer, mode: 'insensitive' };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Buscar fotos
    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        orderBy: [
          { featured: 'desc' },
          { eventDate: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take
      }),
      prisma.photo.count({ where })
    ]);

    res.json({
      success: true,
      data: photos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[API_PHOTOS] Erro ao listar fotos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * GET /api/photos/:id
 * Obter foto específica
 */
module.exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id }
    });

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: 'Foto não encontrada',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: photo
    });

  } catch (error) {
    console.error('[API_PHOTOS] Erro ao obter foto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * POST /api/photos
 * Criar nova foto (admin)
 */
module.exports.create = async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      photographerId,
      photographerName,
      category = 'GENERAL',
      tags = [],
      featured = false,
      resolution,
      fileSize,
      camera,
      settings,
      location,
      eventDate
    } = req.body;

    // Validação básica
    if (!title || !imageUrl || !photographerName) {
      return res.status(400).json({
        success: false,
        error: 'Título, URL da imagem e nome do fotógrafo são obrigatórios',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validar categoria
    const validCategories = ['GENERAL', 'MATCH_ACTION', 'CELEBRATION', 'STADIUM', 'PORTRAIT', 'TRAINING', 'PRESS_CONFERENCE', 'AWARD', 'BEHIND_SCENES'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Categoria inválida',
        code: 'INVALID_CATEGORY'
      });
    }

    // Validar URL da imagem
    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'URL da imagem inválida',
        code: 'INVALID_IMAGE_URL'
      });
    }

    // Criar foto
    const photo = await prisma.photo.create({
      data: {
        title,
        description,
        imageUrl,
        thumbnailUrl,
        photographerId: photographerId || 'system',
        photographerName,
        category,
        tags,
        featured,
        resolution,
        fileSize,
        camera,
        settings,
        location,
        eventDate: eventDate ? new Date(eventDate) : new Date()
      }
    });

    res.status(201).json({
      success: true,
      data: photo,
      message: 'Foto criada com sucesso'
    });

  } catch (error) {
    console.error('[API_PHOTOS] Erro ao criar foto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * PUT /api/photos/:id
 * Atualizar foto (admin)
 */
module.exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      category,
      tags,
      featured,
      resolution,
      fileSize,
      camera,
      settings,
      location,
      eventDate
    } = req.body;

    // Verificar se foto existe
    const existingPhoto = await prisma.photo.findUnique({
      where: { id }
    });

    if (!existingPhoto) {
      return res.status(404).json({
        success: false,
        error: 'Foto não encontrada',
        code: 'NOT_FOUND'
      });
    }

    // Atualizar foto
    const photo = await prisma.photo.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(imageUrl && { imageUrl }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(category && { category }),
        ...(tags && { tags }),
        ...(featured !== undefined && { featured }),
        ...(resolution && { resolution }),
        ...(fileSize && { fileSize }),
        ...(camera && { camera }),
        ...(settings && { settings }),
        ...(location && { location }),
        ...(eventDate && { eventDate: new Date(eventDate) }),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: photo,
      message: 'Foto atualizada com sucesso'
    });

  } catch (error) {
    console.error('[API_PHOTOS] Erro ao atualizar foto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * DELETE /api/photos/:id
 * Deletar foto (admin)
 */
module.exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se foto existe
    const existingPhoto = await prisma.photo.findUnique({
      where: { id }
    });

    if (!existingPhoto) {
      return res.status(404).json({
        success: false,
        error: 'Foto não encontrada',
        code: 'NOT_FOUND'
      });
    }

    // Deletar foto
    await prisma.photo.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Foto deletada com sucesso'
    });

  } catch (error) {
    console.error('[API_PHOTOS] Erro ao deletar foto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * GET /api/photos/stats
 * Estatísticas das fotos
 */
module.exports.getStats = async (req, res) => {
  try {
    const [
      totalPhotos,
      featuredPhotos,
      totalFileSize,
      categoryStats,
      photographerStats
    ] = await Promise.all([
      prisma.photo.count(),
      prisma.photo.count({ where: { featured: true } }),
      prisma.photo.aggregate({ _sum: { fileSize: true } }),
      prisma.photo.groupBy({
        by: ['category'],
        _count: { category: true }
      }),
      prisma.photo.groupBy({
        by: ['photographerName'],
        _count: { photographerName: true },
        orderBy: { _count: { photographerName: 'desc' } },
        take: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalPhotos,
        featured: featuredPhotos,
        totalFileSize: totalFileSize._sum.fileSize || 0,
        categories: categoryStats.reduce((acc, stat) => {
          acc[stat.category] = stat._count.category;
          return acc;
        }, {}),
        topPhotographers: photographerStats.map(stat => ({
          name: stat.photographerName,
          count: stat._count.photographerName
        }))
      }
    });

  } catch (error) {
    console.error('[API_PHOTOS] Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * GET /api/photos/featured
 * Obter fotos em destaque
 */
module.exports.getFeatured = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const photos = await prisma.photo.findMany({
      where: { featured: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: photos
    });

  } catch (error) {
    console.error('[API_PHOTOS] Erro ao obter fotos em destaque:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};
