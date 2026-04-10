const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { Sequelize } = require('sequelize');
const fs = require('fs');
require('dotenv').config();

// DATABASE_URL configurada diretamente para Square Cloud
const DATABASE_URL = 'postgresql://squarecloud:t6eNrMqqk2z5Nx4pklIRA07T@square-cloud-db-ecd0071f6934489597ad31c462ce83f0.squareweb.app:7196/squarecloud';

// SSL Certificate paths for Square Cloud PostgreSQL
const certsDir = path.join(__dirname, 'certs');
let sslConfig = {};

try {
    const ca = fs.readFileSync(path.join(certsDir, 'ca-certificate.crt')).toString();
    const cert = fs.readFileSync(path.join(certsDir, 'certificate.pem')).toString();
    const key = fs.readFileSync(path.join(certsDir, 'private-key.key')).toString();
    
    sslConfig = {
        require: true,
        rejectUnauthorized: true,
        ca,
        cert,
        key
    };
    console.log('✅ Certificados SSL carregados com sucesso');
} catch (err) {
    console.log('⚠️  Certificados não encontrados, usando SSL sem verificação');
    sslConfig = {
        require: true,
        rejectUnauthorized: false
    };
}

// Usar instância compartilhada do database.js
const { sequelize } = require('./db/database');
console.log('📝 Usando Sequelize compartilhado do database.js');

// Export sequelize antes de importar modelos para evitar dependência circular
module.exports = { sequelize };

const { User, Tournament, Match, TournamentParticipant, DiscordEvent, Notification, NotificationPreference, NotificationTemplate, SiteSetting } = require('./models');
const DiscordWebhookHandler = require('./webhook/discordWebhook');
const SecurityConfig = require('./middleware/security');
const AttackProtection = require('./middleware/attackProtection');
const SecurityAuditor = require('./middleware/auditor');
const NotificationService = require('./services/notificationService');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin-new');
const authRoutes = require('./routes/auth');
const registerRoutes = require('./routes/register');
const configRoutes = require('./routes/config');
const lobbyRoutes = require('./routes/lobby');
const matchesRoutes = require('./routes/matches');
const analyticsRoutes = require('./routes/analytics');
const passport = require('./middleware/passport');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5001;
const security = new SecurityConfig();
const attackProtection = new AttackProtection();
const auditor = new SecurityAuditor();
const notificationService = new NotificationService();

// Inicializar webhook do Discord
const discordWebhook = new DiscordWebhookHandler();

// Inicializar serviço de notificações
notificationService.startAutoProcessing();

// Conexão com PostgreSQL
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Conectado ao PostgreSQL com sucesso!');
        
        // Migração: Dropar tabela site_analytics se existir (para corrigir tipo de user_id)
        try {
            await sequelize.query('DROP TABLE IF EXISTS "site_analytics" CASCADE;');
            console.log('✅ Tabela site_analytics removida para recriação com tipo correto');
        } catch (dropError) {
            console.log('⚠️  Tabela site_analytics não existia ou erro ao dropar:', dropError.message);
        }
        
        // Sincronizar modelos com o banco de dados
        await sequelize.sync({ alter: true });
        console.log('Modelos sincronizados com o banco de dados');
    } catch (error) {
        console.error('Erro de conexão com PostgreSQL:', error);
        process.exit(1);
    }
}

// Configurar CORS para permitir requisições do frontend - Square Cloud compatible
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:3000', 
        'http://localhost:5001', 
        'https://pro-soccer-online.squareweb.app', 
        'https://psobrasil.squareweb.app',
        'https://psobr.squareweb.app',
        'https://psobradminanalisesbot.squareweb.app'
    ];

app.use(cors({
    origin: function(origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(null, true); // Allow all origins in development
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
}));

// Configure session for Passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'prosoccer_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Aplicar middleware de segurança avançada
app.use(security.securityMiddleware());
app.use(attackProtection.attackProtection());

// Middleware adicional
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting específico para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas de login
    message: 'Muitas tentativas de login. Tente novamente mais tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Rate limiting específico para registro
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // 3 tentativas de registro
    message: 'Muitas tentativas de registro. Tente novamente mais tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Usar rotas do webhook com validação de segurança
// app.use('/webhook', security.validateDiscordWebhook, discordWebhook.getApp());

// Usar rotas de notificações
app.use('/notifications', notificationRoutes);

// Middleware de proteção para rotas admin
const adminProtection = (req, res, next) => {
    // Se for API route, continua normalmente
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    // Para páginas admin, verificar autenticação via cookie/token
    const token = req.cookies?.adminToken || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.redirect('/login?error=403');
    }
    
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar se usuário é admin
        const { User } = require('./models');
        User.findByPk(decoded.userId).then(user => {
            if (!user || (user.role !== 'admin' && user.username !== 'admin')) {
                return res.redirect('/login?error=403');
            }
            next();
        }).catch(() => {
            res.redirect('/login?error=403');
        });
    } catch (error) {
        res.redirect('/login?error=403');
    }
};

// Usar rotas administrativas com proteção
app.use('/admin', adminProtection, adminRoutes);

// Usar rotas de autenticação
app.use('/auth', authRoutes);

// Usar rotas de registro
app.use('/api', registerRoutes);

// Usar rotas de configurações dinâmicas
app.use('/api/config', configRoutes);

// Usar rotas do lobby
app.use('/api/lobby', lobbyRoutes);

// Usar rotas de partidas/calendário
app.use('/api/matches', matchesRoutes);

// Usar rotas de analytics
app.use('/api/analytics', analyticsRoutes);

// Usar rotas de perfil
const perfilRoutes = require('./routes/perfil');
app.use('/api/perfil', perfilRoutes);

// Servir arquivos estáticos do frontend com segurança
const frontendPath = path.join(__dirname, '..', 'frontend');

// Middleware para bloquear acesso a arquivos sensíveis
const sensitiveFilesProtection = (req, res, next) => {
    const sensitivePatterns = [
        /rocket\.js$/i,
        /admin\.js$/i,
        /\.env$/i,
        /config\.js$/i,
        /database\.js$/i,
        /\.sql$/i,
        /\.log$/i,
        /\.html$/i
    ];
    
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(req.path));
    
    if (isSensitive) {
        return res.status(403).json({ error: 'Acesso negado' });
    }
    
    next();
};

// Middleware para redirecionar .html para URLs limpas
const cleanUrlMiddleware = (req, res, next) => {
    if (req.path.endsWith('.html')) {
        const cleanPath = req.path.replace('.html', '');
        return res.redirect(301, cleanPath);
    }
    next();
};

app.use(cleanUrlMiddleware);

// Servir arquivos estáticos com proteção
app.use('/assets', sensitiveFilesProtection, express.static(path.join(frontendPath, 'assets')));
app.use('/images', sensitiveFilesProtection, express.static(path.join(frontendPath, 'images')));
app.use('/css', sensitiveFilesProtection, express.static(path.join(frontendPath, 'css')));
app.use('/js', sensitiveFilesProtection, express.static(path.join(frontendPath, 'js')));

// Não servir pasta pages diretamente - usar rotas limpas
// app.use('/pages', sensitiveFilesProtection, express.static(path.join(frontendPath, 'pages')));

// MIDDLEWARE DE AUTENTICAÇÃO - definidos antes das rotas que os usam
const requireAuth = (req, res, next) => {
    authenticateToken(req, res, next);
};

const requireAdmin = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (!req.userDetails || !req.userDetails.isAdmin) {
            return res.status(403).json({
                error: 'Acesso negado. Permissão de administrador necessária.',
                code: 'ADMIN_REQUIRED'
            });
        }
        next();
    });
};

// Rota principal - serve o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Rota para páginas - sem extensão .html
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'dashboard.html'));
});

app.get('/imprensa', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'imprensa.html'));
});

// Galeria agora é parte de Imprensa - redirecionar
app.get('/galeria', (req, res) => {
    res.redirect('/imprensa#galeria');
});

app.get('/torneios', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'torneios.html'));
});

// Rota para preview do bot CMS
app.get('/botpreviaver', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'botpreviaver.html'));
});

// MVP agora é parte de Torneios - redirecionar
app.get('/mvp', (req, res) => {
    res.redirect('/torneios#mvp');
});

app.get('/mercado', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'mercado.html'));
});

app.get('/registrar', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'registrar.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'registrar.html'));
});

// Health Check endpoint for Square Cloud
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// API endpoint para buscar perfil do jogador
app.get('/api/player/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({
            where: { username },
            attributes: ['username', 'discord_id', 'avatar_url', 'created_at', 'country', 'titles']
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Jogador não encontrado' });
        }
        
        res.json({
            username: user.username,
            discord_id: user.discord_id,
            avatar_url: user.avatar_url,
            data_de_registro: user.created_at,
            pais: user.country || 'BR',
            quantidade_de_titulos: user.titles || 0
        });
    } catch (error) {
        console.error('Erro ao buscar jogador:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Fallback para SPA - serve index.html para rotas não encontradas (exceto API)
app.get('*', (req, res) => {
    // Não interferir com rotas de API
    if (req.path.startsWith('/api') || req.path.startsWith('/webhook') || req.path.startsWith('/notifications')) {
        return res.status(404).json({ error: 'Rota não encontrada' });
    }
    // Serve index.html para rotas do frontend
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Validações avançadas
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Username deve ter entre 3 e 20 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username deve conter apenas letras, números e underscores'),
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Senha deve ter pelo menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Senha deve conter letras maiúsculas, minúsculas, números e símbolos'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Senhas não coincidem');
            }
            return true;
        })
];

const loginValidation = [
    body('username')
        .notEmpty()
        .withMessage('Username é obrigatório')
        .trim()
        .escape(),
    body('password')
        .notEmpty()
        .withMessage('Senha é obrigatória')
        .trim()
];

// Middleware de autenticação JWT avançado
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ 
            error: 'Token não fornecido',
            code: 'TOKEN_MISSING'
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Formato de token inválido',
            code: 'TOKEN_FORMAT_INVALID'
        });
    }
    
    try {
        const decoded = security.verifyJWTToken(token);
        
        if (!decoded) {
            return res.status(403).json({ 
                error: 'Token inválido ou expirado',
                code: 'TOKEN_INVALID'
            });
        }
        
        // Verificar se o usuário ainda existe
        User.findByPk(decoded.id)
            .then(user => {
                if (!user) {
                    return res.status(403).json({ 
                        error: 'Usuário não encontrado',
                        code: 'USER_NOT_FOUND'
                    });
                }
                
                // Verificar se o usuário está ativo
                if (!user.isActive) {
                    return res.status(403).json({ 
                        error: 'Conta desativada',
                        code: 'ACCOUNT_INACTIVE'
                    });
                }
                
                req.user = decoded;
                req.userDetails = user;
                next();
            })
            .catch(error => {
                console.error('Erro ao verificar usuário:', error);
                res.status(500).json({ 
                    error: 'Erro interno do servidor',
                    code: 'INTERNAL_ERROR'
                });
            });
            
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        return res.status(403).json({ 
            error: 'Token inválido',
            code: 'TOKEN_VERIFICATION_ERROR'
        });
    }
};

// (requireAuth e requireAdmin já definidos no início do arquivo - linhas 279-293)

// Rotas de Autenticação com segurança avançada
app.post('/api/register', registerLimiter, registerValidation, async (req, res) => {
    try {
        // Verificar erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados de registro inválidos',
                details: errors.array(),
                code: 'VALIDATION_ERROR'
            });
        }

        const { username, email, password } = req.body;
        
        // Verificar se usuário já existe
        const existingUser = await User.findOne({
            where: { 
                [sequelize.Sequelize.Op.or]: [{ username }, { email }]
            }
        });
        
        if (existingUser) {
            const field = existingUser.username === username ? 'username' : 'email';
            return res.status(400).json({ 
                error: `${field === 'username' ? 'Username' : 'Email'} já está em uso`,
                code: 'USER_EXISTS',
                field
            });
        }
        
        // Hash da senha com salt rounds aumentado
        const hashedPassword = await security.hashPassword(password);
        
        // Criar usuário com campos de segurança
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            rank: 1000,
            region: 'BR',
            isActive: true,
            emailVerified: false,
            lastPasswordChange: new Date(),
            loginAttempts: 0,
            lockedUntil: null
        });
        
        // Gerar token JWT
        const token = security.generateJWTToken({
            id: user.id,
            username: user.username,
            email: user.email
        });
        
        // Log de segurança
        console.log('Novo usuário registrado:', {
            id: user.id,
            username: user.username,
            email: user.email,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
        
        // Enviar notificação para Discord (se configurado)
        if (process.env.DISCORD_WEBHOOK_URL) {
            await discordWebhook.sendDiscordMessage(
                `Novo usuário registrado: ${username}`,
                discordWebhook.createEmbed(
                    'Novo Registro',
                    `Usuário ${username} se registrou no sistema.`,
                    0x00ff00,
                    [
                        {
                            name: 'Username',
                            value: username,
                            inline: true
                        },
                        {
                            name: 'Email',
                            value: email,
                            inline: true
                        },
                        {
                            name: 'IP',
                            value: req.ip,
                            inline: true
                        }
                    ]
                )
            );
        }
        
        res.status(201).json({
            message: 'Usuário criado com sucesso!',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rank: user.rank,
                region: user.region,
                isActive: user.isActive,
                emailVerified: user.emailVerified
            }
        });
        
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ 
            error: 'Erro no servidor',
            code: 'REGISTRATION_ERROR'
        });
    }
});

app.post('/api/login', loginLimiter, loginValidation, async (req, res) => {
    try {
        // Verificar erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados de login inválidos',
                details: errors.array(),
                code: 'VALIDATION_ERROR'
            });
        }

        const { username, password } = req.body;
        
        // Encontrar usuário
        const user = await User.findOne({
            where: { 
                [sequelize.Sequelize.Op.or]: [{ username }, { email: username }]
            }
        });
        
        if (!user) {
            // Log de tentativa de login falha
            console.warn('Login falha - usuário não encontrado:', {
                username,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                timestamp: new Date().toISOString()
            });
            
            return res.status(401).json({ 
                error: 'Usuário ou senha incorretos',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        // Verificar se a conta está bloqueada
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 1000);
            return res.status(423).json({ 
                error: 'Conta bloqueada. Tente novamente mais tarde.',
                code: 'ACCOUNT_LOCKED',
                retryAfter: remainingTime
            });
        }
        
        // Verificar se a conta está ativa
        if (!user.isActive) {
            return res.status(403).json({ 
                error: 'Conta desativada',
                code: 'ACCOUNT_INACTIVE'
            });
        }
        
        // Verificar senha
        const isMatch = await security.verifyPassword(password, user.password);
        
        if (!isMatch) {
            // Incrementar tentativas de login
            const loginAttempts = (user.loginAttempts || 0) + 1;
            const maxAttempts = 5;
            
            if (loginAttempts >= maxAttempts) {
                // Bloquear conta por 15 minutos
                const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
                await user.update({
                    loginAttempts,
                    lockedUntil
                });
                
                console.warn('Conta bloqueada por tentativas excessivas:', {
                    userId: user.id,
                    username: user.username,
                    ip: req.ip,
                    loginAttempts,
                    timestamp: new Date().toISOString()
                });
                
                return res.status(423).json({ 
                    error: 'Conta bloqueada por tentativas excessivas. Tente novamente em 15 minutos.',
                    code: 'ACCOUNT_LOCKED',
                    retryAfter: 15 * 60
                });
            } else {
                await user.update({ loginAttempts });
            }
            
            // Log de tentativa de login falha
            console.warn('Login falha - senha incorreta:', {
                userId: user.id,
                username: user.username,
                ip: req.ip,
                loginAttempts,
                timestamp: new Date().toISOString()
            });
            
            return res.status(401).json({ 
                error: 'Usuário ou senha incorretos'
            });
        }
        
        // Resetar tentativas de login
        await user.update({
            loginAttempts: 0,
            lockedUntil: null,
            lastLogin: new Date(),
            isOnline: true
        });
        
        // Gerar token JWT
        const token = security.generateJWTToken({
            id: user.id,
            username: user.username,
            email: user.email
        });
        
        // Log de login bem-sucedido
        console.log('Login bem-sucedido:', {
            userId: user.id,
            username: user.username,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
        
        // Enviar notificação para Discord (se configurado)
        if (user.discordChannelId) {
            await discordWebhook.sendDiscordMessage(
                `Login bem-sucedido: ${user.username}`,
                discordWebhook.createEmbed(
                    'Login Bem-Sucedido!',
                    `Jogador ${user.username} fez login no sistema.`,
                    0x00ff00,
                    [
                        {
                            name: 'Username',
                            value: user.username,
                            inline: true
                        },
                        {
                            name: 'Rank',
                            value: user.rank,
                            inline: true
                        },
                        {
                            name: 'IP',
                            value: req.ip,
                            inline: true
                        }
                    ]
                )
            );
        }
        
        res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rank: user.rank,
                region: user.region,
                wins: user.wins,
                losses: user.losses,
                goals: user.goals,
                assists: user.assists,
                discordUsername: user.discordUsername,
                discordAvatar: user.discordAvatar,
                isActive: user.isActive,
                emailVerified: user.emailVerified
            }
        });
        
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ 
            error: 'Erro no servidor',
            code: 'LOGIN_ERROR'
        });
    }
});

// Rotas do Jogo
app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rank: user.rank,
                region: user.region,
                wins: user.wins,
                matches: user.totalMatches,
                goals: user.goals,
                assists: user.assists,
                isOnline: user.isOnline,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                discordUsername: user.discordUsername,
                discordAvatar: user.discordAvatar
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter perfil:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

app.put('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const updates = req.body;
        const user = await User.findByPk(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // Permitir atualizar apenas campos específicos
        const allowedUpdates = ['email', 'region', 'bio', 'favoriteTeam', 'playStyle'];
        const updateData = {};
        
        allowedUpdates.forEach(field => {
            if (updates[field]) {
                updateData[field] = updates[field];
            }
        });
        
        const updatedUser = await User.update(updateData, {
            where: { id: req.user.id },
            returning: true
        });
        
        // Notificar Discord sobre atualização
        if (user.discordChannelId && Object.keys(updateData).length > 0) {
            const embed = discordWebhook.createEmbed(
                'Perfil Atualizado!',
                `As informações de ${user.username} foram atualizadas.`,
                0x00ff00,
                Object.entries(updateData).map(([key, value]) => ({
                    name: key,
                    value: value,
                    inline: true
                }))
            );
            await discordWebhook.sendDiscordMessage(
                user.discordChannelId,
                `Perfil de ${user.username} atualizado!`,
                embed
            );
        }
        
        res.json({
            message: 'Perfil atualizado com sucesso!',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                rank: updatedUser.rank,
                region: updatedUser.region,
                wins: updatedUser.wins,
                losses: updatedUser.losses,
                goals: updatedUser.goals,
                assists: updatedUser.assists,
                isOnline: updatedUser.isOnline,
                lastLogin: updatedUser.lastLogin,
                createdAt: updatedUser.createdAt,
                discordUsername: updatedUser.discordUsername,
                discordAvatar: updatedUser.discordAvatar
            }
        });
        
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rotas de Rankings
app.get('/api/rankings', async (req, res) => {
    try {
        const { region = 'BR', limit = 10 } = req.query;
        
        const users = await User.findAll({
            where: { region },
            order: [['rank', 'ASC']],
            limit: parseInt(limit),
            include: [
                {
                    model: User,
                    as: 'user'
                }
            ]
        });
        
        const rankings = users.map((user, index) => ({
            position: index + 1,
            player: {
                name: user.username,
                region: user.region,
                avatar: `/api/user/avatar/${user.id}`,
                rank: user.rank,
                matches: user.totalMatches,
                winRate: user.winRate,
                goals: user.goals,
                assists: user.assists
            },
            rating: user.rank,
            trend: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'down' : 'neutral'
        }));
        
        res.json({
            rankings,
            total: users.length,
            region
        });
        
    } catch (error) {
        console.error('Erro ao buscar rankings:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rotas de Torneios
app.get('/api/tournaments', async (req, res) => {
    try {
        const tournaments = await Tournament.findAll({
            order: [['startDate', 'ASC']]
        });
        
        res.json({
            tournaments: tournaments.map(tournament => ({
                id: tournament.id,
                name: tournament.name,
                type: tournament.type,
                prize: tournament.prize,
                startDate: tournament.startDate,
                endDate: tournament.endDate,
                status: tournament.status,
                maxParticipants: tournament.maxParticipants,
                currentParticipants: tournament.currentParticipants,
                description: tournament.description,
                discordChannelId: tournament.discordChannelId
            }))
        });
        
    } catch (error) {
        console.error('Erro ao buscar torneios:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rotas de Partidas
app.get('/api/matches', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const matches = await Match.findAll({
            include: [
                {
                    model: Tournament,
                    as: 'tournament'
                },
                {
                    model: MatchTeam,
                    as: 'teams'
                }
            ],
            order: [['date', 'DESC']],
            limit: parseInt(limit)
        });
        
        // Criar equipes
        const teams = [
            {
                matchId: matches[0].id,
                userId: sampleUsers[0]?.id || null,
                teamName: 'Flamengo Digital',
                score: 2,
                formation: '4-4-2',
                playStyle: 'balanced'
            },
            {
                matchId: matches[0].id,
                userId: sampleUsers[1]?.id || null,
                teamName: 'Palmeiras eSports',
                score: 1,
                formation: '4-4-2',
                playStyle: 'balanced'
            }
        ];
        
        await MatchTeam.bulkCreate(teams);

        res.json({
            matches: matches.map(match => ({
                id: match.id,
                tournament: match.tournament,
                teams: match.teams,
                date: match.date,
                status: match.status,
                round: match.round,
                duration: match.duration,
                winner: match.winner,
                winnerTeamName: match.winnerTeamName,
                discordChannelId: match.discordChannelId
            }))
        });
        
    } catch (error) {
        console.error('Erro ao buscar partidas:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rotas de Discord
app.post('/api/discord/notify/tournament/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const tournament = await Tournament.findByPk(id);
        
        if (!tournament) {
            return res.status(404).json({ message: 'Torneio não encontrado' });
        }
        
        // Enviar notificação para o Discord
        if (tournament.discordChannelId) {
            await discordWebhook.notifyTournamentCreated(tournament, tournament.discordChannelId);
        }
        
        res.json({
            message: 'Notificação enviada com sucesso',
            tournament
        });
        
    } catch (error) {
        console.error('Erro ao notificar torneio:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

app.post('/api/discord/notify/match/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const match = await Match.findByPk(id, {
            include: [
                {
                    model: Tournament,
                    as: 'tournament'
                },
                {
                    model: MatchTeam,
                    as: 'teams'
                }
            ]
        });
        
        if (!match) {
            return res.status(404).json({ message: 'Partida não encontrada' });
        }
        
        // Enviar notificação para o Discord
        if (match.discordChannelId) {
            if (match.status === 'scheduled') {
                await discordWebhook.notifyMatchScheduled(match, match.discordChannelId);
            } else if (match.status === 'finished') {
                await discordWebhook.notifyMatchFinished(match, match.discordChannelId);
            }
        }
        
        res.json({
            message: 'Notificação enviada com sucesso',
            match
        });
        
    } catch (error) {
        console.error('Erro ao notificar partida:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para vincular usuário do Discord
app.post('/api/discord/link', requireAuth, async (req, res) => {
    try {
        const { discordId, discordUsername, discordAvatar } = req.body;
        const userId = req.user.id;
        
        const user = await User.findByPk(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // Verificar se o Discord ID já está em uso
        const existingUser = await User.findOne({ where: { discordId } });
        
        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ message: 'Este Discord ID já está vinculado a outra conta' });
        }
        
        // Atualizar informações do Discord
        await user.update({
            discordId,
            discordUsername,
            discordAvatar,
            isOnline: true
        });
        
        // Criar evento no banco de dados
        await DiscordEvent.create({
            eventType: 'user_updated',
            userId: user.id,
            data: {
                discordId,
                discordUsername,
                discordAvatar
            }
        });
        
        res.json({
            message: 'Conta Discord vinculada com sucesso!',
            user: {
                id: user.id,
                username: user.username,
                discordUsername: user.discordUsername,
                discordAvatar: user.discordAvatar
            }
        });
        
    } catch (error) {
        console.error('Erro ao vincular Discord:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para criar torneio via Discord
app.post('/api/tournaments', requireAuth, async (req, res) => {
    try {
        const { name, type, prize, startDate, endDate, maxParticipants, description, discordChannelId } = req.body;
        
        const tournament = await Tournament.create({
            name,
            type,
            prize,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            maxParticipants,
            description,
            status: 'upcoming',
            currentParticipants: 0,
            discordChannelId
        });
        
        // Enviar notificação para o Discord
        if (discordChannelId) {
            await discordWebhook.notifyTournamentCreated(tournament, discordChannelId);
        }
        
        res.status(201).json({
            message: 'Torneio criado com sucesso!',
            tournament
        });
        
    } catch (error) {
        console.error('Erro ao criar torneio:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota de saúde
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: sequelize.connection.readyState === 1 ? 'connected' : 'disconnected',
        discord: discordWebhook ? 'active' : 'inactive'
    });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.stack : 'Algo deu errado'
    });
});

// Inicializar servidor e banco de dados
async function startServer() {
    try {
        // Importar todos os modelos para garantir que serão sincronizados
        const models = require('./models');
        console.log('📊 Modelos carregados:', Object.keys(models).filter(k => k !== 'sequelize').join(', '));
        
        // Sincronizar tabelas do banco (apenas cria novas, não altera existentes)
        console.log('🔄 Verificando tabelas do banco...');
        await sequelize.sync({ force: false, alter: false });
        console.log('✅ Tabelas verificadas!');
        
        await initializeDatabase();
        
        // Inicializar configurações padrão do site (com tratamento de erro)
        try {
            await SiteSetting.initializeDefaults();
        } catch (err) {
            console.log('⚠️  Erro ao inicializar defaults (tabelas podem não existir ainda):', err.message);
        }
        
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log('Ambiente: ' + (process.env.NODE_ENV || 'development'));
            console.log('API disponível em: http://localhost:${PORT}/api');
            console.log('Webhook Discord: ' + (discordWebhook ? 'ativo' : 'inativo'));
            console.log('Banco de Dados: PostgreSQL - Square Cloud');
            console.log('Painel Admin: http://localhost:${PORT}/admin');
        });
    } catch (error) {
        console.error('Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Iniciar servidor
startServer();

module.exports = app;
module.exports.sequelize = sequelize;
