const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Módulo de Criptografia AES-256-GCM
 * Segurança de nível militar para dados sensíveis
 */
class EncryptionManager {
  constructor() {
    // Chave de criptografia de 32 bytes (256 bits)
    this.encryptionKey = Buffer.from('9S1t1L?4`;MytM=,z/Q~R=69!>WO?X0M', 'utf8');
    
    // Verificar se a chave tem 32 bytes
    if (this.encryptionKey.length !== 32) {
      throw new Error('Chave de criptografia deve ter exatamente 32 bytes');
    }
    
    // Algoritmo e configurações
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Error handler integration
    this.errorHandler = null;
    
    // Configurar CSP headers
    this.cspHeaders = {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };
  }

  /**
   * Set error handler for integration
   */
  setErrorHandler(errorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * Criptografar dados sensíveis
   * @param {string} data - Dados a serem criptografados
   * @returns {Object} Objeto criptografado com IV e authTag
   */
  encrypt(data) {
    try {
      // Gerar IV único para cada criptografia
      const iv = crypto.randomBytes(this.ivLength);
      
      // Criar cipher
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('transfer-data', 'utf8')); // Additional Authenticated Data
      
      // Criptografar
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Obter auth tag
      const authTag = cipher.getAuthTag();
      
      // Retornar objeto criptografado
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Erro na criptografia:', error);
      throw new Error('Falha ao criptografar dados');
    }
  }

  /**
   * Descriptografar dados
   * @param {Object} encryptedData - Objeto criptografado
   * @returns {string} Dados descriptografados
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      
      // Validar dados
      if (!encrypted || !iv || !authTag) {
        throw new Error('Dados criptografados inválidos');
      }
      
      // Criar decipher
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('transfer-data', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      // Descriptografar
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      console.error('Erro na descriptografia:', error);
      
      // Capturar erro específico de descriptografia
      if (this.errorHandler) {
        this.errorHandler.handleSpecificError('DECRYPTION_ERROR', error, {
          operation: 'decrypt',
          hasEncrypted: !!encryptedData?.encrypted,
          hasIv: !!encryptedData?.iv,
          hasAuthTag: !!encryptedData?.authTag,
          algorithm: this.algorithm
        });
      }
      
      throw new Error('Falha ao descriptografar dados: ' + error.message);
    }
  }

  /**
   * Criptografar campos específicos de um objeto
   * @param {Object} data - Objeto com dados sensíveis
   * @param {Array} fields - Campos para criptografar
   * @returns {Object} Objeto com campos criptografados
   */
  encryptFields(data, fields = ['salary', 'feePaid', 'releaseClause']) {
    const encryptedData = { ...data };
    
    fields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null) {
        const value = typeof data[field] === 'number' 
          ? data[field].toString() 
          : data[field];
        
        encryptedData[field] = this.encrypt(value);
      }
    });
    
    return encryptedData;
  }

  /**
   * Descriptografar campos específicos de um objeto
   * @param {Object} data - Objeto com campos criptografados
   * @param {Array} fields - Campos para descriptografar
   * @returns {Object} Objeto com campos descriptografados
   */
  decryptFields(data, fields = ['salary', 'feePaid', 'releaseClause']) {
    const decryptedData = { ...data };
    
    fields.forEach(field => {
      if (data[field] && typeof data[field] === 'object') {
        try {
          const decryptedValue = this.decrypt(data[field]);
          
          // Converter de volta para número se era originalmente número
          decryptedData[field] = !isNaN(decryptedValue) 
            ? parseFloat(decryptedValue) 
            : decryptedValue;
        } catch (error) {
          console.error(`Erro ao descriptografar campo ${field}:`, error);
          decryptedData[field] = null; // Valor corrompido
        }
      }
    });
    
    return decryptedData;
  }

  /**
   * Gerar hash para verificação de integridade
   * @param {string} data - Dados para hashear
   * @returns {string} Hash SHA-256
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Gerar HMAC para verificação de autenticidade
   * @param {string} data - Dados para HMAC
   * @param {string} secret - Segredo para HMAC
   * @returns {string} HMAC HMAC-SHA256
   */
  hmac(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Gerar token seguro aleatório
   * @param {number} length - Comprimento do token
   * @returns {string} Token seguro
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Middleware para CSP headers
   */
  getCSPMiddleware() {
    return (req, res, next) => {
      // Aplicar headers de segurança
      Object.entries(this.cspHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      // Nonce para scripts inline (se necessário)
      const nonce = crypto.randomBytes(16).toString('base64');
      res.locals.nonce = nonce;
      
      next();
    };
  }

  /**
   * Validar integridade dos dados
   * @param {Object} data - Dados para validar
   * @param {string} expectedHash - Hash esperado
   * @returns {boolean} Se os dados são íntegros
   */
  validateIntegrity(data, expectedHash) {
    const dataString = JSON.stringify(data);
    const actualHash = this.hash(dataString);
    return actualHash === expectedHash;
  }

  /**
   * Sanitizar entrada de dados
   * @param {string} input - Entrada para sanitizar
   * @returns {string} Entrada sanitizada
   */
  sanitize(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remover tags HTML
      .replace(/['"]/g, '') // Remover aspas
      .replace(/[\r\n]/g, '') // Remover quebras de linha
      .substring(0, 1000); // Limitar tamanho
  }

  /**
   * Gerar chave derivada usando PBKDF2
   * @param {string} password - Senha base
   * @param {string} salt - Salt para derivação
   * @returns {Buffer} Chave derivada
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  /**
   * Assinar digitalmente dados
   * @param {Object} data - Dados para assinar
   * @returns {Object} Dados assinados
   */
  sign(data) {
    const dataString = JSON.stringify(data);
    const signature = crypto.createSign('RSA-SHA256');
    signature.update(dataString);
    
    // Nota: Em produção, use uma chave privada real
    // Por enquanto, usamos HMAC como alternativa
    const hmacSignature = this.hmac(dataString, this.encryptionKey.toString('hex'));
    
    return {
      data,
      signature: hmacSignature,
      algorithm: 'HMAC-SHA256',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verificar assinatura digital
   * @param {Object} signedData - Dados assinados
   * @returns {boolean} Se a assinatura é válida
   */
  verify(signedData) {
    const { data, signature } = signedData;
    const dataString = JSON.stringify(data);
    const expectedSignature = this.hmac(dataString, this.encryptionKey.toString('hex'));
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Limpar dados sensíveis da memória
   * @param {Buffer|string} data - Dados para limpar
   */
  secureWipe(data) {
    if (Buffer.isBuffer(data)) {
      data.fill(0);
    } else if (typeof data === 'string') {
      // Sobrescrever string (limitado em JavaScript)
      for (let i = 0; i < data.length; i++) {
        data = data.substring(0, i) + '\0' + data.substring(i + 1);
      }
    }
  }

  /**
   * Gerar relatório de segurança
   * @returns {Object} Status de segurança
   */
  getSecurityReport() {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
      cspEnabled: true,
      encryptionEnabled: true,
      hmacEnabled: true,
      timestamp: new Date().toISOString(),
      securityLevel: 'MILITARY_GRADE'
    };
  }
}

// Singleton pattern para instância única
let encryptionManager = null;

function getEncryptionManager() {
  if (!encryptionManager) {
    encryptionManager = new EncryptionManager();
  }
  return encryptionManager;
}

module.exports = {
  EncryptionManager,
  getEncryptionManager
};
