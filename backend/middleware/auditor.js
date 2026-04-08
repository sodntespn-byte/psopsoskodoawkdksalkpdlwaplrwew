const fs = require('fs');
const path = require('path');

class SecurityAuditor {
    constructor() {
        this.logFile = path.join(__dirname, '../logs/security.log');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    // Log de eventos de segurança
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            details,
            severity: this.getEventSeverity(event)
        };

        const logMessage = `[${logEntry.timestamp}] ${logEntry.severity.toUpperCase()}: ${event} - ${JSON.stringify(details)}\n`;
        
        fs.appendFileSync(this.logFile, logMessage);
        
        // Log para console em produção
        if (process.env.NODE_ENV === 'production') {
            console.log(logMessage.trim());
        }
    }

    getEventSeverity(event) {
        const severityMap = {
            'LOGIN_SUCCESS': 'info',
            'LOGIN_FAILURE': 'warning',
            'ACCOUNT_LOCKED': 'critical',
            'BRUTE_FORCE_ATTEMPT': 'critical',
            'SUSPICIOUS_ACTIVITY': 'warning',
            'USER_REGISTRATION': 'info',
            'PASSWORD_CHANGE': 'info',
            'ADMIN_ACCESS': 'warning',
            'WEBHOOK_INVALID': 'critical',
            'XSS_ATTEMPT': 'critical',
            'SQL_INJECTION_ATTEMPT': 'critical',
            'CSRF_ATTEMPT': 'critical',
            'RATE_LIMIT_EXCEEDED': 'warning',
            'UNAUTHORIZED_ACCESS': 'warning',
            'DATA_BREACH_ATTEMPT': 'critical'
        };
        
        return severityMap[event] || 'info';
    }

    // Auditoria de login
    auditLogin(req, success, userId = null, reason = null) {
        const event = success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE';
        
        this.logSecurityEvent(event, {
            userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString(),
            reason
        });
    }

    // Auditoria de registro
    auditRegistration(req, userId, username, email) {
        this.logSecurityEvent('USER_REGISTRATION', {
            userId,
            username,
            email,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
    }

    // Auditoria de tentativas de força bruta
    auditBruteForce(req, username, attempts) {
        this.logSecurityEvent('BRUTE_FORCE_ATTEMPT', {
            username,
            attempts,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
    }

    // Auditoria de atividade suspeita
    auditSuspiciousActivity(req, activity, details = {}) {
        this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
            activity,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.path,
            method: req.method,
            ...details
        });
    }

    // Auditoria de acesso administrativo
    auditAdminAccess(req, userId, action) {
        this.logSecurityEvent('ADMIN_ACCESS', {
            userId,
            action,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.path,
            method: req.method
        });
    }

    // Auditoria de webhook
    auditWebhook(req, success, reason = null) {
        const event = success ? 'WEBHOOK_RECEIVED' : 'WEBHOOK_INVALID';
        
        this.logSecurityEvent(event, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            signature: req.headers['x-signature-ed25519'],
            timestamp: req.headers['x-signature-timestamp'],
            reason
        });
    }

    // Auditoria de tentativas de ataque
    auditAttackAttempt(req, attackType, details = {}) {
        const eventMap = {
            'xss': 'XSS_ATTEMPT',
            'sql_injection': 'SQL_INJECTION_ATTEMPT',
            'csrf': 'CSRF_ATTEMPT',
            'data_breach': 'DATA_BREACH_ATTEMPT'
        };
        
        const event = eventMap[attackType] || 'SUSPICIOUS_ACTIVITY';
        
        this.logSecurityEvent(event, {
            attackType,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.path,
            method: req.method,
            ...details
        });
    }

    // Auditoria de rate limiting
    auditRateLimit(req, limitType, details = {}) {
        this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
            limitType,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.path,
            method: req.method,
            ...details
        });
    }

    // Auditoria de mudança de senha
    auditPasswordChange(req, userId, success) {
        const event = success ? 'PASSWORD_CHANGE' : 'PASSWORD_CHANGE_FAILURE';
        
        this.logSecurityEvent(event, {
            userId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
    }

    // Gerar relatório de segurança
    generateSecurityReport(timeRange = '24h') {
        try {
            const logs = fs.readFileSync(this.logFile, 'utf8');
            const lines = logs.split('\n').filter(line => line.trim());
            
            const now = new Date();
            const timeRangeMs = this.getTimeRangeMs(timeRange);
            const cutoffTime = new Date(now.getTime() - timeRangeMs);
            
            const recentLogs = lines.filter(line => {
                const timestamp = new Date(line.match(/\[(.*?)\]/)[1]);
                return timestamp > cutoffTime;
            });
            
            const report = {
                timeRange,
                generatedAt: now.toISOString(),
                totalEvents: recentLogs.length,
                eventsByType: {},
                eventsBySeverity: {},
                topIPs: {},
                criticalEvents: []
            };
            
            recentLogs.forEach(line => {
                try {
                    const data = JSON.parse(line.match(/\{.*\}/)[0]);
                    
                    // Contar eventos por tipo
                    const eventType = line.match(/: (.*?) -/)[1];
                    report.eventsByType[eventType] = (report.eventsByType[eventType] || 0) + 1;
                    
                    // Contar eventos por severidade
                    const severity = line.match(/\[(.*?)\]/)[1].split(' ')[2].toLowerCase();
                    report.eventsBySeverity[severity] = (report.eventsBySeverity[severity] || 0) + 1;
                    
                    // Contar IPs
                    const ip = data.ip;
                    report.topIPs[ip] = (report.topIPs[ip] || 0) + 1;
                    
                    // Eventos críticos
                    if (severity === 'critical') {
                        report.criticalEvents.push({
                            event: eventType,
                            timestamp: data.timestamp,
                            ip,
                            details: data
                        });
                    }
                } catch (error) {
                    // Ignorar linhas malformadas
                }
            });
            
            // Ordenar IPs por frequência
            report.topIPs = Object.entries(report.topIPs)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .reduce((obj, [ip, count]) => {
                    obj[ip] = count;
                    return obj;
                }, {});
            
            return report;
            
        } catch (error) {
            console.error('Erro ao gerar relatório de segurança:', error);
            return null;
        }
    }

    getTimeRangeMs(timeRange) {
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        
        return ranges[timeRange] || ranges['24h'];
    }

    // Limpar logs antigos
    cleanupLogs(daysToKeep = 30) {
        try {
            const logs = fs.readFileSync(this.logFile, 'utf8');
            const lines = logs.split('\n').filter(line => line.trim());
            
            const cutoffTime = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
            
            const filteredLines = lines.filter(line => {
                try {
                    const timestamp = new Date(line.match(/\[(.*?)\]/)[1]);
                    return timestamp > cutoffTime;
                } catch (error) {
                    return false;
                }
            });
            
            fs.writeFileSync(this.logFile, filteredLines.join('\n'));
            
            console.log(`Logs de segurança limpos. Mantidos últimos ${daysToKeep} dias.`);
            
        } catch (error) {
            console.error('Erro ao limpar logs de segurança:', error);
        }
    }

    // Verificar saúde do sistema de segurança
    checkSecurityHealth() {
        const report = this.generateSecurityReport('24h');
        
        if (!report) {
            return {
                status: 'error',
                message: 'Não foi possível gerar relatório de segurança'
            };
        }
        
        const health = {
            status: 'healthy',
            issues: [],
            recommendations: []
        };
        
        // Verificar eventos críticos
        if (report.criticalEvents.length > 0) {
            health.status = 'warning';
            health.issues.push(`${report.criticalEvents.length} eventos críticos nas últimas 24h`);
            health.recommendations.push('Investigar eventos críticos imediatamente');
        }
        
        // Verificar rate limiting
        const rateLimitEvents = report.eventsByType['RATE_LIMIT_EXCEEDED'] || 0;
        if (rateLimitEvents > 100) {
            health.status = 'warning';
            health.issues.push(`${rateLimitEvents} eventos de rate limiting`);
            health.recommendations.push('Verificar possíveis ataques de força bruta');
        }
        
        // Verificar tentativas de login falhas
        const loginFailures = report.eventsByType['LOGIN_FAILURE'] || 0;
        const loginSuccess = report.eventsByType['LOGIN_SUCCESS'] || 0;
        
        if (loginFailures > loginSuccess * 2) {
            health.status = 'warning';
            health.issues.push('Taxa de falha de login elevada');
            health.recommendations.push('Verificar tentativas de invasão');
        }
        
        return health;
    }
}

module.exports = SecurityAuditor;
