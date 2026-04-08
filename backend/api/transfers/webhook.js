const { PrismaClient } = require('../../lib/prisma');
const { getEncryptionManager } = require('../../lib/encryption');
const { getSecurityManager } = require('../../lib/apiSecurity');
const { getAuditLogger } = require('../../lib/auditLogger');

/**
 * API Route para receber transferências via webhook com segurança militar
 * POST /api/transfers/webhook
 * 
 * Headers obrigatórios:
 * - X-Transfer-Secret: SECRET_KEY do .env
 * - X-Webhook-HMAC: HMAC SHA-256 da assinatura
 * - X-Webhook-Timestamp: Timestamp UNIX em segundos
 * 
 * Body esperado (criptografado):
 * {
 *   "playerName": "Nome do Jogador",
 *   "oldClub": "Nome do Clube Antigo" ou "VLOCE",
 *   "newClub": "Nome do Novo Clube",
 *   "duration": 24,
 *   "startSeason": "2024",
 *   "endSeason": "2026",
 *   "salary": 5.5,
 *   "releaseClause": 50.0,
 *   "feePaid": 25.0
 * }
 */

// Error handler global para webhook
let globalErrorHandler = null;

const setWebhookErrorHandler = (errorHandler) => {
  globalErrorHandler = errorHandler;
};

module.exports = async (req, res) => {
  // Obter instâncias de segurança
  const encryptionManager = getEncryptionManager();
  const securityManager = getSecurityManager();
  const auditLogger = getAuditLogger();
  
  // Contexto de auditoria
  const auditContext = {
    ip: securityManager.getClientIP(req),
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    requestId: securityManager.generateRequestId()
  };

  try {
    // 1. Verificar método HTTP
    if (req.method !== 'POST') {
      auditLogger.log('WARN', 'HTTP_METHOD_NOT_ALLOWED', { method: req.method }, auditContext);
      return res.status(405).json({
        success: false,
        error: 'Método não permitido. Use POST.',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    // 2. Aplicar middleware de segurança do webhook
    const securityMiddleware = securityManager.webhookSecurityMiddleware();
    
    // Criar um middleware wrapper para capturar o resultado
    let securityResult = { allowed: true };
    const originalNext = (err) => {
      if (err) {
        securityResult = { allowed: false, error: err.message };
      }
    };
    
    // Executar verificação de segurança
    await new Promise((resolve, reject) => {
      const mockReq = { ...req, headers: { ...req.headers } };
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            if (code !== 200) {
              securityResult = { allowed: false, error: data.error, code };
            }
            resolve();
          }
        }),
        setHeader: () => {}
      };
      
      securityMiddleware(mockReq, mockRes, originalNext);
    });

    if (!securityResult.allowed) {
      auditLogger.log('WARN', 'WEBHOOK_SECURITY_FAILED', securityResult, auditContext);
      return res.status(401).json({
        success: false,
        error: securityResult.error || 'Verificação de segurança falhou',
        code: securityResult.code || 'SECURITY_FAILED'
      });
    }

    // 3. Validar e sanitizar corpo da requisição
    if (!req.body || typeof req.body !== 'object') {
      auditLogger.log('ERROR', 'INVALID_REQUEST_BODY', { bodyType: typeof req.body }, auditContext);
      return res.status(400).json({
        success: false,
        error: 'Corpo da requisição inválido.',
        code: 'INVALID_BODY'
      });
    }

    // 4. Validar campos obrigatórios
    const requiredFields = ['playerName', 'newClub', 'duration', 'startSeason', 'endSeason', 'salary', 'feePaid'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      auditLogger.log('ERROR', 'MISSING_REQUIRED_FIELDS', { missingFields }, auditContext);
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios faltando.',
        missingFields,
        code: 'MISSING_FIELDS'
      });
    }

    // 5. Sanitizar e validar dados de entrada
    const sanitizedData = {
      playerName: encryptionManager.sanitize(req.body.playerName),
      oldClub: req.body.oldClub ? encryptionManager.sanitize(req.body.oldClub) : null,
      newClub: encryptionManager.sanitize(req.body.newClub),
      duration: parseInt(req.body.duration),
      startSeason: encryptionManager.sanitize(req.body.startSeason),
      endSeason: encryptionManager.sanitize(req.body.endSeason),
      salary: parseFloat(req.body.salary),
      releaseClause: req.body.releaseClause ? parseFloat(req.body.releaseClause) : null,
      feePaid: parseFloat(req.body.feePaid)
    };

    // 6. Validações adicionais
    const validationResult = validateTransferData(sanitizedData);
    if (!validationResult.valid) {
      auditLogger.log('ERROR', 'DATA_VALIDATION_FAILED', validationResult.errors, auditContext);
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos.',
        errors: validationResult.errors,
        code: 'VALIDATION_FAILED'
      });
    }

    // 7. Criptografar dados sensíveis antes de salvar
    const encryptedData = encryptionManager.encryptFields(sanitizedData, ['salary', 'feePaid', 'releaseClause']);

    // 8. Configurar Prisma com logging
    const prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ],
      errorFormat: 'pretty'
    });

    // 9. Buscar IDs dos times com validação adicional
    let oldClubId = null;
    let newClubId = null;

    try {
      // Buscar clube antigo se não for VLOCE
      if (sanitizedData.oldClub && sanitizedData.oldClub.toUpperCase() !== 'VLOCE') {
        const oldTeam = await prisma.team.findFirst({
          where: {
            name: {
              contains: sanitizedData.oldClub,
              mode: 'insensitive'
            }
          },
          select: { id: true, name: true }
        });

        if (!oldTeam) {
          auditLogger.log('ERROR', 'OLD_CLUB_NOT_FOUND', { oldClub: sanitizedData.oldClub }, auditContext);
          return res.status(400).json({
            success: false,
            error: `Clube antigo "${sanitizedData.oldClub}" não encontrado.`,
            code: 'OLD_CLUB_NOT_FOUND'
          });
        }

        oldClubId = oldTeam.id;
        auditLogger.log('INFO', 'OLD_CLUB_FOUND', { oldClubId, oldClubName: oldTeam.name }, auditContext);
      }

      // Buscar novo clube
      const newTeam = await prisma.team.findFirst({
        where: {
          name: {
            contains: sanitizedData.newClub,
            mode: 'insensitive'
          }
        },
        select: { id: true, name: true }
      });

      if (!newTeam) {
        auditLogger.log('ERROR', 'NEW_CLUB_NOT_FOUND', { newClub: sanitizedData.newClub }, auditContext);
        return res.status(400).json({
          success: false,
          error: `Novo clube "${sanitizedData.newClub}" não encontrado.`,
          code: 'NEW_CLUB_NOT_FOUND'
        });
      }

      newClubId = newTeam.id;
      auditLogger.log('INFO', 'NEW_CLUB_FOUND', { newClubId, newClubName: newTeam.name }, auditContext);

    } catch (dbError) {
      auditLogger.log('ERROR', 'DATABASE_QUERY_ERROR', { error: dbError.message }, auditContext);
      return res.status(500).json({
        success: false,
        error: 'Erro ao consultar banco de dados.',
        code: 'DATABASE_ERROR'
      });
    }

    // 10. Criar transferência com dados criptografados
    let transfer;
    try {
      transfer = await prisma.transfer.create({
        data: {
          playerName: encryptedData.playerName,
          oldClubId,
          newClubId,
          duration: encryptedData.duration,
          startSeason: encryptedData.startSeason,
          endSeason: encryptedData.endSeason,
          salary: encryptedData.salary,
          releaseClause: encryptedData.releaseClause,
          feePaid: encryptedData.feePaid
        },
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
        }
      });

      auditLogger.log('INFO', 'TRANSFER_CREATED', {
        transferId: transfer.id,
        playerName: sanitizedData.playerName,
        oldClub: sanitizedData.oldClub,
        newClub: sanitizedData.newClub,
        feePaid: sanitizedData.feePaid
      }, auditContext);

    } catch (createError) {
      auditLogger.log('ERROR', 'TRANSFER_CREATION_FAILED', { error: createError.message }, auditContext);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar transferência.',
        code: 'CREATION_FAILED'
      });
    }

    // 11. Descriptografar dados para resposta (apenas campos necessários)
    const decryptedTransfer = encryptionManager.decryptFields(transfer, ['salary', 'feePaid', 'releaseClause']);

    // 12. Formatar resposta segura
    const formattedTransfer = {
      id: transfer.id,
      playerName: decryptedTransfer.playerName,
      oldClub: transfer.oldClub,
      newClub: transfer.newClub,
      duration: decryptedTransfer.duration,
      startSeason: decryptedTransfer.startSeason,
      endSeason: decryptedTransfer.endSeason,
      salary: decryptedTransfer.salary,
      releaseClause: decryptedTransfer.releaseClause,
      feePaid: decryptedTransfer.feePaid,
      timestamp: transfer.timestamp,
      isActive: transfer.isActive,
      isFreeAgent: !transfer.oldClubId,
      formattedSalary: `R$ ${decryptedTransfer.salary.toFixed(1)}M`,
      formattedFee: `R$ ${decryptedTransfer.feePaid.toFixed(1)}M`,
      formattedReleaseClause: decryptedTransfer.releaseClause 
        ? `R$ ${decryptedTransfer.releaseClause.toFixed(1)}M` 
        : 'Sem cláusula',
      announcement: `@${decryptedTransfer.playerName} é o novo reforço do ${transfer.newClub.name}!`,
      contractId: `#${transfer.id.slice(-8).toUpperCase()}`,
      tier: calculateTransferTier(decryptedTransfer.feePaid)
    };

    // 13. Enviar notificação via WebSocket se disponível
    try {
      const io = req.app.get('io');
      if (io) {
        // Broadcast seguro (sem dados sensíveis)
        const safeNotification = {
          transfer: {
            id: formattedTransfer.id,
            playerName: formattedTransfer.playerName,
            oldClub: formattedTransfer.oldClub,
            newClub: formattedTransfer.newClub,
            announcement: formattedTransfer.announcement,
            contractId: formattedTransfer.contractId,
            tier: formattedTransfer.tier,
            timestamp: formattedTransfer.timestamp
          },
          timestamp: new Date().toISOString()
        };

        io.emit('new-transfer', safeNotification);
        io.to('transfers').emit('transfer-signed', safeNotification);
        
        auditLogger.log('INFO', 'WEBSOCKET_NOTIFICATION_SENT', { transferId: transfer.id }, auditContext);
      }
    } catch (wsError) {
      auditLogger.log('WARN', 'WEBSOCKET_NOTIFICATION_FAILED', { error: wsError.message }, auditContext);
    }

    // 14. Retornar sucesso
    auditLogger.log('INFO', 'WEBHOOK_PROCESSING_SUCCESS', {
      transferId: transfer.id,
      playerName: sanitizedData.playerName,
      tier: formattedTransfer.tier
    }, auditContext);

    res.status(201).json({
      success: true,
      message: 'Transferência registrada com sucesso!',
      data: formattedTransfer,
      security: {
        requestId: auditContext.requestId,
        timestamp: new Date().toISOString(),
        encryption: 'AES-256-GCM',
        integrity: 'verified'
      }
    });

  } catch (error) {
    console.error('Erro no webhook de transferências:', error);
    auditLogger.log('CRITICAL', 'WEBHOOK_PROCESSING_ERROR', { 
      error: error.message, 
      stack: error.stack 
    }, auditContext);
    
    // Capturar erro específico de webhook
    if (globalErrorHandler) {
      globalErrorHandler.handleSpecificError('WEBHOOK_ERROR', error, {
        requestId: auditContext.requestId,
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
        endpoint: '/api/transfers/webhook'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      requestId: auditContext.requestId
    });
  } finally {
    // 15. Fechar conexão Prisma
    try {
      if (typeof prisma !== 'undefined') {
        await prisma.$disconnect();
      }
    } catch (disconnectError) {
      console.error('Erro ao fechar conexão Prisma:', disconnectError);
    }
  }
};

/**
 * Validar dados da transferência
 * @param {Object} data - Dados validados
 * @returns {Object} Resultado da validação
 */
function validateTransferData(data) {
  const errors = [];

  // Validação do nome do jogador
  if (!data.playerName || data.playerName.length < 2) {
    errors.push('Nome do jogador deve ter pelo menos 2 caracteres.');
  }

  if (data.playerName.length > 100) {
    errors.push('Nome do jogador deve ter no máximo 100 caracteres.');
  }

  // Validação da duração
  if (isNaN(data.duration) || data.duration < 1 || data.duration > 120) {
    errors.push('Duração deve ser um número entre 1 e 120 meses.');
  }

  // Validação das temporadas
  if (!data.startSeason || !/^\d{4}$/.test(data.startSeason)) {
    errors.push('Temporada de início deve ter formato YYYY (ex: 2024).');
  }

  if (!data.endSeason || !/^\d{4}$/.test(data.endSeason)) {
    errors.push('Temporada de término deve ter formato YYYY (ex: 2026).');
  }

  if (parseInt(data.startSeason) > parseInt(data.endSeason)) {
    errors.push('Temporada de início não pode ser posterior à de término.');
  }

  // Validação do salário
  if (isNaN(data.salary) || data.salary < 0 || data.salary > 100) {
    errors.push('Salário deve ser um número entre 0 e 100 milhões.');
  }

  // Validação da taxa paga
  if (isNaN(data.feePaid) || data.feePaid < 0 || data.feePaid > 1000) {
    errors.push('Taxa paga deve ser um número entre 0 e 1000 milhões.');
  }

  // Validação da cláusula de rescisão
  if (data.releaseClause !== null) {
    if (isNaN(data.releaseClause) || data.releaseClause < 0 || data.releaseClause > 1000) {
      errors.push('Cláusula de rescisão deve ser um número entre 0 e 1000 milhões ou nula.');
    }
  }

  // Validação do clube antigo
  if (data.oldClub && data.oldClub.toUpperCase() !== 'VLOCE' && data.oldClub.length < 2) {
    errors.push('Nome do clube antigo deve ter pelo menos 2 caracteres ou ser "VLOCE".');
  }

  // Validação do novo clube
  if (!data.newClub || data.newClub.length < 2) {
    errors.push('Nome do novo clube deve ter pelo menos 2 caracteres.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calcular tier da transferência baseado no valor pago
 * @param {number} feePaid - Valor pago em milhões
 * @returns {string} - Tier da transferência
 */
function calculateTransferTier(feePaid) {
  if (feePaid >= 50) return 'TIER_1'; // Bombástico
  if (feePaid >= 20) return 'TIER_2'; // Expressivo
  if (feePaid >= 10) return 'TIER_3'; // Médio
  if (feePaid >= 5) return 'TIER_4'; // Moderado
  return 'TIER_5'; // Baixo
}

// Exportar função para configurar error handler
module.exports.setWebhookErrorHandler = setWebhookErrorHandler;
