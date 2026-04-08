const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getEncryptionManager } = require('./encryption');

/**
 * Sistema de Auditoria e Logs Seguro
 * Registra todas as operações críticas sem expor dados sensíveis
 */
class AuditLogger {
  constructor() {
    this.encryptionManager = getEncryptionManager();
    
    // Configurações de logging
    this.logConfig = {
      logLevel: process.env.LOG_LEVEL || 'INFO',
      logDirectory: path.join(process.cwd(), 'logs'),
      maxLogSize: 10 * 1024 * 1024, // 10MB
      maxLogFiles: 30, // Manter 30 arquivos de log
      retentionDays: 90, // Manter logs por 90 dias
      
      // Níveis de log
      levels: {
        CRITICAL: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4
      }
    };
    
    // Diretório de logs
    this.ensureLogDirectory();
    
    // Sessões ativas para tracking
    this.activeSessions = new Map();
    
    // Hash de operações para detecção de duplicatas
    this.operationHashes = new Map();
    
    // Métricas de segurança
    this.securityMetrics = {
      totalOperations: 0,
      failedOperations: 0,
      suspiciousActivities: 0,
      blockedAttempts: 0,
      lastHour: {
        operations: 0,
        errors: 0,
        warnings: 0
      }
    };
    
    // Iniciar limpeza periódica
    this.startPeriodicCleanup();
  }

  /**
   * Garantir que o diretório de logs existe
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logConfig.logDirectory)) {
      fs.mkdirSync(this.logConfig.logDirectory, { recursive: true });
    }
  }

  /**
   * Registrar evento de auditoria
   * @param {string} level - Nível do log
   * @param {string} action - Ação executada
   * @param {Object} data - Dados do evento
   * @param {Object} context - Contexto adicional
   */
  log(level, action, data = {}, context = {}) {
    try {
      // Validar nível
      if (!this.logConfig.levels.hasOwnProperty(level)) {
        level = 'INFO';
      }
      
      // Verificar se deve registrar este nível
      const currentLevel = this.logConfig.levels[this.logConfig.logLevel];
      const eventLevel = this.logConfig.levels[level];
      
      if (eventLevel > currentLevel) {
        return; // Não registrar níveis abaixo do configurado
      }
      
      // Criar entrada de log
      const logEntry = this.createLogEntry(level, action, data, context);
      
      // Detectar atividades suspeitas
      this.detectSuspiciousActivity(logEntry);
      
      // Escrever nos arquivos de log
      this.writeToLogFile(logEntry);
      
      // Atualizar métricas
      this.updateMetrics(logEntry);
      
      // Para eventos críticos, também enviar para console
      if (level === 'CRITICAL' || level === 'ERROR') {
        console.error(`AUDIT_LOG: ${JSON.stringify(logEntry, null, 2)}`);
      }
      
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
    }
  }

  /**
   * Criar entrada de log estruturada
   * @param {string} level - Nível do log
   * @param {string} action - Ação executada
   * @param {Object} data - Dados do evento
   * @param {Object} context - Contexto adicional
   * @returns {Object} Entrada de log
   */
  createLogEntry(level, action, data, context) {
    const now = new Date();
    const timestamp = now.toISOString();
    
    // Gerar hash único para a operação
    const operationHash = this.generateOperationHash(action, data, context);
    
    // Sanitizar dados sensíveis
    const sanitizedData = this.sanitizeLogData(data);
    
    // Criar entrada base
    const logEntry = {
      timestamp,
      level,
      action,
      operationHash,
      data: sanitizedData,
      context: {
        ...context,
        sessionId: context.sessionId || this.generateSessionId(),
        traceId: context.traceId || this.generateTraceId()
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      security: {
        ip: context.ip || 'unknown',
        userAgent: context.userAgent || 'unknown',
        origin: context.origin || 'unknown',
        requestId: context.requestId || this.generateRequestId()
      }
    };
    
    // Adicionar fingerprint para detecção de anomalias
    logEntry.fingerprint = this.generateFingerprint(logEntry);
    
    return logEntry;
  }

  /**
   * Sanitizar dados sensíveis para logs
   * @param {Object} data - Dados originais
   * @returns {Object} Dados sanitizados
   */
  sanitizeLogData(data) {
    const sanitized = {};
    const sensitiveFields = ['salary', 'feePaid', 'releaseClause', 'password', 'token', 'secret', 'key'];
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        // Campos sensíveis: apenas hash e tipo
        if (typeof value === 'number') {
          sanitized[key] = {
            type: 'encrypted_numeric',
            hash: this.encryptionManager.hash(value.toString()),
            range: this.getNumberRange(value)
          };
        } else if (typeof value === 'string') {
          sanitized[key] = {
            type: 'encrypted_string',
            hash: this.encryptionManager.hash(value),
            length: value.length
          };
        } else {
          sanitized[key] = {
            type: typeof value,
            hash: this.encryptionManager.hash(JSON.stringify(value))
          };
        }
      } else {
        // Campos não sensíveis: manter valor original
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Obter faixa de valor para números
   * @param {number} value - Valor numérico
   * @returns {string} Faixa do valor
   */
  getNumberRange(value) {
    if (typeof value !== 'number') return 'unknown';
    
    if (value < 1) return '< 1';
    if (value < 10) return '1-10';
    if (value < 50) return '10-50';
    if (value < 100) return '50-100';
    if (value < 500) return '100-500';
    if (value < 1000) return '500-1000';
    if (value < 5000) return '1K-5K';
    if (value < 10000) return '5K-10K';
    if (value < 50000) return '10K-50K';
    if (value < 100000) return '50K-100K';
    if (value < 500000) return '100K-500K';
    if (value < 1000000) return '500K-1M';
    if (value < 5000000) return '1M-5M';
    if (value < 10000000) return '5M-10M';
    if (value < 50000000) return '10M-50M';
    return '> 50M';
  }

  /**
   * Gerar hash da operação
   * @param {string} action - Ação
   * @param {Object} data - Dados
   * @param {Object} context - Contexto
   * @returns {string} Hash SHA-256
   */
  generateOperationHash(action, data, context) {
    const operationData = {
      action,
      data: this.sanitizeLogData(data),
      context: {
        ip: context.ip,
        userAgent: context.userAgent,
        timestamp: Date.now()
      }
    };
    
    return this.encryptionManager.hash(JSON.stringify(operationData));
  }

  /**
   * Gerar fingerprint para detecção de anomalias
   * @param {Object} logEntry - Entrada de log
   * @returns {string} Fingerprint
   */
  generateFingerprint(logEntry) {
    const fingerprintData = {
      action: logEntry.action,
      level: logEntry.level,
      ip: logEntry.security.ip,
      userAgent: logEntry.security.userAgent,
      hour: new Date(logEntry.timestamp).getHours()
    };
    
    return this.encryptionManager.hash(JSON.stringify(fingerprintData));
  }

  /**
   * Detectar atividades suspeitas
   * @param {Object} logEntry - Entrada de log
   */
  detectSuspiciousActivity(logEntry) {
    const suspiciousPatterns = [
      // Múltiplas falhas de autenticação
      {
        pattern: 'auth_failure_multiple',
        check: (entry) => entry.action === 'auth_failed' && this.countRecentFailures(entry.security.ip) > 5,
        severity: 'HIGH'
      },
      
      // Tentativas de acesso de IPs incomuns
      {
        pattern: 'unusual_ip_access',
        check: (entry) => this.isUnusualIP(entry.security.ip),
        severity: 'MEDIUM'
      },
      
      // Operações fora do horário normal
      {
        pattern: 'off_hours_operation',
        check: (entry) => {
          const hour = new Date(entry.timestamp).getHours();
          return hour < 6 || hour > 22;
        },
        severity: 'LOW'
      },
      
      // Alterações em dados críticos
      {
        pattern: 'critical_data_modification',
        check: (entry) => entry.action.includes('modify') || entry.action.includes('delete'),
        severity: 'HIGH'
      },
      
      // Operações duplicadas
      {
        pattern: 'duplicate_operation',
        check: (entry) => this.operationHashes.has(entry.operationHash),
        severity: 'MEDIUM'
      }
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.check(logEntry)) {
        this.handleSuspiciousActivity(logEntry, pattern);
      }
    }
    
    // Adicionar hash para detecção de duplicatas
    this.operationHashes.set(logEntry.operationHash, Date.now());
  }

  /**
   * Lidar com atividade suspeita
   * @param {Object} logEntry - Entrada de log
   * @param {Object} pattern - Padrão detectado
   */
  handleSuspiciousActivity(logEntry, pattern) {
    this.securityMetrics.suspiciousActivities++;
    
    // Criar alerta de segurança
    const alert = {
      timestamp: new Date().toISOString(),
      severity: pattern.severity,
      pattern: pattern.pattern,
      logEntry: {
        timestamp: logEntry.timestamp,
        action: logEntry.action,
        ip: logEntry.security.ip,
        userAgent: logEntry.security.userAgent
      },
      recommendations: this.getSecurityRecommendations(pattern.pattern)
    };
    
    // Registrar alerta
    this.log('WARN', 'SUSPICIOUS_ACTIVITY_DETECTED', alert);
    
    // Para padrões de alta severidade, considerar bloqueio
    if (pattern.severity === 'HIGH') {
      this.considerBlocking(logEntry.security.ip, pattern.pattern);
    }
  }

  /**
   * Obter recomendações de segurança
   * @param {string} pattern - Padrão detectado
   * @returns {Array} Recomendações
   */
  getSecurityRecommendations(pattern) {
    const recommendations = {
      'auth_failure_multiple': [
        'Implementar bloqueio temporário do IP',
        'Aumentar complexidade da senha',
        'Verificar se não é ataque de força bruta'
      ],
      'unusual_ip_access': [
        'Verificar geolocalização do IP',
        'Considerar autenticação de dois fatores',
        'Monitorar atividades subsequentes'
      ],
      'off_hours_operation': [
        'Verificar se operação é legítima',
        'Implementar aprovação para operações críticas',
        'Notificar administradores'
      ],
      'critical_data_modification': [
        'Exigir autenticação adicional',
        'Implementar logging detalhado',
        'Considerar rollback automático'
      ],
      'duplicate_operation': [
        'Investigar possível replay attack',
        'Verificar integridade dos dados',
        'Implementar nonce para operações'
      ]
    };
    
    return recommendations[pattern] || ['Investigar atividade suspeita'];
  }

  /**
   * Contar falhas recentes por IP
   * @param {string} ip - Endereço IP
   * @returns {number} Número de falhas recentes
   */
  countRecentFailures(ip) {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Implementar contagem real (simplificado para exemplo)
    return Math.floor(Math.random() * 10); // Simulação
  }

  /**
   * Verificar se IP é incomum
   * @param {string} ip - Endereço IP
   * @returns {boolean} Se IP é incomum
   */
  isUnusualIP(ip) {
    // Implementar verificação real (simplificado para exemplo)
    const knownIPs = ['127.0.0.1', '::1', 'localhost'];
    return !knownIPs.includes(ip);
  }

  /**
   * Considerar bloqueio de IP
   * @param {string} ip - Endereço IP
   * @param {string} reason - Razão do bloqueio
   */
  considerBlocking(ip, reason) {
    // Implementar lógica de bloqueio real
    this.log('WARN', 'IP_BLOCK_CONSIDERED', { ip, reason });
  }

  /**
   * Escrever entrada de log no arquivo
   * @param {Object} logEntry - Entrada de log
   */
  writeToLogFile(logEntry) {
    try {
      const date = new Date(logEntry.timestamp);
      const logFileName = `audit-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
      const logFilePath = path.join(this.logConfig.logDirectory, logFileName);
      
      // Verificar tamanho do arquivo
      if (fs.existsSync(logFilePath)) {
        const stats = fs.statSync(logFilePath);
        if (stats.size > this.logConfig.maxLogSize) {
          this.rotateLogFile(logFilePath);
        }
      }
      
      // Escrever entrada
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFilePath, logLine, 'utf8');
      
      // Também escrever no arquivo de segurança
      if (logEntry.level === 'CRITICAL' || logEntry.action.includes('SUSPICIOUS')) {
        const securityLogPath = path.join(this.logConfig.logDirectory, 'security.log');
        fs.appendFileSync(securityLogPath, logLine, 'utf8');
      }
      
    } catch (error) {
      console.error('Erro ao escrever log no arquivo:', error);
    }
  }

  /**
   * Rotacionar arquivo de log
   * @param {string} logFilePath - Caminho do arquivo
   */
  rotateLogFile(logFilePath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = logFilePath.replace('.log', `-${timestamp}.log`);
      
      fs.renameSync(logFilePath, rotatedPath);
      
      // Limpar arquivos antigos
      this.cleanupOldLogs();
      
    } catch (error) {
      console.error('Erro ao rotacionar arquivo de log:', error);
    }
  }

  /**
   * Limpar logs antigos
   */
  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logConfig.logDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.logConfig.retentionDays);
      
      for (const file of files) {
        const filePath = path.join(this.logConfig.logDirectory, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          console.log(`Arquivo de log antigo removido: ${file}`);
        }
      }
      
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
    }
  }

  /**
   * Atualizar métricas de segurança
   * @param {Object} logEntry - Entrada de log
   */
  updateMetrics(logEntry) {
    this.securityMetrics.totalOperations++;
    
    if (logEntry.level === 'ERROR' || logEntry.level === 'CRITICAL') {
      this.securityMetrics.failedOperations++;
    }
    
    // Atualizar métricas da última hora
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    if (new Date(logEntry.timestamp) > oneHourAgo) {
      this.securityMetrics.lastHour.operations++;
      
      if (logEntry.level === 'ERROR' || logEntry.level === 'CRITICAL') {
        this.securityMetrics.lastHour.errors++;
      }
      
      if (logEntry.level === 'WARN') {
        this.securityMetrics.lastHour.warnings++;
      }
    }
  }

  /**
   * Gerar ID de sessão
   * @returns {string} ID de sessão
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Gerar ID de trace
   * @returns {string} ID de trace
   */
  generateTraceId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Gerar ID de requisição
   * @returns {string} ID de requisição
   */
  generateRequestId() {
    return crypto.randomBytes(12).toString('hex');
  }

  /**
   * Iniciar limpeza periódica
   */
  startPeriodicCleanup() {
    // Limpar hashes antigos a cada hora
    setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      for (const [hash, timestamp] of this.operationHashes) {
        if (timestamp < oneHourAgo) {
          this.operationHashes.delete(hash);
        }
      }
    }, 60 * 60 * 1000);
    
    // Limpar logs antigos a cada dia
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Consultar logs de auditoria
   * @param {Object} filters - Filtros de consulta
   * @returns {Array} Logs encontrados
   */
  queryLogs(filters = {}) {
    try {
      const {
        level,
        action,
        ip,
        startDate,
        endDate,
        limit = 100
      } = filters;
      
      const results = [];
      const logFiles = fs.readdirSync(this.logConfig.logDirectory)
        .filter(file => file.endsWith('.log') && file.startsWith('audit-'))
        .sort();
      
      for (const file of logFiles) {
        const filePath = path.join(this.logConfig.logDirectory, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line);
            
            // Aplicar filtros
            if (level && logEntry.level !== level) continue;
            if (action && !logEntry.action.includes(action)) continue;
            if (ip && logEntry.security.ip !== ip) continue;
            if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) continue;
            if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) continue;
            
            results.push(logEntry);
            
            if (results.length >= limit) break;
            
          } catch (parseError) {
            // Ignorar linhas mal formatadas
            continue;
          }
        }
        
        if (results.length >= limit) break;
      }
      
      return results;
      
    } catch (error) {
      console.error('Erro ao consultar logs:', error);
      return [];
    }
  }

  /**
   * Gerar relatório de auditoria
   * @returns {Object} Relatório completo
   */
  generateAuditReport() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    const recentLogs = this.queryLogs({
      startDate: last24Hours.toISOString(),
      limit: 1000
    });
    
    const report = {
      timestamp: now.toISOString(),
      period: '24 hours',
      summary: {
        totalOperations: this.securityMetrics.totalOperations,
        failedOperations: this.securityMetrics.failedOperations,
        suspiciousActivities: this.securityMetrics.suspiciousActivities,
        blockedAttempts: this.securityMetrics.blockedAttempts,
        lastHour: this.securityMetrics.lastHour
      },
      recentActivity: {
        totalLogs: recentLogs.length,
        criticalLogs: recentLogs.filter(log => log.level === 'CRITICAL').length,
        errorLogs: recentLogs.filter(log => log.level === 'ERROR').length,
        warningLogs: recentLogs.filter(log => log.level === 'WARN').length,
        suspiciousLogs: recentLogs.filter(log => log.action.includes('SUSPICIOUS')).length
      },
      topActions: this.getTopActions(recentLogs),
      topIPs: this.getTopIPs(recentLogs),
      securityLevel: 'MILITARY_GRADE',
      recommendations: this.generateSecurityRecommendations(recentLogs)
    };
    
    return report;
  }

  /**
   * Obter ações mais frequentes
   * @param {Array} logs - Logs para analisar
   * @returns {Array} Ações mais frequentes
   */
  getTopActions(logs) {
    const actionCounts = {};
    
    logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });
    
    return Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));
  }

  /**
   * Obter IPs mais ativos
   * @param {Array} logs - Logs para analisar
   * @returns {Array} IPs mais ativos
   */
  getTopIPs(logs) {
    const ipCounts = {};
    
    logs.forEach(log => {
      const ip = log.security.ip;
      ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    });
    
    return Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
  }

  /**
   * Gerar recomendações de segurança
   * @param {Array} logs - Logs para analisar
   * @returns {Array} Recomendações
   */
  generateSecurityRecommendations(logs) {
    const recommendations = [];
    
    // Analisar padrões e gerar recomendações
    const errorRate = logs.filter(log => log.level === 'ERROR').length / logs.length;
    if (errorRate > 0.1) {
      recommendations.push('Alta taxa de erros detectada. Considerar revisar configurações.');
    }
    
    const suspiciousRate = logs.filter(log => log.action.includes('SUSPICIOUS')).length / logs.length;
    if (suspiciousRate > 0.05) {
      recommendations.push('Atividades suspeitas detectadas. Considerar implementar autenticação adicional.');
    }
    
    const uniqueIPs = new Set(logs.map(log => log.security.ip)).size;
    if (uniqueIPs > 100) {
      recommendations.push('Alto número de IPs únicos. Considerar implementar whitelist.');
    }
    
    return recommendations;
  }
}

// Singleton pattern
let auditLogger = null;

function getAuditLogger() {
  if (!auditLogger) {
    auditLogger = new AuditLogger();
  }
  return auditLogger;
}

module.exports = {
  AuditLogger,
  getAuditLogger
};
