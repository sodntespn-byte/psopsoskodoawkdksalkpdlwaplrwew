const express = require('express');
const router = express.Router();
const { requireAdmin, adminActivityLogger } = require('../middleware/adminAuth');
const { SiteSetting, User } = require('../models');
const jornalWebhookService = require('../services/jornalWebhookService');

// Middleware de proteção para todas as rotas admin
router.use(requireAdmin);
router.use(adminActivityLogger);

// Middleware para renderizar página admin (se não for API)
router.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    // Renderizar página admin para requisições não-API
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - PSO Brasil</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --dark-bg: #0a0a0a;
            --dark-card: #1a1a1a;
            --accent: #00ff00;
            --accent-hover: #00cc00;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--dark-bg);
            color: #ffffff;
            height: 100vh;
            overflow: hidden;
        }
        
        .admin-container {
            display: flex;
            height: 100vh;
        }
        
        .sidebar {
            width: 80px;
            background: var(--dark-card);
            border-right: 1px solid rgba(0, 255, 0, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 0;
            gap: 30px;
        }
        
        .nav-item {
            position: relative;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 255, 0, 0.1);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid transparent;
        }
        
        .nav-item:hover {
            background: rgba(0, 255, 0, 0.2);
            border-color: var(--accent);
            transform: translateY(-2px);
        }
        
        .nav-item.active {
            background: rgba(0, 255, 0, 0.3);
            border-color: var(--accent);
        }
        
        .nav-item svg {
            width: 24px;
            height: 24px;
            stroke: var(--accent);
        }
        
        .tooltip {
            position: absolute;
            left: 70px;
            background: var(--dark-card);
            border: 1px solid var(--accent);
            padding: 8px 12px;
            border-radius: 8px;
            white-space: nowrap;
            font-size: 14px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 1000;
        }
        
        .nav-item:hover .tooltip {
            opacity: 1;
        }
        
        .main-content {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
        }
        
        .section {
            display: none;
        }
        
        .section.active {
            display: block;
        }
        
        .section-header {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            background: linear-gradient(135deg, var(--accent), #00cc00);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .section-subtitle {
            color: #888;
            font-size: 16px;
        }
        
        .card {
            background: var(--dark-card);
            border: 1px solid rgba(0, 255, 0, 0.1);
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 25px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #ccc;
        }
        
        .form-input, .form-textarea {
            width: 100%;
            padding: 12px 16px;
            background: rgba(0, 255, 0, 0.05);
            border: 1px solid rgba(0, 255, 0, 0.2);
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .form-input:focus, .form-textarea:focus {
            outline: none;
            border-color: var(--accent);
            background: rgba(0, 255, 0, 0.1);
        }
        
        .form-textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        .btn {
            padding: 12px 24px;
            background: linear-gradient(135deg, var(--accent), var(--accent-hover));
            border: none;
            border-radius: 8px;
            color: #000;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 255, 0, 0.3);
        }
        
        .btn-secondary {
            background: transparent;
            border: 1px solid var(--accent);
            color: var(--accent);
        }
        
        .toggle-switch {
            position: relative;
            width: 60px;
            height: 30px;
            background: rgba(0, 255, 0, 0.1);
            border-radius: 15px;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        
        .toggle-switch.active {
            background: var(--accent);
        }
        
        .toggle-switch::after {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 24px;
            height: 24px;
            background: #fff;
            border-radius: 50%;
            transition: transform 0.3s ease;
        }
        
        .toggle-switch.active::after {
            transform: translateX(30px);
        }
        
        .color-picker-wrapper {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .color-picker {
            width: 50px;
            height: 50px;
            border: 2px solid var(--accent);
            border-radius: 8px;
            cursor: pointer;
        }
        
        .alert {
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        
        .alert-success {
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid var(--accent);
            color: var(--accent);
        }
        
        .alert-error {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff0000;
            color: #ff0000;
        }
    </style>
</head>
<body>
    <div class="admin-container">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="nav-item active" data-section="dashboard">
                <i data-lucide="layout-dashboard"></i>
                <span class="tooltip">Dashboard</span>
            </div>
            <div class="nav-item" data-section="settings">
                <i data-lucide="settings"></i>
                <span class="tooltip">Configurações</span>
            </div>
            <div class="nav-item" data-section="notifications">
                <i data-lucide="bell"></i>
                <span class="tooltip">Notificações</span>
            </div>
            <div class="nav-item" data-section="account">
                <i data-lucide="user"></i>
                <span class="tooltip">Conta</span>
            </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Alert -->
            <div id="alert" class="alert"></div>

            <!-- Dashboard Section -->
            <div id="dashboard" class="section active">
                <div class="section-header">
                    <h1 class="section-title">Dashboard</h1>
                    <p class="section-subtitle">Visão geral do sistema</p>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 20px; color: var(--accent);">Estatísticas Rápidas</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                        <div style="text-align: center; padding: 20px; background: rgba(0, 255, 0, 0.05); border-radius: 12px;">
                            <div style="font-size: 32px; font-weight: bold; color: var(--accent);" id="totalUsers">-</div>
                            <div style="color: #888; margin-top: 5px;">Usuários Totais</div>
                        </div>
                        <div style="text-align: center; padding: 20px; background: rgba(0, 255, 0, 0.05); border-radius: 12px;">
                            <div style="font-size: 32px; font-weight: bold; color: var(--accent);" id="activeUsers">-</div>
                            <div style="color: #888; margin-top: 5px;">Usuários Ativos</div>
                        </div>
                        <div style="text-align: center; padding: 20px; background: rgba(0, 255, 0, 0.05); border-radius: 12px;">
                            <div style="font-size: 32px; font-weight: bold; color: var(--accent);" id="totalNews">-</div>
                            <div style="color: #888; margin-top: 5px;">Notícias Publicadas</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Settings Section -->
            <div id="settings" class="section">
                <div class="section-header">
                    <h1 class="section-title">Configurações</h1>
                    <p class="section-subtitle">Personalize a aparência e comportamento do site</p>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 20px; color: var(--accent);">Aparência</h3>
                    
                    <div class="form-group">
                        <label class="form-label">Cor Principal do Neon</label>
                        <div class="color-picker-wrapper">
                            <input type="color" id="primaryColor" class="color-picker" value="#00ff00">
                            <span id="colorHex">#00ff00</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Animação da Bandeira</label>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div id="flagAnimationToggle" class="toggle-switch active"></div>
                            <span id="flagAnimationStatus">Ativada</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">URL da Logo do Hero</label>
                        <input type="text" id="heroLogoUrl" class="form-input" value="/images/logo.png" placeholder="/images/logo.png">
                    </div>

                    <button class="btn" onclick="saveAppearanceSettings()">
                        <i data-lucide="save" style="width: 16px; height: 16px;"></i>
                        Salvar Alterações
                    </button>
                </div>
            </div>

            <!-- Notifications Section -->
            <div id="notifications" class="section">
                <div class="section-header">
                    <h1 class="section-title">Notificações</h1>
                    <p class="section-subtitle">Envie comunicados para todos os membros da liga</p>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 20px; color: var(--accent);">Enviar Mensagem em Massa</h3>
                    
                    <div class="form-group">
                        <label class="form-label">Título da Mensagem</label>
                        <input type="text" id="notificationTitle" class="form-input" placeholder="Título do comunicado">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Conteúdo da Mensagem</label>
                        <textarea id="notificationContent" class="form-textarea" placeholder="Digite aqui o conteúdo do comunicado..."></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Tipo de Mensagem</label>
                        <select id="notificationType" class="form-input">
                            <option value="info">Informação</option>
                            <option value="warning">Aviso Importante</option>
                            <option value="success">Anúncio Especial</option>
                            <option value="maintenance">Manutenção</option>
                        </select>
                    </div>

                    <button class="btn" onclick="sendNotification()">
                        <i data-lucide="send" style="width: 16px; height: 16px;"></i>
                        Enviar Notificação
                    </button>
                </div>
            </div>

            <!-- Account Section -->
            <div id="account" class="section">
                <div class="section-header">
                    <h1 class="section-title">Conta</h1>
                    <p class="section-subtitle">Gerencie seus dados de administrador</p>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 20px; color: var(--accent);">Informações da Conta</h3>
                    
                    <div class="form-group">
                        <label class="form-label">Nome de Usuário</label>
                        <input type="text" id="adminUsername" class="form-input" readonly>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="adminEmail" class="form-input" readonly>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Data de Criação</label>
                        <input type="text" id="adminCreatedAt" class="form-input" readonly>
                    </div>

                    <button class="btn btn-secondary" onclick="logout()">
                        <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
                        Sair do Painel
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Inicializar Lucide icons
        lucide.createIcons();

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                const section = this.dataset.section;
                
                // Update active nav
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                // Show corresponding section
                document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
                document.getElementById(section).classList.add('active');
            });
        });

        // Alert functions
        function showAlert(message, type = 'success') {
            const alert = document.getElementById('alert');
            alert.className = \`alert alert-\${type}\`;
            alert.textContent = message;
            alert.style.display = 'block';
            
            setTimeout(() => {
                alert.style.display = 'none';
            }, 5000);
        }

        // Load settings
        async function loadSettings() {
            try {
                const response = await fetch('/admin/api/settings');
                const settings = await response.json();
                
                if (settings.primaryColor) {
                    document.getElementById('primaryColor').value = settings.primaryColor;
                    document.getElementById('colorHex').textContent = settings.primaryColor;
                }
                
                if (settings.flag_animation_enabled !== undefined) {
                    const toggle = document.getElementById('flagAnimationToggle');
                    const status = document.getElementById('flagAnimationStatus');
                    
                    if (settings.flag_animation_enabled) {
                        toggle.classList.add('active');
                        status.textContent = 'Ativada';
                    } else {
                        toggle.classList.remove('active');
                        status.textContent = 'Desativada';
                    }
                }
                
                if (settings.hero_logo_url) {
                    document.getElementById('heroLogoUrl').value = settings.hero_logo_url;
                }
            } catch (error) {
                console.error('Erro ao carregar configurações:', error);
            }
        }

        // Save appearance settings
        async function saveAppearanceSettings() {
            try {
                const settings = {
                    primaryColor: document.getElementById('primaryColor').value,
                    flag_animation_enabled: document.getElementById('flagAnimationToggle').classList.contains('active'),
                    hero_logo_url: document.getElementById('heroLogoUrl').value
                };

                const response = await fetch('/admin/api/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                if (response.ok) {
                    showAlert('Configurações salvas com sucesso!', 'success');
                    // Update color hex display
                    document.getElementById('colorHex').textContent = settings.primaryColor;
                } else {
                    showAlert('Erro ao salvar configurações', 'error');
                }
            } catch (error) {
                console.error('Erro ao salvar configurações:', error);
                showAlert('Erro ao salvar configurações', 'error');
            }
        }

        // Send notification
        async function sendNotification() {
            try {
                const data = {
                    title: document.getElementById('notificationTitle').value,
                    content: document.getElementById('notificationContent').value,
                    type: document.getElementById('notificationType').value
                };

                if (!data.title || !data.content) {
                    showAlert('Preencha todos os campos', 'error');
                    return;
                }

                const response = await fetch('/admin/api/notify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    showAlert('Notificação enviada com sucesso!', 'success');
                    // Clear form
                    document.getElementById('notificationTitle').value = '';
                    document.getElementById('notificationContent').value = '';
                } else {
                    showAlert('Erro ao enviar notificação', 'error');
                }
            } catch (error) {
                console.error('Erro ao enviar notificação:', error);
                showAlert('Erro ao enviar notificação', 'error');
            }
        }

        // Toggle switch
        document.getElementById('flagAnimationToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            const status = document.getElementById('flagAnimationStatus');
            status.textContent = this.classList.contains('active') ? 'Ativada' : 'Desativada';
        });

        // Color picker
        document.getElementById('primaryColor').addEventListener('input', function() {
            document.getElementById('colorHex').textContent = this.value;
        });

        // Load account info
        async function loadAccountInfo() {
            try {
                const response = await fetch('/admin/api/account');
                const user = await response.json();
                
                document.getElementById('adminUsername').value = user.username;
                document.getElementById('adminEmail').value = user.email || 'Não informado';
                document.getElementById('adminCreatedAt').value = new Date(user.created_at).toLocaleDateString('pt-BR');
            } catch (error) {
                console.error('Erro ao carregar informações da conta:', error);
            }
        }

        // Logout
        function logout() {
            window.location.href = '/login';
        }

        // Load dashboard stats
        async function loadDashboardStats() {
            try {
                const response = await fetch('/admin/api/stats');
                const stats = await response.json();
                
                document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
                document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
                document.getElementById('totalNews').textContent = stats.totalNews || 0;
            } catch (error) {
                console.error('Erro ao carregar estatísticas:', error);
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            loadSettings();
            loadAccountInfo();
            loadDashboardStats();
        });
    </script>
</body>
</html>
    `);
});

// API Routes

// GET /admin/api/settings - Obter configurações
router.get('/api/settings', async (req, res) => {
    try {
        const settings = await SiteSetting.getPublicSettings();
        res.json(settings);
    } catch (error) {
        console.error('Erro ao obter configurações:', error);
        res.status(500).json({ error: 'Erro ao obter configurações' });
    }
});

// POST /admin/api/settings - Salvar configurações
router.post('/api/settings', async (req, res) => {
    try {
        const { primaryColor, flag_animation_enabled, hero_logo_url } = req.body;

        if (primaryColor) {
            await SiteSetting.setSetting('primary_color', primaryColor, 'string', 'Cor principal do neon', 'appearance', true);
        }

        if (flag_animation_enabled !== undefined) {
            await SiteSetting.setSetting('flag_animation_enabled', flag_animation_enabled, 'boolean', 'Ativar animação da bandeira', 'appearance', true);
        }

        if (hero_logo_url) {
            await SiteSetting.setSetting('hero_logo_url', hero_logo_url, 'string', 'URL da logo do hero', 'appearance', true);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

// POST /admin/api/notify - Enviar notificação Discord
router.post('/api/notify', async (req, res) => {
    try {
        const { title, content, type } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        // Enviar para Discord usando o serviço existente
        const notificationData = {
            title: title,
            description: content,
            color: type === 'warning' ? '#FFA500' : type === 'success' ? '#00FF00' : type === 'maintenance' ? '#FF0000' : '#0099FF',
            timestamp: new Date().toISOString()
        };

        await jornalWebhookService.sendNotification(notificationData);

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        res.status(500).json({ error: 'Erro ao enviar notificação' });
    }
});

// GET /admin/api/account - Obter informações da conta
router.get('/api/account', async (req, res) => {
    try {
        res.json({
            username: req.user.username,
            email: req.user.email,
            created_at: req.user.created_at
        });
    } catch (error) {
        console.error('Erro ao obter informações da conta:', error);
        res.status(500).json({ error: 'Erro ao obter informações' });
    }
});

// GET /admin/api/stats - Obter estatísticas
router.get('/api/stats', async (req, res) => {
    try {
        const totalUsers = await User.count();
        const activeUsers = await User.count({
            where: {
                last_login: {
                    [require('sequelize').Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 dias
                }
            }
        });

        // Contar notícias (se existir modelo Noticia)
        let totalNews = 0;
        try {
            const { Noticia } = require('../models');
            totalNews = await Noticia.count();
        } catch (e) {
            // Modelo Noticia não existe
        }

        res.json({
            totalUsers,
            activeUsers,
            totalNews
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
});

module.exports = router;
