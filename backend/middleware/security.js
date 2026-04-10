const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const expressSession = require('express-session');
const csurf = require('csurf');
const validator = require('validator');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { 
    requireAdmin, 
    generateAdminToken, 
    canAccessAdmin,
    adminActivityLogger,
    adminRateLimit,
    requireCriticalActionValidation,
    sanitizeAdminInput,
    requireResourcePermission
} = require('./adminAuth');

// Configurações de segurança avançadas
class SecurityConfig {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
        this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
        this.saltRounds = 12;
        this.maxLoginAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutos
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 horas
        this.csrfTokenSecret = crypto.randomBytes(32).toString('hex');
    }

    // Middleware de segurança principal
    securityMiddleware() {
        return [
            this.helmetConfig(),
            this.corsConfig(),
            this.rateLimitConfig(),
            this.securityHeaders(),
            this.antiCSRF(),
            this.inputValidation(),
            this.sessionSecurity()
        ];
    }

    // Helmet com configurações avançadas
    helmetConfig() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    imgSrc: ["'self'", "data:", "https:", "https://cdn.discordapp.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    connectSrc: ["'self'", "https://discord.com"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    manifestSrc: ["'self'"],
                    workerSrc: ["'self'"],
                    upgradeInsecureRequests: []
                }
            },
            crossOriginEmbedderPolicy: false,
            crossOriginResourcePolicy: { policy: "cross-origin" },
            dnsPrefetchControl: { allow: false },
            frameguard: { action: 'deny' },
            hidePoweredBy: true,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            ieNoOpen: true,
            noSniff: true,
            originAgentCluster: true,
            permittedCrossDomainPolicies: false,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            xssFilter: true
        });
    }

    // CORS configurado para produção
    corsConfig() {
        return cors({
            origin: function (origin, callback) {
                const allowedOrigins = [
                    'https://pro-soccer-online.squareweb.app',
                    'https://psobr.squareweb.app',
                    'https://psobradminanalisesbot.squareweb.app',
                    'http://localhost:3000',
                    'http://127.0.0.1:8000'
                ];
                
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Não permitido pelo CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
            exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
            maxAge: 86400 // 24 horas
        });
    }

    // Rate limiting avançado
    rateLimitConfig() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // limite por IP
            message: {
                error: 'Muitas tentativas. Tente novamente mais tarde.',
                retryAfter: 15 * 60 * 1000
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
                console.warn('Rate limit atingido:', req.ip, req.path);
                res.status(429).json({
                    error: 'Muitas tentativas. Tente novamente mais tarde.',
                    retryAfter: options.windowMs
                });
            }
        });
    }

    // Headers de segurança adicionais
    securityHeaders() {
        return (req, res, next) => {
            // Headers de segurança personalizados
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
            res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
            
            // Remove informações do servidor
            res.removeHeader('X-Powered-By');
            
            next();
        };
    }

    // Proteção CSRF
    antiCSRF() {
        return (req, res, next) => {
            if (req.method === 'GET' || req.path === '/api/health') {
                return next();
            }

            // Skip CSRF for API endpoints that don't require session
            if (req.path.startsWith('/api/config') || req.path.startsWith('/api/health')) {
                return next();
            }

            const token = req.headers['x-csrf-token'] || req.body?._csrf;
            const sessionToken = req.session?.csrfToken;

            if (!token || !sessionToken || token !== sessionToken) {
                return res.status(403).json({ error: 'Token CSRF inválido' });
            }

            next();
        };
    }

    // Validação de entrada
    inputValidation() {
        return (req, res, next) => {
            // Sanitização de entrada
            if (req.body) {
                req.body = this.sanitizeInput(req.body);
            }
            
            if (req.query) {
                req.query = this.sanitizeInput(req.query);
            }
            
            if (req.params) {
                req.params = this.sanitizeInput(req.params);
            }

            // Validação básica
            if (req.body && typeof req.body === 'object') {
                const validationErrors = this.validateInput(req.body);
                if (validationErrors.length > 0) {
                    return res.status(400).json({
                        error: 'Dados inválidos',
                        details: validationErrors
                    });
                }
            }

            next();
        };
    }

    // Segurança de sessão
    sessionSecurity() {
        return (req, res, next) => {
            // Configurar cookies seguros
            if (req.session) {
                req.session.cookie.secure = process.env.NODE_ENV === 'production';
                req.session.cookie.httpOnly = true;
                req.session.cookie.sameSite = 'strict';
                req.session.cookie.maxAge = this.sessionTimeout;
            }

            next();
        };
    }

    // Sanitização de entrada
    sanitizeInput(input) {
        if (typeof input === 'string') {
            return validator.escape(input.trim());
        }
        
        if (Array.isArray(input)) {
            return input.map(item => this.sanitizeInput(item));
        }
        
        if (typeof input === 'object' && input !== null) {
            const sanitized = {};
            for (const key in input) {
                if (input.hasOwnProperty(key)) {
                    sanitized[key] = this.sanitizeInput(input[key]);
                }
            }
            return sanitized;
        }
        
        return input;
    }

    // Validação de entrada
    validateInput(data) {
        const errors = [];
        
        // Validação de email
        if (data.email && !validator.isEmail(data.email)) {
            errors.push('Email inválido');
        }
        
        // Validação de username
        if (data.username && !validator.isAlphanumeric(data.username)) {
            errors.push('Username deve conter apenas letras e números');
        }
        
        // Validação de senha
        if (data.password) {
            if (data.password.length < 8) {
                errors.push('Senha deve ter pelo menos 8 caracteres');
            }
            if (!validator.isStrongPassword(data.password, {
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 1
            })) {
                errors.push('Senha deve conter letras maiúsculas, minúsculas, números e símbolos');
            }
        }
        
        // Validação de IDs
        if (data.id && !validator.isUUID(data.id)) {
            errors.push('ID inválido');
        }
        
        return errors;
    }

    // Geração de token CSRF
    generateCSRFToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Geração de token JWT seguro
    generateJWTToken(payload) {
        const jwt = require('jsonwebtoken');
        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: '24h',
            algorithm: 'HS256',
            issuer: 'pro-soccer-online',
            audience: 'pro-soccer-online-users'
        });
    }

    // Verificação de token JWT
    verifyJWTToken(token) {
        const jwt = require('jsonwebtoken');
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            return null;
        }
    }

    // Middleware de autenticação
    requireAuth(req, res, next) {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token de autenticação não fornecido' });
        }

        const decoded = this.verifyJWTToken(token);
        
        if (!decoded) {
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }

        req.user = decoded;
        next();
    }

    // Hash de senha seguro
    async hashPassword(password) {
        const bcrypt = require('bcryptjs');
        return await bcrypt.hash(password, this.saltRounds);
    }

    // Verificação de senha
    async verifyPassword(password, hash) {
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(password, hash);
    }

    // Criptografia de dados sensíveis
    encrypt(text) {
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, this.encryptionKey);
        cipher.setAAD(Buffer.from('pro-soccer-online', 'utf8'));
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    // Descriptografia de dados sensíveis
    decrypt(encryptedData) {
        const algorithm = 'aes-256-gcm';
        const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
        decipher.setAAD(Buffer.from('pro-soccer-online', 'utf8'));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    // Rate limiting por usuário
    createUserRateLimit() {
        const userLimits = new Map();
        
        return (req, res, next) => {
            const userId = req.user?.id || req.ip;
            const now = Date.now();
            const userLimit = userLimits.get(userId) || { count: 0, resetTime: now + 15 * 60 * 1000 };
            
            if (now > userLimit.resetTime) {
                userLimit.count = 0;
                userLimit.resetTime = now + 15 * 60 * 1000;
            }
            
            userLimit.count++;
            userLimits.set(userId, userLimit);
            
            if (userLimit.count > 50) { // 50 requisições por usuário em 15 minutos
                return res.status(429).json({
                    error: 'Muitas tentativas. Tente novamente mais tarde.',
                    retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
                });
            }
            
            next();
        };
    }

    // Monitoramento de segurança
    securityMonitor() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Log de requisições suspeitas
            if (req.path.includes('admin') || req.path.includes('delete')) {
                console.warn('Requisição sensível:', {
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    userAgent: req.headers['user-agent'],
                    timestamp: new Date().toISOString()
                });
            }
            
            // Verificação de padrões suspeitos
            const suspiciousPatterns = [
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /union\s+select/gi,
                /drop\s+table/gi,
                /insert\s+into/gi,
                /delete\s+from/gi
            ];
            
            const requestBody = JSON.stringify(req.body);
            const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestBody));
            
            if (isSuspicious) {
                console.error('Padrão suspeito detectado:', {
                    ip: req.ip,
                    path: req.path,
                    body: requestBody,
                    timestamp: new Date().toISOString()
                });
                
                return res.status(403).json({ error: 'Requisição bloqueada por segurança' });
            }
            
            // Medir tempo de resposta
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                
                if (duration > 5000) { // Mais de 5 segundos
                    console.warn('Requisição lenta detectada:', {
                        ip: req.ip,
                        path: req.path,
                        duration,
                        timestamp: new Date().toISOString()
                    });
                }
            });
            
            next();
        };
    }

    // Proteção contra ataques de força bruta
    bruteForceProtection() {
        const attempts = new Map();
        
        return (req, res, next) => {
            const key = req.ip + ':' + req.path;
            const now = Date.now();
            const userAttempts = attempts.get(key) || { count: 0, lockoutUntil: 0 };
            
            if (userAttempts.lockoutUntil > now) {
                const remainingTime = Math.ceil((userAttempts.lockoutUntil - now) / 1000);
                return res.status(429).json({
                    error: 'Conta bloqueada. Tente novamente mais tarde.',
                    retryAfter: remainingTime
                });
            }
            
            if (req.path === '/api/login' && req.method === 'POST') {
                userAttempts.count++;
                
                if (userAttempts.count >= this.maxLoginAttempts) {
                    userAttempts.lockoutUntil = now + this.lockoutTime;
                    userAttempts.count = 0;
                    
                    console.warn('Bloqueio por força bruta:', {
                        ip: req.ip,
                        path: req.path,
                        timestamp: new Date().toISOString()
                    });
                    
                    return res.status(429).json({
                        error: 'Muitas tentativas de login. Conta bloqueada por 15 minutos.',
                        retryAfter: this.lockoutTime / 1000
                    });
                }
            }
            
            attempts.set(key, userAttempts);
            next();
        };
    }

    // Validação de webhook Discord
    validateDiscordWebhook(req, res, next) {
        const signature = req.header('x-signature-ed25519');
        const timestamp = req.header('x-signature-timestamp');
        
        if (!signature || !timestamp) {
            return res.status(401).json({ error: 'Assinatura do webhook inválida' });
        }
        
        // Verificar se o timestamp não é muito antigo (5 minutos)
        const currentTime = Math.floor(Date.now() / 1000);
        const webhookTime = parseInt(timestamp);
        
        if (Math.abs(currentTime - webhookTime) > 300) {
            return res.status(401).json({ error: 'Timestamp do webhook inválido' });
        }
        
        // Verificar assinatura (implementação simplificada)
        const body = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', timestamp + body)
            .update('discord-webhook-secret')
            .digest('hex');
        
        if (signature !== expectedSignature) {
            return res.status(401).json({ error: 'Assinatura do webhook inválida' });
        }
        
        next();
    }
}

module.exports = SecurityConfig;

// Wrapper functions para middleware que precisam ser exportados individualmente
const securityInstance = new SecurityConfig();

module.exports.requireAuth = (req, res, next) => {
    return securityInstance.requireAuth(req, res, next);
};

module.exports.validateDiscordWebhook = (req, res, next) => {
    return securityInstance.validateDiscordWebhook(req, res, next);
};

module.exports.createRateLimit = (options) => {
    return securityInstance.createRateLimit(options);
};

// Exportar funções de admin
module.exports.requireAdmin = requireAdmin;
module.exports.generateAdminToken = generateAdminToken;
module.exports.canAccessAdmin = canAccessAdmin;
module.exports.adminActivityLogger = adminActivityLogger;
module.exports.adminRateLimit = adminRateLimit;
module.exports.requireCriticalActionValidation = requireCriticalActionValidation;
module.exports.sanitizeAdminInput = sanitizeAdminInput;
module.exports.requireResourcePermission = requireResourcePermission;
