const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const { sequelize } = require('./db/database');
const { User, Tournament, Match, TournamentParticipant, DiscordEvent, Notification, NotificationPreference, NotificationTemplate } = require('./models');
const DiscordWebhookHandler = require('./webhook/discordWebhook');
const SecurityConfig = require('./middleware/security');
const AttackProtection = require('./middleware/attackProtection');
const SecurityAuditor = require('./middleware/auditor');
const NotificationService = require('./services/notificationService');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

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
        await sequelize.sync({ force: false, alter: true });
        console.log('Banco de dados sincronizado com sucesso!');
    } catch (error) {
        console.error('Erro de conexão com PostgreSQL:', error);
        process.exit(1);
    }
}

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
app.use('/webhook', security.validateDiscordWebhook, discordWebhook.getApp());

// Usar rotas de notificações
app.use('/notifications', notificationRoutes);

// Usar rotas administrativas
app.use('/admin', adminRoutes);

// Servir arquivos estáticos do frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.use('/pages', express.static(path.join(frontendPath, 'pages')));

// Rota principal - serve o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Rota para páginas
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'dashboard.html'));
});

app.get('/imprensa', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'imprensa.html'));
});

app.get('/galeria', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'galeria.html'));
});

app.get('/torneios', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'torneios.html'));
});

app.get('/mercado', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'mercado.html'));
});

app.get('/mvp', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'mvp.html'));
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

// Middleware de verificação de usuário
const requireAuth = (req, res, next) => {
    authenticateToken(req, res, next);
};

// Middleware de verificação de administrador
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
                error: 'Usuário ou senha incorretos',
                code: 'INVALID_CREDENTIALS',
                remainingAttempts: maxAttempts - loginAttempts
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
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log('Ambiente: ' + (process.env.NODE_ENV || 'development'));
            console.log('API disponível em: http://localhost:${PORT}/api');
            console.log('Webhook Discord: ' + (discordWebhook ? 'ativo' : 'inativo'));
            console.log('Banco de Dados: PostgreSQL - Square Cloud');
        });
    } catch (error) {
        console.error('Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Iniciar servidor
startServer();

module.exports = app;
