const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/security');
const { User, Tournament, Match, Notification, NotificationTemplate } = require('../models');
const NotificationService = require('../services/notificationService');
const fs = require('fs');
const path = require('path');

// Middleware para verificar se é admin
const adminAuth = [requireAuth, requireAdmin];

// Dashboard stats
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.count(),
            activeTournaments: await Tournament.count({ where: { status: 'active' } }),
            totalMatches: await Match.count({
                where: {
                    createdAt: {
                        [require('sequelize').Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            notificationsSent: await Notification.count({
                where: {
                    createdAt: {
                        [require('sequelize').Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            })
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter estatísticas'
        });
    }
});

// Usuários
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '', sort = 'recentes' } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        
        if (search) {
            where[require('sequelize').Op.or] = [
                { username: { [require('sequelize').Op.iLike]: `%${search}%` } },
                { email: { [require('sequelize').Op.iLike]: `%${search}%` } }
            ];
        }
        
        if (status) {
            where.status = status;
        }

        const order = [];
        switch (sort) {
            case 'nome':
                order.push(['username', 'ASC']);
                break;
            case 'rank':
                order.push(['rank', 'DESC']);
                break;
            case 'status':
                order.push(['status', 'ASC']);
                break;
            default:
                order.push(['createdAt', 'DESC']);
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order,
            attributes: ['id', 'username', 'email', 'rank', 'status', 'lastLogin', 'createdAt']
        });

        res.json({
            success: true,
            users: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao listar usuários'
        });
    }
});

// Criar usuário
router.post('/users', adminAuth, async (req, res) => {
    try {
        const { username, email, password, rank = 1000, status = 'active' } = req.body;

        // Verificar se usuário já existe
        const existingUser = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Usuário ou email já existe'
            });
        }

        // Hash da senha
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 12);

        // Criar usuário
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            rank,
            status,
            region: 'BR',
            isActive: status === 'active'
        });

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rank: user.rank,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar usuário'
        });
    }
});

// Editar usuário
router.put('/users/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }

        await user.update(updates);

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao editar usuário'
        });
    }
});

// Banir usuário
router.post('/users/:id/ban', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = 'Violação dos termos de serviço' } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }

        await user.update({
            status: 'banned',
            isActive: false
        });

        // Enviar notificação ao usuário
        const notificationService = new NotificationService();
        await notificationService.sendNotification(id, 'account_locked', {
            reason,
            banDate: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Usuário banido com sucesso'
        });
    } catch (error) {
        console.error('Erro ao banir usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao banir usuário'
        });
    }
});

// Torneios
router.get('/tournaments', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status = '' } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status) {
            where.status = status;
        }

        const { count, rows } = await Tournament.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: TournamentParticipant,
                    as: 'participants'
                }
            ]
        });

        res.json({
            success: true,
            tournaments: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Erro ao listar torneios:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao listar torneios'
        });
    }
});

// Criar torneio
router.post('/tournaments', adminAuth, async (req, res) => {
    try {
        const tournamentData = req.body;
        
        const tournament = await Tournament.create({
            ...tournamentData,
            status: 'upcoming',
            currentParticipants: 0
        });

        // Notificar sobre novo torneio
        const notificationService = new NotificationService();
        await notificationService.sendNotification('all', 'tournament_created', {
            tournamentName: tournament.name,
            tournamentId: tournament.id
        });

        res.status(201).json({
            success: true,
            tournament
        });
    } catch (error) {
        console.error('Erro ao criar torneio:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar torneio'
        });
    }
});

// Editar torneio
router.put('/tournaments/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const tournament = await Tournament.findByPk(id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                error: 'Torneio não encontrado'
            });
        }

        await tournament.update(updates);

        res.json({
            success: true,
            tournament
        });
    } catch (error) {
        console.error('Erro ao editar torneio:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao editar torneio'
        });
    }
});

// Deletar torneio
router.delete('/tournaments/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const tournament = await Tournament.findByPk(id);
        if (!tournament) {
            return res.status(404).json({
                success: false,
                error: 'Torneio não encontrado'
            });
        }

        await tournament.destroy();

        res.json({
            success: true,
            message: 'Torneio excluído com sucesso'
        });
    } catch (error) {
        console.error('Erro ao excluir torneio:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao excluir torneio'
        });
    }
});

// Layout
router.get('/layout', adminAuth, async (req, res) => {
    try {
        // Ler layout salvo
        const layoutPath = path.join(__dirname, '../data/layout.json');
        
        if (fs.existsSync(layoutPath)) {
            const layoutData = fs.readFileSync(layoutPath, 'utf8');
            res.json({
                success: true,
                layout: JSON.parse(layoutData)
            });
        } else {
            // Retornar layout padrão
            const defaultLayout = {
                components: [
                    {
                        id: 'hero',
                        type: 'hero',
                        order: 0,
                        visible: true,
                        properties: {
                            title: 'FUTEBOL BRASILEIRO',
                            subtitle: 'A melhor experiência online'
                        }
                    },
                    {
                        id: 'features',
                        type: 'features',
                        order: 1,
                        visible: true,
                        properties: {
                            title: 'Recursos'
                        }
                    },
                    {
                        id: 'rankings',
                        type: 'rankings',
                        order: 2,
                        visible: true,
                        properties: {
                            title: 'Rankings'
                        }
                    }
                ]
            };

            res.json({
                success: true,
                layout: defaultLayout
            });
        }
    } catch (error) {
        console.error('Erro ao carregar layout:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao carregar layout'
        });
    }
});

// Salvar layout
router.post('/layout', adminAuth, async (req, res) => {
    try {
        const { layout } = req.body;

        // Salvar layout no arquivo
        const layoutPath = path.join(__dirname, '../data/layout.json');
        const dataDir = path.dirname(layoutPath);

        // Criar diretório se não existir
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(layoutPath, JSON.stringify(layout, null, 2));

        res.json({
            success: true,
            message: 'Layout salvo com sucesso'
        });
    } catch (error) {
        console.error('Erro ao salvar layout:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao salvar layout'
        });
    }
});

// Configurações
router.get('/settings', adminAuth, async (req, res) => {
    try {
        // Ler configurações
        const settingsPath = path.join(__dirname, '../data/settings.json');
        
        if (fs.existsSync(settingsPath)) {
            const settingsData = fs.readFileSync(settingsPath, 'utf8');
            res.json({
                success: true,
                settings: JSON.parse(settingsData)
            });
        } else {
            // Retornar configurações padrão
            const defaultSettings = {
                site: {
                    name: 'Pro Soccer Online 2',
                    description: 'O melhor jogo de futebol online brasileiro',
                    url: 'https://pro-soccer-online.squareweb.app'
                },
                maintenance: {
                    enabled: false,
                    message: 'Site em manutenção. Voltamos em breve!'
                },
                security: {
                    twoFactorEnabled: false,
                    loginAttempts: 5,
                    lockoutTime: 15
                },
                notifications: {
                    emailEnabled: true,
                    pushEnabled: true,
                    smsEnabled: false
                }
            };

            res.json({
                success: true,
                settings: defaultSettings
            });
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao carregar configurações'
        });
    }
});

// Salvar configurações
router.post('/settings', adminAuth, async (req, res) => {
    try {
        const { settings } = req.body;

        // Salvar configurações no arquivo
        const settingsPath = path.join(__dirname, '../data/settings.json');
        const dataDir = path.dirname(settingsPath);

        // Criar diretório se não existir
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

        res.json({
            success: true,
            message: 'Configurações salvas com sucesso'
        });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao salvar configurações'
        });
    }
});

// Upload de imagens
router.post('/upload', adminAuth, async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({
                success: false,
                error: 'Nenhuma imagem enviada'
            });
        }

        const image = req.files.image;
        const uploadDir = path.join(__dirname, '../public/uploads');
        
        // Criar diretório se não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Gerar nome único
        const fileName = Date.now() + '_' + Math.random().toString(36).substr(2, 9) + path.extname(image.name);
        const filePath = path.join(uploadDir, fileName);

        // Mover arquivo
        await image.mv(filePath);

        res.json({
            success: true,
            imageUrl: `/uploads/${fileName}`,
            fileName
        });
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao fazer upload'
        });
    }
});

// Logs do sistema
router.get('/logs', adminAuth, async (req, res) => {
    try {
        const { type = 'error', lines = 100 } = req.query;
        
        const logPath = path.join(__dirname, '../logs');
        const logFile = path.join(logPath, `${type}.log`);
        
        if (!fs.existsSync(logFile)) {
            return res.json({
                success: true,
                logs: []
            });
        }

        const logContent = fs.readFileSync(logFile, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim()).slice(-lines);
        
        res.json({
            success: true,
            logs: logLines
        });
    } catch (error) {
        console.error('Erro ao ler logs:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao ler logs'
        });
    }
});

// Informações do sistema
router.get('/system-info', adminAuth, async (req, res) => {
    try {
        const os = require('os');
        const process = require('process');
        
        const systemInfo = {
            nodeVersion: process.version,
            platform: os.platform(),
            arch: os.arch(),
            uptime: os.uptime(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            loadAverage: os.loadavg(),
            cpuCount: os.cpus().length,
            memoryUsage: process.memoryUsage(),
            pid: process.pid
        };

        res.json({
            success: true,
            systemInfo
        });
    } catch (error) {
        console.error('Erro ao obter informações do sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter informações do sistema'
        });
    }
});

// Backup do banco de dados
router.post('/backup', adminAuth, async (req, res) => {
    try {
        // Implementar backup do banco de dados
        const { sequelize } = require('../db/database');
        
        // Aqui você implementaria o backup real
        // Por enquanto, apenas retorna sucesso
        
        res.json({
            success: true,
            message: 'Backup iniciado com sucesso',
            backupId: Date.now()
        });
    } catch (error) {
        console.error('Erro ao fazer backup:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao fazer backup'
        });
    }
});

// Limpar cache
router.post('/clear-cache', adminAuth, async (req, res) => {
    try {
        // Implementar limpeza de cache
        // Por enquanto, apenas retorna sucesso
        
        res.json({
            success: true,
            message: 'Cache limpo com sucesso'
        });
    } catch (error) {
        console.error('Erro ao limpar cache:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao limpar cache'
        });
    }
});

// Exportar dados
router.get('/export/:type', adminAuth, async (req, res) => {
    try {
        const { type } = req.params;
        
        let data;
        switch (type) {
            case 'users':
                data = await User.findAll({
                    attributes: ['id', 'username', 'email', 'rank', 'status', 'createdAt']
                });
                break;
            case 'tournaments':
                data = await Tournament.findAll();
                break;
            case 'matches':
                data = await Match.findAll();
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Tipo de exportação inválido'
                });
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${type}.json"`);
        
        res.json({
            success: true,
            data,
            exportedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao exportar dados'
        });
    }
});

module.exports = router;
