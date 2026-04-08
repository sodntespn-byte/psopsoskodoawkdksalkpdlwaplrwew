const crypto = require('crypto');
const { getEncryptionManager } = require('./encryption');

/**
 * Sistema de Segurança de API com HMAC e Rate Limiting
 * Proteção militar contra ataques e violações
 */
class APISecurityManager {
  constructor() {
    this.encryptionManager = getEncryptionManager();
    
    // Configurações de Rate Limiting
    this.rateLimitConfig = {
      // Limites por IP
      ipLimits: {
        windowMs: 15 * 60 * 1000, // 15 minutos
        maxRequests: 100, // Máximo 100 requisições
        blockDuration: 30 * 60 * 1000 // Bloquear por 30 minutos
      },
      
      // Limites por endpoint específico
      endpointLimits: {
        '/api/transfers/webhook': {
          windowMs: 60 * 1000, // 1 minuto
          maxRequests: 10, // Máximo 10 transferências por minuto
          blockDuration: 5 * 60 * 1000 // Bloquear por 5 minutos
        },
        
        '/api/matches/update-standings': {
          windowMs: 60 * 1000, // 1 minuto
          maxRequests: 20, // Máximo 20 atualizações por minuto
          blockDuration: 2 * 60 * 1000 // Bloquear por 2 minutos
        }
      },
      
      // Limites globais
      globalLimits: {
        windowMs: 60 * 1000, // 1 minuto
        maxRequests: 1000, // Máximo 1000 requisições globais
        blockDuration: 60 * 1000 // Bloquear por 1 minuto
      }
    };
    
    // Armazenamento de Rate Limits
    this.rateLimitStore = new Map();
    this.blockedIPs = new Map();
    this.globalRequestCount = new Map();
    
    // Segredo HMAC para webhook
    this.webhookSecret = process.env.WEBHOOK_HMAC_SECRET || 'default-webhook-secret-change-in-production';
    
    // Configurações de segurança
    this.securityConfig = {
      maxPayloadSize: 10 * 1024 * 1024, // 10MB
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
      requestTimeout: 30 * 1000, // 30 segundos
      maxRetries: 3
    };
  }

  /**
   * Gerar HMAC para requisições
   * @param {Object} payload - Dados da requisição
   * @param {string} timestamp - Timestamp da requisição
   * @returns {string} HMAC SHA-256
   */
  generateHMAC(payload, timestamp) {
    const payloadString = JSON.stringify(payload);
    const dataToSign = `${payloadString}.${timestamp}`;
    
    return this.encryptionManager.hmac(dataToSign, this.webhookSecret);
  }

  /**
   * Verificar HMAC de requisição
   * @param {Object} payload - Dados da requisição
   * @param {string} timestamp - Timestamp da requisição
   * @param {string} providedHMAC - HMAC fornecido
   * @returns {boolean} Se HMAC é válido
   */
  verifyHMAC(payload, timestamp, providedHMAC) {
    try {
      // Validar timestamp (prevenir replay attacks)
      const requestTime = parseInt(timestamp);
      const now = Date.now();
      const timeWindow = 5 * 60 * 1000; // 5 minutos
      
      if (Math.abs(now - requestTime) > timeWindow) {
        console.warn('Timestamp fora da janela permitida:', {
          requestTime,
          now,
          difference: Math.abs(now - requestTime)
        });
        return false;
      }
      
      // Gerar HMAC esperado
      const expectedHMAC = this.generateHMAC(payload, timestamp);
      
      // Verificar usando timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(providedHMAC, 'hex'),
        Buffer.from(expectedHMAC, 'hex')
      );
      
    } catch (error) {
      console.error('Erro na verificação HMAC:', error);
      return false;
    }
  }

  /**
   * Middleware de segurança de API
   */
  securityMiddleware() {
    return (req, res, next) => {
      try {
        // 1. Verificar Rate Limiting
        const rateLimitResult = this.checkRateLimit(req);
        if (!rateLimitResult.allowed) {
          return this.sendRateLimitResponse(res, rateLimitResult);
        }
        
        // 2. Validar tamanho do payload
        if (req.headers['content-length']) {
          const contentLength = parseInt(req.headers['content-length']);
          if (contentLength > this.securityConfig.maxPayloadSize) {
            return res.status(413).json({
              success: false,
              error: 'Payload too large',
              maxSize: this.securityConfig.maxPayloadSize
            });
          }
        }
        
        // 3. Verificar CORS
        if (!this.validateOrigin(req)) {
          return res.status(403).json({
            success: false,
            error: 'Origin not allowed'
          });
        }
        
        // 4. Adicionar headers de segurança
        this.addSecurityHeaders(res);
        
        // 5. Log de segurança
        this.logSecurityEvent(req, 'request_allowed');
        
        next();
        
      } catch (error) {
        console.error('Erro no middleware de segurança:', error);
        res.status(500).json({
          success: false,
          error: 'Internal security error'
        });
      }
    };
  }

  /**
   * Middleware específico para webhook com HMAC
   */
  webhookSecurityMiddleware() {
    return (req, res, next) => {
      try {
        // 1. Verificar Rate Limiting específico para webhook
        const rateLimitResult = this.checkRateLimit(req, '/api/transfers/webhook');
        if (!rateLimitResult.allowed) {
          return this.sendRateLimitResponse(res, rateLimitResult);
        }
        
        // 2. Extrair headers HMAC
        const hmac = req.headers['x-webhook-hmac'];
        const timestamp = req.headers['x-webhook-timestamp'];
        
        if (!hmac || !timestamp) {
          return res.status(401).json({
            success: false,
            error: 'Missing HMAC headers',
            required: ['x-webhook-hmac', 'x-webhook-timestamp']
          });
        }
        
        // 3. Verificar HMAC
        const isValidHMAC = this.verifyHMAC(req.body, timestamp, hmac);
        if (!isValidHMAC) {
          this.logSecurityEvent(req, 'hmac_verification_failed', {
            hmac: hmac.substring(0, 16) + '...',
            timestamp,
            bodySize: JSON.stringify(req.body).length
          });
          
          return res.status(401).json({
            success: false,
            error: 'Invalid HMAC signature',
            code: 'HMAC_INVALID'
          });
        }
        
        // 4. Validar adicionalmente com SECRET_KEY (compatibilidade)
        const secretKey = req.headers['x-transfer-secret'];
        const expectedSecret = process.env.TRANSFER_SECRET_KEY;
        
        if (!secretKey || secretKey !== expectedSecret) {
          this.logSecurityEvent(req, 'secret_key_verification_failed');
          
          return res.status(401).json({
            success: false,
            error: 'Invalid secret key',
            code: 'SECRET_INVALID'
          });
        }
        
        // 5. Sanitizar dados de entrada
        req.body = this.sanitizeRequestBody(req.body);
        
        // 6. Log de sucesso
        this.logSecurityEvent(req, 'webhook_verified', {
          playerCount: Object.keys(req.body).length,
          hasSensitiveData: ['salary', 'feePaid', 'releaseClause'].some(field => req.body[field])
        });
        
        next();
        
      } catch (error) {
        console.error('Erro no middleware de webhook:', error);
        res.status(500).json({
          success: false,
          error: 'Webhook security error'
        });
      }
    };
  }

  /**
   * Verificar Rate Limiting
   * @param {Object} req - Requisição
   * @param {string} endpoint - Endpoint específico (opcional)
   * @returns {Object} Resultado da verificação
   */
  checkRateLimit(req, endpoint = null) {
    const ip = this.getClientIP(req);
    const now = Date.now();
    
    // Verificar se IP está bloqueado
    if (this.isIPBlocked(ip)) {
      return {
        allowed: false,
        reason: 'IP_BLOCKED',
        blockExpiry: this.blockedIPs.get(ip).expiry,
        retryAfter: Math.ceil((this.blockedIPs.get(ip).expiry - now) / 1000)
      };
    }
    
    // Verificar limites globais
    const globalLimitResult = this.checkGlobalLimit(now);
    if (!globalLimitResult.allowed) {
      return globalLimitResult;
    }
    
    // Verificar limites de IP
    const ipLimitResult = this.checkIPLimit(ip, now, endpoint);
    if (!ipLimitResult.allowed) {
      return ipLimitResult;
    }
    
    // Verificar limites de endpoint específico
    if (endpoint && this.rateLimitConfig.endpointLimits[endpoint]) {
      const endpointLimitResult = this.checkEndpointLimit(ip, endpoint, now);
      if (!endpointLimitResult.allowed) {
        return endpointLimitResult;
      }
    }
    
    return { allowed: true };
  }

  /**
   * Verificar limite global
   * @param {number} now - Timestamp atual
   * @returns {Object} Resultado da verificação
   */
  checkGlobalLimit(now) {
    const config = this.rateLimitConfig.globalLimits;
    const windowStart = now - config.windowMs;
    
    // Limpar contadores antigos
    this.cleanupGlobalCounters(windowStart);
    
    // Contar requisições na janela atual
    let totalRequests = 0;
    for (const [timestamp, count] of this.globalRequestCount) {
      if (timestamp >= windowStart) {
        totalRequests += count;
      }
    }
    
    // Verificar se excedeu o limite
    if (totalRequests >= config.maxRequests) {
      return {
        allowed: false,
        reason: 'GLOBAL_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.windowMs / 1000)
      };
    }
    
    // Incrementar contador
    const currentSecond = Math.floor(now / 1000) * 1000;
    this.globalRequestCount.set(currentSecond, (this.globalRequestCount.get(currentSecond) || 0) + 1);
    
    return { allowed: true };
  }

  /**
   * Verificar limite por IP
   * @param {string} ip - Endereço IP
   * @param {number} now - Timestamp atual
   * @param {string} endpoint - Endpoint específico
   * @returns {Object} Resultado da verificação
   */
  checkIPLimit(ip, now, endpoint) {
    const config = this.rateLimitConfig.ipLimits;
    const key = `ip:${ip}:${endpoint || 'default'}`;
    
    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, {
        requests: [],
        blocked: false,
        blockExpiry: null
      });
    }
    
    const ipData = this.rateLimitStore.get(key);
    const windowStart = now - config.windowMs;
    
    // Limpar requisições antigas
    ipData.requests = ipData.requests.filter(timestamp => timestamp >= windowStart);
    
    // Verificar se excedeu o limite
    if (ipData.requests.length >= config.maxRequests) {
      // Bloquear IP
      ipData.blocked = true;
      ipData.blockExpiry = now + config.blockDuration;
      
      // Adicionar à lista de bloqueados
      this.blockedIPs.set(ip, {
        reason: 'IP_RATE_LIMIT',
        expiry: ipData.blockExpiry
      });
      
      return {
        allowed: false,
        reason: 'IP_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.blockDuration / 1000)
      };
    }
    
    // Adicionar requisição atual
    ipData.requests.push(now);
    
    return { allowed: true };
  }

  /**
   * Verificar limite de endpoint específico
   * @param {string} ip - Endereço IP
   * @param {string} endpoint - Endpoint
   * @param {number} now - Timestamp atual
   * @returns {Object} Resultado da verificação
   */
  checkEndpointLimit(ip, endpoint, now) {
    const config = this.rateLimitConfig.endpointLimits[endpoint];
    const key = `endpoint:${endpoint}:${ip}`;
    
    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, {
        requests: [],
        blocked: false,
        blockExpiry: null
      });
    }
    
    const endpointData = this.rateLimitStore.get(key);
    const windowStart = now - config.windowMs;
    
    // Limpar requisições antigas
    endpointData.requests = endpointData.requests.filter(timestamp => timestamp >= windowStart);
    
    // Verificar se excedeu o limite
    if (endpointData.requests.length >= config.maxRequests) {
      // Bloquear IP para este endpoint
      endpointData.blocked = true;
      endpointData.blockExpiry = now + config.blockDuration;
      
      return {
        allowed: false,
        reason: 'ENDPOINT_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.blockDuration / 1000)
      };
    }
    
    // Adicionar requisição atual
    endpointData.requests.push(now);
    
    return { allowed: true };
  }

  /**
   * Verificar se IP está bloqueado
   * @param {string} ip - Endereço IP
   * @returns {boolean} Se IP está bloqueado
   */
  isIPBlocked(ip) {
    const blockedData = this.blockedIPs.get(ip);
    if (!blockedData) return false;
    
    const now = Date.now();
    if (now < blockedData.expiry) {
      return true;
    }
    
    // Remover bloqueio expirado
    this.blockedIPs.delete(ip);
    return false;
  }

  /**
   * Limpar contadores globais antigos
   * @param {number} cutoff - Timestamp de corte
   */
  cleanupGlobalCounters(cutoff) {
    for (const [timestamp] of this.globalRequestCount) {
      if (timestamp < cutoff) {
        this.globalRequestCount.delete(timestamp);
      }
    }
  }

  /**
   * Obter IP real do cliente
   * @param {Object} req - Requisição
   * @returns {string} Endereço IP
   */
  getClientIP(req) {
    // Verificar headers de proxy confiáveis
    const forwarded = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const clientIP = req.headers['x-client-ip'];
    const cfConnectingIP = req.headers['cf-connecting-ip']; // Cloudflare
    
    if (cfConnectingIP && this.securityConfig.trustedProxies.includes('cloudflare')) {
      return cfConnectingIP.split(',')[0].trim();
    }
    
    if (forwarded && this.securityConfig.trustedProxies.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP.split(',')[0].trim();
    }
    
    if (clientIP) {
      return clientIP.split(',')[0].trim();
    }
    
    return req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
  }

  /**
   * Validar origem da requisição
   * @param {Object} req - Requisição
   * @returns {boolean} Se origem é permitida
   */
  validateOrigin(req) {
    const origin = req.headers.origin || req.headers.referer;
    
    if (!origin) return false; // Requer origin para segurança
    
    return this.securityConfig.allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      return origin.startsWith(allowedOrigin);
    });
  }

  /**
   * Adicionar headers de segurança
   * @param {Object} res - Response object
   */
  addSecurityHeaders(res) {
    const cspHeaders = this.encryptionManager.getCSPMiddleware();
    cspHeaders(req, res, () => {});
    
    // Headers adicionais
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('X-Security-Level', 'MILITARY_GRADE');
    res.setHeader('X-Rate-Limit-Limit', this.rateLimitConfig.ipLimits.maxRequests);
    res.setHeader('X-Rate-Limit-Window', Math.ceil(this.rateLimitConfig.ipLimits.windowMs / 1000));
  }

  /**
   * Sanitizar corpo da requisição
   * @param {Object} body - Corpo da requisição
   * @returns {Object} Corpo sanitizado
   */
  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        sanitized[key] = this.encryptionManager.sanitize(value);
      } else if (typeof value === 'number') {
        sanitized[key] = value; // Números são seguros
      } else if (typeof value === 'boolean') {
        sanitized[key] = value; // Booleans são seguros
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.encryptionManager.sanitize(item) : item
        );
      } else {
        sanitized[key] = value; // Outros tipos (mantém por enquanto)
      }
    }
    
    return sanitized;
  }

  /**
   * Enviar resposta de Rate Limit
   * @param {Object} res - Response object
   * @param {Object} result - Resultado da verificação
   */
  sendRateLimitResponse(res, result) {
    const headers = {
      'Retry-After': result.retryAfter,
      'X-Rate-Limit-Reason': result.reason
    };
    
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    this.logSecurityEvent({ ip: 'unknown' }, 'rate_limit_blocked', result);
    
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      reason: result.reason,
      retryAfter: result.retryAfter
    });
  }

  /**
   * Registrar evento de segurança
   * @param {Object} req - Requisição
   * @param {string} event - Tipo de evento
   * @param {Object} metadata - Metadados adicionais
   */
  logSecurityEvent(req, event, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      metadata
    };
    
    // Em produção, enviar para sistema de logs centralizado
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implementar envio para serviço de logs
      console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
    } else {
      console.log('SECURITY_EVENT:', JSON.stringify(logEntry, null, 2));
    }
  }

  /**
   * Gerar relatório de segurança
   * @returns {Object} Relatório completo
   */
  getSecurityReport() {
    const now = Date.now();
    
    return {
      timestamp: new Date().toISOString(),
      securityLevel: 'MILITARY_GRADE',
      encryption: this.encryptionManager.getSecurityReport(),
      rateLimiting: {
        blockedIPs: this.blockedIPs.size,
        activeLimits: this.rateLimitStore.size,
        globalRequests: this.globalRequestCount.size,
        config: this.rateLimitConfig
      },
      securityConfig: this.securityConfig,
      cspEnabled: true,
      hmacEnabled: true,
      rateLimitingEnabled: true,
      webhookSecurityEnabled: true
    };
  }

  /**
   * Limpar dados antigos
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 horas
    
    // Limpar rate limits antigos
    for (const [key, data] of this.rateLimitStore) {
      if (data.blockExpiry && data.blockExpiry < now) {
        this.rateLimitStore.delete(key);
      }
    }
    
    // Limpar IPs bloqueados expirados
    for (const [ip, data] of this.blockedIPs) {
      if (data.expiry < now) {
        this.blockedIPs.delete(ip);
      }
    }
    
    // Limpar contadores globais antigos
    this.cleanupGlobalCounters(cutoff);
  }
}

// Singleton pattern
let securityManager = null;

function getSecurityManager() {
  if (!securityManager) {
    securityManager = new APISecurityManager();
    
    // Limpar dados antigos a cada hora
    setInterval(() => {
      securityManager.cleanup();
    }, 60 * 60 * 1000);
  }
  return securityManager;
}

module.exports = {
  APISecurityManager,
  getSecurityManager
};
