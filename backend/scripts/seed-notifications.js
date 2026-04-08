const { sequelize } = require('../db/database');
const { NotificationTemplate, NotificationPreference, User } = require('../models');

// Templates de notificação padrão
const defaultTemplates = [
    // Login
    {
        name: 'login_success_web',
        type: 'login_success',
        channel: 'web',
        title: 'Login Realizado',
        message: 'Bem-vindo de volta, {{username}}! Seu login foi realizado com sucesso.',
        priority: 'low',
        defaultChannels: ['web'],
        icon: 'fas fa-sign-in-alt',
        color: '#009739',
        variables: ['username'],
        isActive: true,
        description: 'Notificação de sucesso no login'
    },
    {
        name: 'login_success_email',
        type: 'login_success',
        channel: 'email',
        subject: 'Novo Login em sua Conta',
        title: 'Login Realizado',
        message: 'Olá {{username}},\n\nDetectamos um novo login em sua conta Pro Soccer Online 2.\n\nData: {{loginTime}}\nIP: {{ip}}\nDispositivo: {{userAgent}}\n\nSe não foi você, por favor, altere sua senha imediatamente.',
        htmlTemplate: `
            <h2>Novo Login em sua Conta</h2>
            <p>Olá <strong>{{username}}</strong>,</p>
            <p>Detectamos um novo login em sua conta Pro Soccer Online 2:</p>
            <ul>
                <li><strong>Data:</strong> {{loginTime}}</li>
                <li><strong>IP:</strong> {{ip}}</li>
                <li><strong>Dispositivo:</strong> {{userAgent}}</li>
            </ul>
            <p>Se não foi você, por favor, altere sua senha imediatamente.</p>
        `,
        priority: 'low',
        defaultChannels: ['email'],
        variables: ['username', 'loginTime', 'ip', 'userAgent'],
        isActive: true,
        description: 'Email de confirmação de login'
    },
    {
        name: 'login_failure',
        type: 'login_failure',
        channel: 'web',
        title: 'Falha no Login',
        message: 'Tentativa de login falhou. Verifique suas credenciais.',
        priority: 'medium',
        defaultChannels: ['web'],
        icon: 'fas fa-exclamation-triangle',
        color: '#ff9900',
        variables: [],
        isActive: true,
        description: 'Notificação de falha no login'
    },
    {
        name: 'account_locked',
        type: 'account_locked',
        channel: 'email',
        subject: 'Sua Conta Foi Bloqueada',
        title: 'Conta Bloqueada',
        message: 'Sua conta foi temporariamente bloqueada devido a múltiplas tentativas de login falhas. Tente novamente em 15 minutos.',
        htmlTemplate: `
            <h2>Conta Bloqueada Temporariamente</h2>
            <p>Prezado(a) {{username}},</p>
            <p>Sua conta foi temporariamente bloqueada devido a múltiplas tentativas de login falhas.</p>
            <p>O bloqueio será removido automaticamente em 15 minutos.</p>
            <p>Se você não tentou fazer login, por favor, entre em contato com nosso suporte.</p>
        `,
        priority: 'high',
        defaultChannels: ['email', 'sms'],
        icon: 'fas fa-lock',
        color: '#ff0000',
        variables: ['username'],
        isActive: true,
        description: 'Notificação de conta bloqueada'
    },
    
    // Torneios
    {
        name: 'tournament_created_web',
        type: 'tournament_created',
        channel: 'web',
        title: 'Novo Torneio Criado',
        message: 'O torneio "{{tournamentName}}" foi criado! Inscreva-se agora.',
        priority: 'medium',
        defaultChannels: ['web'],
        icon: 'fas fa-trophy',
        color: '#009739',
        actionUrl: '/tournaments/{{tournamentId}}',
        actionText: 'Ver Torneio',
        variables: ['tournamentName', 'tournamentId'],
        isActive: true,
        description: 'Notificação de criação de torneio'
    },
    {
        name: 'tournament_created_discord',
        type: 'tournament_created',
        channel: 'discord',
        title: 'Novo Torneio Disponível',
        message: 'O torneio **{{tournamentName}}** foi criado!\n\n**Tipo:** {{type}}\n**Prêmio:** {{prize}}\n**Início:** {{startDate}}\n\nInscreva-se agora!',
        priority: 'medium',
        defaultChannels: ['discord'],
        variables: ['tournamentName', 'type', 'prize', 'startDate'],
        isActive: true,
        description: 'Notificação Discord de criação de torneio'
    },
    {
        name: 'tournament_started',
        type: 'tournament_started',
        channel: 'web',
        title: 'Torneio Iniciado',
        message: 'O torneio "{{tournamentName}}" começou! Boa sorte!',
        priority: 'high',
        defaultChannels: ['web', 'discord'],
        icon: 'fas fa-play',
        color: '#009739',
        actionUrl: '/tournaments/{{tournamentId}}',
        actionText: 'Acompanhar',
        variables: ['tournamentName', 'tournamentId'],
        isActive: true,
        description: 'Notificação de início de torneio'
    },
    {
        name: 'tournament_ended',
        type: 'tournament_ended',
        channel: 'web',
        title: 'Torneio Finalizado',
        message: 'O torneio "{{tournamentName}}" foi finalizado! Parabéns ao vencedor {{winner}}.',
        priority: 'medium',
        defaultChannels: ['web', 'discord'],
        icon: 'fas fa-flag-checkered',
        color: '#009739',
        actionUrl: '/tournaments/{{tournamentId}}',
        actionText: 'Ver Resultados',
        variables: ['tournamentName', 'winner', 'tournamentId'],
        isActive: true,
        description: 'Notificação de fim de torneio'
    },
    
    // Partidas
    {
        name: 'match_scheduled',
        type: 'match_scheduled',
        channel: 'web',
        title: 'Partida Agendada',
        message: 'Sua partida foi agendada para {{matchTime}}. Não se esqueça!',
        priority: 'medium',
        defaultChannels: ['web'],
        icon: 'fas fa-calendar',
        color: '#009739',
        actionUrl: '/matches/{{matchId}}',
        actionText: 'Ver Partida',
        variables: ['matchTime', 'matchId'],
        isActive: true,
        description: 'Notificação de partida agendada'
    },
    {
        name: 'match_started',
        type: 'match_started',
        channel: 'web',
        title: 'Partida Iniciada',
        message: 'Sua partida contra {{opponent}} começou! Boa sorte!',
        priority: 'high',
        defaultChannels: ['web', 'discord'],
        icon: 'fas fa-play-circle',
        color: '#009739',
        actionUrl: '/matches/{{matchId}}',
        actionText: 'Acompanhar',
        variables: ['opponent', 'matchId'],
        isActive: true,
        description: 'Notificação de início de partida'
    },
    {
        name: 'match_ended',
        type: 'match_ended',
        channel: 'web',
        title: 'Partida Finalizada',
        message: 'Sua partida terminou! {{result}}',
        priority: 'medium',
        defaultChannels: ['web'],
        icon: 'fas fa-stop-circle',
        color: '#009739',
        actionUrl: '/matches/{{matchId}}',
        actionText: 'Ver Resultados',
        variables: ['result', 'matchId'],
        isActive: true,
        description: 'Notificação de fim de partida'
    },
    {
        name: 'goal_scored',
        type: 'goal_scored',
        channel: 'web',
        title: 'Gol!',
        message: '{{player}} marcou um gol! Placar: {{score}}',
        priority: 'medium',
        defaultChannels: ['web'],
        icon: 'fas fa-futbol',
        color: '#009739',
        variables: ['player', 'score'],
        isActive: true,
        description: 'Notificação de gol marcado'
    },
    
    // Sistema
    {
        name: 'rank_updated',
        type: 'rank_updated',
        channel: 'web',
        title: 'Rank Atualizado',
        message: 'Seu rank foi atualizado! Novo rank: {{newRank}} ({{change}})',
        priority: 'medium',
        defaultChannels: ['web'],
        icon: 'fas fa-chart-line',
        color: '#009739',
        actionUrl: '/rankings',
        actionText: 'Ver Rankings',
        variables: ['newRank', 'change'],
        isActive: true,
        description: 'Notificação de atualização de rank'
    },
    {
        name: 'achievement_unlocked',
        type: 'achievement_unlocked',
        channel: 'web',
        title: 'Conquista Desbloqueada',
        message: 'Parabéns! Você desbloqueou a conquista "{{achievementName}}".',
        priority: 'high',
        defaultChannels: ['web', 'discord'],
        icon: 'fas fa-medal',
        color: '#ffd700',
        actionUrl: '/achievements',
        actionText: 'Ver Conquistas',
        variables: ['achievementName'],
        isActive: true,
        description: 'Notificação de conquista desbloqueada'
    },
    {
        name: 'system_maintenance',
        type: 'system_maintenance',
        channel: 'email',
        subject: 'Manutenção Programada',
        title: 'Manutenção Programada',
        message: 'O sistema estará em manutenção em {{maintenanceTime}} por {{duration}}. Agradecemos sua compreensão.',
        htmlTemplate: `
            <h2>Manutenção Programada</h2>
            <p>Prezado(a) {{username}},</p>
            <p>Informamos que o sistema Pro Soccer Online 2 estará em manutenção:</p>
            <ul>
                <li><strong>Data:</strong> {{maintenanceTime}}</li>
                <li><strong>Duração:</strong> {{duration}}</li>
            </ul>
            <p>Durante este período, alguns serviços podem ficar indisponíveis.</p>
            <p>Agradecemos sua compreensão.</p>
        `,
        priority: 'high',
        defaultChannels: ['email'],
        icon: 'fas fa-tools',
        color: '#ff9900',
        variables: ['username', 'maintenanceTime', 'duration'],
        isActive: true,
        description: 'Notificação de manutenção do sistema'
    },
    {
        name: 'security_alert',
        type: 'security_alert',
        channel: 'email',
        subject: 'Alerta de Segurança',
        title: 'Alerta de Segurança',
        message: 'Detectamos uma atividade suspeita em sua conta. Verifique suas atividades recentes.',
        htmlTemplate: `
            <h2>Alerta de Segurança</h2>
            <p>Prezado(a) {{username}},</p>
            <p>Detectamos uma atividade suspeita em sua conta:</p>
            <ul>
                <li><strong>Atividade:</strong> {{activity}}</li>
                <li><strong>Data:</strong> {{timestamp}}</li>
                <li><strong>IP:</strong> {{ip}}</li>
                <li><strong>Localização:</strong> {{location}}</li>
            </ul>
            <p>Se não foi você, por favor, altere sua senha imediatamente.</p>
            <p><a href="{{securityUrl}}">Verificar Atividades</a></p>
        `,
        priority: 'urgent',
        defaultChannels: ['email', 'sms'],
        icon: 'fas fa-shield-alt',
        color: '#ff0000',
        actionUrl: '/security',
        actionText: 'Verificar Segurança',
        variables: ['username', 'activity', 'timestamp', 'ip', 'location', 'securityUrl'],
        isActive: true,
        description: 'Notificação de alerta de segurança'
    },
    {
        name: 'welcome_message',
        type: 'welcome_message',
        channel: 'email',
        subject: 'Bem-vindo ao Pro Soccer Online 2!',
        title: 'Bem-vindo!',
        message: 'Bem-vindo ao Pro Soccer Online 2, {{username}}! Estamos felizes em tê-lo conosco.',
        htmlTemplate: `
            <h2>Bem-vindo ao Pro Soccer Online 2!</h2>
            <p>Olá <strong>{{username}}</strong>,</p>
            <p>Seja bem-vindo à melhor experiência de futebol online brasileira!</p>
            <h3>O que você pode fazer:</h3>
            <ul>
                <li>Participar de torneios emocionantes</li>
                <li>Competir no ranking global</li>
                <li>Desbloquear conquistas</li>
                <li>Conectar-se com outros jogadores</li>
            </ul>
            <p><a href="{{siteUrl}}">Começar a Jogar</a></p>
            <p>Boa sorte e divirta-se!</p>
        `,
        priority: 'medium',
        defaultChannels: ['email'],
        icon: 'fas fa-hand-wave',
        color: '#009739',
        actionUrl: '/dashboard',
        actionText: 'Começar',
        variables: ['username', 'siteUrl'],
        isActive: true,
        description: 'Mensagem de boas-vindas'
    }
];

// Tipos de notificação para preferências padrão
const notificationTypes = [
    'login_success',
    'login_failure', 
    'account_locked',
    'tournament_created',
    'tournament_updated',
    'tournament_started',
    'tournament_ended',
    'match_scheduled',
    'match_started',
    'match_ended',
    'match_cancelled',
    'goal_scored',
    'rank_updated',
    'achievement_unlocked',
    'friend_request',
    'friend_accepted',
    'message_received',
    'system_maintenance',
    'security_alert',
    'payment_received',
    'subscription_renewed',
    'welcome_message',
    'birthday_reminder',
    'inactivity_warning'
];

// Função principal de seed
async function seedNotifications() {
    try {
        console.log('Iniciando seed do sistema de notificações...');
        
        // Limpar dados existentes
        await NotificationTemplate.destroy({ where: {} });
        await NotificationPreference.destroy({ where: {} });
        
        console.log('Dados antigos removidos.');
        
        // Criar templates padrão
        const createdTemplates = [];
        for (const templateData of defaultTemplates) {
            const template = await NotificationTemplate.create(templateData);
            createdTemplates.push(template);
            console.log(`Template criado: ${template.name}`);
        }
        
        console.log(`${createdTemplates.length} templates criados com sucesso!`);
        
        // Criar preferências padrão para usuários existentes
        const users = await User.findAll();
        const createdPreferences = [];
        
        for (const user of users) {
            for (const type of notificationTypes) {
                const preference = await NotificationPreference.create({
                    userId: user.id,
                    type,
                    enabled: true,
                    channels: getDefaultChannels(type),
                    priority: 'medium',
                    frequency: 'immediate',
                    maxDaily: 50,
                    grouping: true,
                    sound: true,
                    vibration: true,
                    badge: true,
                    desktop: true,
                    email: getDefaultChannels(type).includes('email'),
                    sms: getDefaultChannels(type).includes('sms'),
                    push: getDefaultChannels(type).includes('push'),
                    discord: getDefaultChannels(type).includes('discord')
                });
                createdPreferences.push(preference);
            }
        }
        
        console.log(`${createdPreferences.length} preferências criadas para ${users.length} usuários!`);
        
        console.log('Seed do sistema de notificações concluído com sucesso!');
        
        // Estatísticas finais
        console.log('\nEstatísticas finais:');
        console.log(`- Templates: ${createdTemplates.length}`);
        console.log(`- Preferências: ${createdPreferences.length}`);
        console.log(`- Usuários com preferências: ${users.length}`);
        
        return {
            success: true,
            templates: createdTemplates.length,
            preferences: createdPreferences.length,
            users: users.length
        };
        
    } catch (error) {
        console.error('Erro no seed de notificações:', error);
        return { success: false, error: error.message };
    }
}

// Obter canais padrão por tipo
function getDefaultChannels(type) {
    const channelMap = {
        'login_success': ['web'],
        'login_failure': ['web', 'email'],
        'account_locked': ['web', 'email', 'sms'],
        'tournament_created': ['web', 'discord'],
        'tournament_updated': ['web'],
        'tournament_started': ['web', 'discord'],
        'tournament_ended': ['web', 'discord'],
        'match_scheduled': ['web'],
        'match_started': ['web', 'discord'],
        'match_ended': ['web', 'discord'],
        'match_cancelled': ['web'],
        'goal_scored': ['web'],
        'rank_updated': ['web'],
        'achievement_unlocked': ['web', 'discord'],
        'friend_request': ['web'],
        'friend_accepted': ['web'],
        'message_received': ['web'],
        'system_maintenance': ['web', 'email'],
        'security_alert': ['web', 'email', 'sms'],
        'payment_received': ['web', 'email'],
        'subscription_renewed': ['web', 'email'],
        'welcome_message': ['web', 'email'],
        'birthday_reminder': ['web', 'email'],
        'inactivity_warning': ['web', 'email']
    };
    
    return channelMap[type] || ['web'];
}

// Executar seed
if (require.main === module) {
    seedNotifications()
        .then(result => {
            console.log('Seed finalizado:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('Erro no seed:', error);
            process.exit(1);
        });
}

module.exports = { seedNotifications, defaultTemplates, notificationTypes };
