const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware para verificar se é admin
const requireAdmin = async (req, res, next) => {
    try {
        // Verificar se tem token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token não fornecido'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar usuário
        const user = await User.findByPk(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }

        // Verificar se é admin
        if (user.role !== 'admin' && user.username !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado. Permissões de administrador necessárias.'
            });
        }

        // Adicionar usuário ao request
        req.user = user;
        next();
    } catch (error) {
        console.error('Erro na verificação admin:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Token inválido'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Erro na autenticação'
        });
    }
};

// Middleware para verificar se é admin ou tem permissão específica
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            // Primeiro verificar se é admin
            await requireAdmin(req, res, () => {});
            
            // Verificar permissão específica se não for admin global
            if (req.user.role !== 'admin') {
                const userPermissions = req.user.permissions || [];
                
                if (!userPermissions.includes(permission)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Permissão insuficiente'
                    });
                }
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
};

// Função para gerar token admin
const generateAdminToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            role: user.role || 'user',
            isAdmin: user.role === 'admin' || user.username === 'admin'
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '24h',
            issuer: 'pro-soccer-admin',
            audience: 'pro-soccer-users'
        }
    );
};

// Função para verificar se usuário pode acessar admin
const canAccessAdmin = (user) => {
    return user.role === 'admin' || user.username === 'admin';
};

// Middleware para logging de ações admin
const adminActivityLogger = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log da ação
        console.log(`[ADMIN ACTIVITY] ${req.user.username} - ${req.method} ${req.path} - ${res.statusCode}`);
        
        // Salvar em arquivo de log se necessário
        const fs = require('fs');
        const path = require('path');
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            user: req.user.username,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };
        
        const logDir = path.join(__dirname, '../logs');
        const logFile = path.join(logDir, 'admin-activity.log');
        
        // Criar diretório se não existir
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        // Adicionar ao log
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        
        originalSend.call(this, data);
    };
    
    next();
};

// Middleware para rate limiting admin
const adminRateLimit = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // 1000 requisições por 15 minutos para admin
    message: {
        success: false,
        error: 'Muitas requisições. Tente novamente mais tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return `admin:${req.user.id}`;
    }
});

// Middleware para validar ações críticas
const requireCriticalActionValidation = (req, res, next) => {
    const criticalActions = [
        'DELETE',
        'POST /admin/users/:id/ban',
        'POST /admin/backup',
        'POST /admin/clear-cache'
    ];
    
    const action = `${req.method} ${req.route?.path || req.path}`;
    
    if (criticalActions.some(critical => action.includes(critical))) {
        // Verificar se tem confirmação
        const confirmation = req.headers['x-admin-confirmation'];
        
        if (!confirmation) {
            return res.status(400).json({
                success: false,
                error: 'Ação crítica requer confirmação',
                requiresConfirmation: true
            });
        }
        
        // Validar confirmação (poderia ser um token especial)
        if (confirmation !== process.env.ADMIN_CONFIRMATION_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Confirmação inválida'
            });
        }
    }
    
    next();
};

// Middleware para verificar sessão admin ativa
const requireActiveAdminSession = (req, res, next) => {
    // Verificar se sessão está ativa (implementar lógica de sessão)
    // Por enquanto, apenas passa
    next();
};

// Middleware para sanitizar inputs admin
const sanitizeAdminInput = (req, res, next) => {
    // Sanitizar inputs para prevenir XSS e SQL injection
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
        
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                sanitized[key] = sanitize(obj[key]);
            }
            return sanitized;
        }
        
        return obj;
    };
    
    // Sanitizar body, query e params
    if (req.body) {
        req.body = sanitize(req.body);
    }
    
    if (req.query) {
        req.query = sanitize(req.query);
    }
    
    if (req.params) {
        req.params = sanitize(req.params);
    }
    
    next();
};

// Middleware para validar permissões de recurso
const requireResourcePermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            // Admin global tem todas as permissões
            if (user.role === 'admin') {
                return next();
            }
            
            // Verificar permissões específicas do usuário
            const permissions = user.permissions || {};
            const resourcePermissions = permissions[resource] || {};
            
            if (!resourcePermissions[action]) {
                return res.status(403).json({
                    success: false,
                    error: `Permissão negada para ${action} ${resource}`
                });
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    requireAdmin,
    requirePermission,
    generateAdminToken,
    canAccessAdmin,
    adminActivityLogger,
    adminRateLimit,
    requireCriticalActionValidation,
    requireActiveAdminSession,
    sanitizeAdminInput,
    requireResourcePermission
};
