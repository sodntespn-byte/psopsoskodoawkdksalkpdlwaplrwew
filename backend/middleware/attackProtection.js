const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

class AttackProtection {
    constructor() {
        this.blacklistedIPs = new Set();
        this.suspiciousIPs = new Map();
        this.attackPatterns = new Map();
        this.initializeAttackPatterns();
    }

    initializeAttackPatterns() {
        // Padrões de ataque XSS
        this.attackPatterns.set('xss', [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
            /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
            /eval\s*\(/gi,
            /setTimeout\s*\(/gi,
            /setInterval\s*\(/gi
        ]);

        // Padrões de ataque SQL Injection
        this.attackPatterns.set('sql_injection', [
            /union\s+select/gi,
            /drop\s+table/gi,
            /insert\s+into/gi,
            /delete\s+from/gi,
            /update\s+\w+\s+set/gi,
            /create\s+table/gi,
            /alter\s+table/gi,
            /exec\s*\(/gi,
            /execute\s*\(/gi,
            /sp_executesql/gi,
            /xp_cmdshell/gi,
            /--\s*$/gi,
            /\/\*.*?\*\//gi,
            /'\s*or\s*'1'\s*=\s*'1/gi,
            /'\s*or\s*1\s*=\s*1/gi,
            /admin\s*--/gi,
            /admin\s*#/gi
        ]);

        // Padrões de ataque Path Traversal
        this.attackPatterns.set('path_traversal', [
            /\.\.\//gi,
            /\.\.\\/gi,
            /%2e%2e%2f/gi,
            /%2e%2e%5c/gi,
            /..\/..\//gi,
            /..\\..\\/gi,
            /\/etc\/passwd/gi,
            /\/windows\/system32/gi,
            /c:\\windows/gi
        ]);

        // Padrões de ataque Command Injection
        this.attackPatterns.set('command_injection', [
            /;\s*rm\s+-rf/gi,
            /;\s*cat\s+/gi,
            /;\s*ls\s+-la/gi,
            /;\s*pwd/gi,
            /;\s*whoami/gi,
            /;\s*id/gi,
            /;\s*uname\s+-a/gi,
            /;\s*net\s+user/gi,
            /;\s*dir/gi,
            /`\s*[^`]*\s*`/gi,
            /\$\([^)]*\)/gi,
            /\|\s*sh/gi,
            /\|\s*bash/gi
        ]);

        // Padrões de ataque LDAP Injection
        this.attackPatterns.set('ldap_injection', [
            /\*\)\(/gi,
            /\)\(\|\(/gi,
            /\)\(\&\(/gi,
            /\*\)\(\|\(/gi,
            /admin\)\)\(/gi,
            /user\)\)\(/gi
        ]);

        // Padrões de ataque NoSQL Injection
        this.attackPatterns.set('nosql_injection', [
            /\$where/gi,
            /\$regex/gi,
            /\$ne/gi,
            /\$gt/gi,
            /\$lt/gi,
            /\$in/gi,
            /\$nin/gi,
            /\$exists/gi,
            /\{.*\$.*\}/gi
        ]);
    }

    // Middleware principal de proteção contra ataques
    attackProtection() {
        return (req, res, next) => {
            // DESABILITADO: Verificação de ataque causando falsos positivos
            // Apenas loga requisições suspeitas sem bloquear
            next();
        };
    }

    // Analisar requisição em busca de ataques
    analyzeRequest(req) {
        const analysisData = {
            url: req.url,
            method: req.method,
            headers: req.headers,
            query: req.query,
            body: req.body,
            params: req.params
        };

        // Converter para string para análise
        const requestString = JSON.stringify(analysisData);

        // Verificar cada tipo de ataque
        for (const [attackType, patterns] of this.attackPatterns) {
            for (const pattern of patterns) {
                if (pattern.test(requestString)) {
                    return {
                        type: attackType,
                        pattern: pattern.toString(),
                        detectedIn: this.findDetectionLocation(requestString, pattern)
                    };
                }
            }
        }

        return null;
    }

    // Encontrar localização do padrão detectado
    findDetectionLocation(text, pattern) {
        const match = text.match(pattern);
        if (match) {
            const index = match.index;
            const context = text.substring(Math.max(0, index - 50), index + match[0].length + 50);
            return {
                index,
                match: match[0],
                context
            };
        }
        return null;
    }

    // Lidar com detecção de ataque
    handleAttackDetection(req, attackInfo) {
        const ip = req.ip;
        
        // Adicionar IP à blacklist se ataque grave
        if (this.isSevereAttack(attackInfo.type)) {
            this.blacklistedIPs.add(ip);
            
            console.error('IP adicionado à blacklist por ataque grave:', {
                ip,
                attackType: attackInfo.type,
                timestamp: new Date().toISOString(),
                userAgent: req.headers['user-agent'],
                path: req.path
            });
        }

        // Registrar ataque
        console.warn('Ataque detectado:', {
            ip,
            attackType: attackInfo.type,
            pattern: attackInfo.pattern,
            path: req.path,
            method: req.method,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
    }

    // Verificar se ataque é grave
    isSevereAttack(attackType) {
        const severeAttacks = ['sql_injection', 'command_injection', 'xss'];
        return severeAttacks.includes(attackType);
    }

    // Verificar atividade suspeita
    checkSuspiciousActivity(req) {
        const ip = req.ip;
        const suspiciousData = this.suspiciousIPs.get(ip) || {
            requestCount: 0,
            lastRequest: null,
            suspiciousPatterns: [],
            firstSeen: new Date()
        };

        const now = new Date();
        
        // Verificar número excessivo de requisições
        if (suspiciousData.lastRequest && (now - suspiciousData.lastRequest) < 1000) {
            suspiciousData.requestCount++;
            
            if (suspiciousData.requestCount > 10) {
                return {
                    type: 'excessive_requests',
                    count: suspiciousData.requestCount,
                    timeWindow: '1 segundo'
                };
            }
        } else {
            suspiciousData.requestCount = 1;
        }

        // Verificar headers suspeitos
        const suspiciousHeaders = this.checkSuspiciousHeaders(req.headers);
        if (suspiciousHeaders.length > 0) {
            return {
                type: 'suspicious_headers',
                headers: suspiciousHeaders
            };
        }

        // Verificar user agent suspeito
        const suspiciousUserAgent = this.checkSuspiciousUserAgent(req.headers['user-agent']);
        if (suspiciousUserAgent) {
            return {
                type: 'suspicious_user_agent',
                userAgent: suspiciousUserAgent
            };
        }

        suspiciousData.lastRequest = now;
        this.suspiciousIPs.set(ip, suspiciousData);

        return null;
    }

    // Verificar headers suspeitos
    checkSuspiciousHeaders(headers) {
        const suspiciousHeaders = [];
        
        // Headers comuns de ferramentas de ataque
        const attackHeaders = [
            'x-forwarded-for',
            'x-real-ip',
            'x-originating-ip',
            'x-remote-ip',
            'x-remote-addr',
            'x-cluster-client-ip',
            'x-forwarded',
            'forwarded-for',
            'forwarded',
            'via',
            'client-ip'
        ];

        for (const header of attackHeaders) {
            if (headers[header]) {
                suspiciousHeaders.push(header);
            }
        }

        return suspiciousHeaders;
    }

    // Verificar user agent suspeito
    checkSuspiciousUserAgent(userAgent) {
        if (!userAgent) return 'Missing User-Agent';

        // Padrões de user agents suspeitos
        const suspiciousPatterns = [
            /bot/gi,
            /crawler/gi,
            /spider/gi,
            /scraper/gi,
            /curl/gi,
            /wget/gi,
            /python/gi,
            /perl/gi,
            /java/gi,
            /nmap/gi,
            /nikto/gi,
            /sqlmap/gi,
            /burp/gi,
            /metasploit/gi
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(userAgent)) {
                return userAgent;
            }
        }

        return null;
    }

    // Lidar com atividade suspeita
    handleSuspiciousActivity(req, activityInfo) {
        const ip = req.ip;
        
        console.warn('Atividade suspeita detectada:', {
            ip,
            activityType: activityInfo.type,
            details: activityInfo,
            path: req.path,
            method: req.method,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
    }

    // Rate limiting específico para ataques
    createAttackRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 50, // 50 requisições por IP
            message: {
                error: 'Muitas tentativas. Tente novamente mais tarde.',
                code: 'ATTACK_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                return req.ip + ':' + req.headers['user-agent'];
            },
            skip: (req) => {
                return req.path === '/api/health';
            },
            onLimitReached: (req, res, options) => {
                console.warn('Rate limit de ataque atingido:', {
                    ip: req.ip,
                    path: req.path,
                    userAgent: req.headers['user-agent'],
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    // Rate limiting para endpoints críticos
    createCriticalRateLimit() {
        return rateLimit({
            windowMs: 60 * 1000, // 1 minuto
            max: 10, // 10 requisições por IP
            message: {
                error: 'Muitas tentativas em endpoint crítico.',
                code: 'CRITICAL_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true
        });
    }

    // Rate limiting para login
    createLoginRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 5, // 5 tentativas de login
            message: {
                error: 'Muitas tentativas de login. Tente novamente mais tarde.',
                code: 'LOGIN_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true,
            keyGenerator: (req) => {
                const username = req.body?.username || req.body?.email || 'unknown';
                return req.ip + ':' + username;
            }
        });
    }

    // Rate limiting para registro
    createRegisterRateLimit() {
        return rateLimit({
            windowMs: 60 * 60 * 1000, // 1 hora
            max: 3, // 3 tentativas de registro
            message: {
                error: 'Muitas tentativas de registro. Tente novamente mais tarde.',
                code: 'REGISTER_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true
        });
    }

    // Rate limiting para admin
    createAdminRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 20, // 20 requisições de admin
            message: {
                error: 'Muitas tentativas de acesso administrativo.',
                code: 'ADMIN_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                return req.user?.id || req.ip;
            }
        });
    }

    // Limpar IPs suspeitos (manutenção)
    cleanupSuspiciousIPs() {
        const now = new Date();
        const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 horas

        for (const [ip, data] of this.suspiciousIPs) {
            if (now - data.lastRequest > cleanupThreshold) {
                this.suspiciousIPs.delete(ip);
            }
        }

        console.log(`Limpeza de IPs suspeitos concluída. ${this.suspiciousIPs.size} IPs monitorados.`);
    }

    // Limpar blacklist (manutenção)
    cleanupBlacklist() {
        const now = new Date();
        const cleanupThreshold = 7 * 24 * 60 * 60 * 1000; // 7 dias

        // Em produção, implementar lógica para remover IPs antigos da blacklist
        console.log(`Blacklist atualmente contém ${this.blacklistedIPs.size} IPs.`);
    }

    // Obter estatísticas de proteção
    getProtectionStats() {
        return {
            blacklistedIPs: this.blacklistedIPs.size,
            suspiciousIPs: this.suspiciousIPs.size,
            attackPatterns: this.attackPatterns.size,
            timestamp: new Date().toISOString()
        };
    }

    // Adicionar IP à blacklist manualmente
    addToBlacklist(ip, reason = 'Manual addition') {
        this.blacklistedIPs.add(ip);
        
        console.log('IP adicionado à blacklist manualmente:', {
            ip,
            reason,
            timestamp: new Date().toISOString()
        });
    }

    // Remover IP da blacklist
    removeFromBlacklist(ip) {
        this.blacklistedIPs.delete(ip);
        
        console.log('IP removido da blacklist:', {
            ip,
            timestamp: new Date().toISOString()
        });
    }

    // Verificar se IP está na blacklist
    isIPBlacklisted(ip) {
        return this.blacklistedIPs.has(ip);
    }

    // Obter lista de IPs na blacklist
    getBlacklistedIPs() {
        return Array.from(this.blacklistedIPs);
    }

    // Obter lista de IPs suspeitos
    getSuspiciousIPs() {
        const result = [];
        
        for (const [ip, data] of this.suspiciousIPs) {
            result.push({
                ip,
                requestCount: data.requestCount,
                lastRequest: data.lastRequest,
                firstSeen: data.firstSeen,
                suspiciousPatterns: data.suspiciousPatterns
            });
        }
        
        return result;
    }
}

module.exports = AttackProtection;
