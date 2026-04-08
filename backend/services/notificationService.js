const { Notification, NotificationPreference, NotificationTemplate } = require('../models');
const { sequelize } = require('../server');
const nodemailer = require('nodemailer');
const DiscordWebhookHandler = require('../webhook/discordWebhook');

class NotificationService {
    constructor() {
        this.emailTransporter = null;
        this.discordWebhook = new DiscordWebhookHandler();
        this.initializeEmailTransporter();
        this.scheduledNotifications = new Map();
        this.processingQueue = false;
        this.maxRetries = 3;
        this.retryDelay = 5000; // 5 segundos
    }

    // Inicializar transportador de email
    initializeEmailTransporter() {
        if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            this.emailTransporter = nodemailer.createTransporter({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT || 587,
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
        }
    }

    // Enviar notificação principal
    async sendNotification(userId, type, data = {}, options = {}) {
        try {
            // Obter preferências do usuário
            const preferences = await this.getUserPreferences(userId, type);
            
            if (!preferences || !preferences.enabled) {
                return { success: false, reason: 'user_disabled_notifications' };
            }

            // Obter template
            const templates = await this.getTemplates(type);
            
            // Criar notificação no banco
            const notification = await Notification.create({
                userId,
                type,
                title: options.title || templates.web?.title || 'Notificação',
                message: options.message || templates.web?.message || 'Você tem uma nova notificação',
                priority: options.priority || preferences.priority || 'medium',
                channels: options.channels || preferences.channels || ['web'],
                data,
                metadata: options.metadata || {},
                scheduledAt: options.scheduledAt || null,
                expiresAt: options.expiresAt || null,
                actionUrl: options.actionUrl || null,
                actionText: options.actionText || null,
                icon: options.icon || templates.web?.icon || null,
                color: options.color || templates.web?.color || null,
                imageUrl: options.imageUrl || null,
                tags: options.tags || []
            });

            // Se agendado, adicionar à fila
            if (options.scheduledAt && new Date(options.scheduledAt) > new Date()) {
                this.scheduleNotification(notification);
                return { success: true, notification, scheduled: true };
            }

            // Enviar notificação pelos canais configurados
            const results = await this.sendToChannels(notification, preferences, templates, data);

            return {
                success: true,
                notification,
                results
            };

        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
            return { success: false, error: error.message };
        }
    }

    // Enviar para múltiplos canais
    async sendToChannels(notification, preferences, templates, data) {
        const results = {};
        const channels = notification.channels;

        for (const channel of channels) {
            if (!preferences.shouldSend(channel)) {
                results[channel] = { success: false, reason: 'user_disabled_channel' };
                continue;
            }

            try {
                const template = templates[channel];
                const rendered = template ? template.render(data) : null;

                switch (channel) {
                    case 'web':
                        results.web = await this.sendWebNotification(notification, rendered);
                        break;
                    case 'email':
                        results.email = await this.sendEmailNotification(notification, rendered, data);
                        break;
                    case 'sms':
                        results.sms = await this.sendSMSNotification(notification, rendered, data);
                        break;
                    case 'push':
                        results.push = await this.sendPushNotification(notification, rendered, data);
                        break;
                    case 'discord':
                        results.discord = await this.sendDiscordNotification(notification, rendered, data);
                        break;
                    default:
                        results[channel] = { success: false, reason: 'unsupported_channel' };
                }
            } catch (error) {
                console.error(`Erro ao enviar notificação por ${channel}:`, error);
                results[channel] = { success: false, error: error.message };
            }
        }

        return results;
    }

    // Enviar notificação web (salva no banco)
    async sendWebNotification(notification, rendered) {
        try {
            await notification.update({
                status: 'sent',
                sentAt: new Date()
            });

            // Emitir via WebSocket se disponível
            if (global.io) {
                global.io.to(`user_${notification.userId}`).emit('notification', {
                    id: notification.id,
                    type: notification.type,
                    title: rendered?.title || notification.title,
                    message: rendered?.message || notification.message,
                    priority: notification.priority,
                    actionUrl: notification.actionUrl,
                    actionText: notification.actionText,
                    icon: notification.icon,
                    color: notification.color,
                    imageUrl: notification.imageUrl,
                    timestamp: notification.createdAt
                });
            }

            return { success: true, delivered: true };
        } catch (error) {
            throw error;
        }
    }

    // Enviar notificação por email
    async sendEmailNotification(notification, rendered, data) {
        if (!this.emailTransporter) {
            return { success: false, reason: 'email_not_configured' };
        }

        try {
            const user = await this.getUser(notification.userId);
            if (!user || !user.email) {
                return { success: false, reason: 'user_email_not_found' };
            }

            const mailOptions = {
                from: process.env.EMAIL_FROM,
                to: user.email,
                subject: rendered?.subject || notification.title,
                text: rendered?.message || notification.message,
                html: rendered?.htmlTemplate || this.generateDefaultHTML(notification, rendered)
            };

            const result = await this.emailTransporter.sendMail(mailOptions);
            
            return { 
                success: true, 
                messageId: result.messageId,
                delivered: true
            };
        } catch (error) {
            throw error;
        }
    }

    // Enviar notificação por SMS
    async sendSMSNotification(notification, rendered, data) {
        // Implementar com serviço de SMS (Twilio, etc.)
        return { success: false, reason: 'sms_not_implemented' };
    }

    // Enviar notificação push
    async sendPushNotification(notification, rendered, data) {
        // Implementar com serviço de push (Firebase, etc.)
        return { success: false, reason: 'push_not_implemented' };
    }

    // Enviar notificação para Discord
    async sendDiscordNotification(notification, rendered, data) {
        try {
            const user = await this.getUser(notification.userId);
            if (!user || !user.discordChannelId) {
                return { success: false, reason: 'user_discord_not_found' };
            }

            const embed = this.createDiscordEmbed(notification, rendered);
            
            const result = await this.discordWebhook.sendDiscordMessage(
                rendered?.message || notification.message,
                embed
            );

            return { success: true, messageId: result?.id, delivered: true };
        } catch (error) {
            throw error;
        }
    }

    // Criar embed para Discord
    createDiscordEmbed(notification, rendered) {
        const colors = {
            low: 0x808080,
            medium: 0x009739,
            high: 0xff9900,
            urgent: 0xff0000
        };

        return {
            title: rendered?.title || notification.title,
            description: rendered?.message || notification.message,
            color: colors[notification.priority] || colors.medium,
            timestamp: notification.createdAt,
            footer: {
                text: 'Pro Soccer Online 2',
                icon_url: 'https://example.com/icon.png'
            },
            fields: notification.data ? Object.entries(notification.data).map(([key, value]) => ({
                name: key,
                value: String(value),
                inline: true
            })) : [],
            image: notification.imageUrl ? { url: notification.imageUrl } : undefined
        };
    }

    // Gerar HTML padrão para email
    generateDefaultHTML(notification, rendered) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${rendered?.title || notification.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { background: #009739; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .button { display: inline-block; background: #009739; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
                    .footer { background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Pro Soccer Online 2</h1>
                    </div>
                    <div class="content">
                        <h2>${rendered?.title || notification.title}</h2>
                        <p>${rendered?.message || notification.message}</p>
                        ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="button">${notification.actionText || 'Ver Detalhes'}</a>` : ''}
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 Pro Soccer Online 2. Todos os direitos reservados.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Obter preferências do usuário
    async getUserPreferences(userId, type) {
        try {
            const preference = await NotificationPreference.findOne({
                where: { userId, type }
            });

            // Se não existir preferência específica, usar padrão
            if (!preference) {
                return await this.createDefaultPreferences(userId, type);
            }

            return preference;
        } catch (error) {
            console.error('Erro ao obter preferências do usuário:', error);
            return null;
        }
    }

    // Criar preferências padrão
    async createDefaultPreferences(userId, type) {
        const defaultChannels = this.getDefaultChannels(type);
        
        return await NotificationPreference.create({
            userId,
            type,
            enabled: true,
            channels: defaultChannels,
            priority: 'medium',
            frequency: 'immediate',
            maxDaily: 50,
            grouping: true,
            sound: true,
            vibration: true,
            badge: true,
            desktop: true,
            email: defaultChannels.includes('email'),
            sms: defaultChannels.includes('sms'),
            push: defaultChannels.includes('push'),
            discord: defaultChannels.includes('discord')
        });
    }

    // Obter canais padrão por tipo
    getDefaultChannels(type) {
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

    // Obter templates por tipo
    async getTemplates(type) {
        try {
            const templates = await NotificationTemplate.scope('active').findAll({
                where: { type }
            });

            const result = {};
            for (const template of templates) {
                result[template.channel] = template;
            }

            return result;
        } catch (error) {
            console.error('Erro ao obter templates:', error);
            return {};
        }
    }

    // Obter usuário
    async getUser(userId) {
        const { User } = require('../models');
        return await User.findByPk(userId);
    }

    // Agendar notificação
    scheduleNotification(notification) {
        const scheduledTime = new Date(notification.scheduledAt);
        const delay = scheduledTime.getTime() - Date.now();

        if (delay > 0) {
            const timeoutId = setTimeout(async () => {
                await this.processScheduledNotification(notification);
                this.scheduledNotifications.delete(notification.id);
            }, delay);

            this.scheduledNotifications.set(notification.id, timeoutId);
        }
    }

    // Processar notificação agendada
    async processScheduledNotification(notification) {
        try {
            const preferences = await this.getUserPreferences(notification.userId, notification.type);
            const templates = await this.getTemplates(notification.type);

            await this.sendToChannels(notification, preferences, templates, notification.data);
        } catch (error) {
            console.error('Erro ao processar notificação agendada:', error);
        }
    }

    // Marcar notificação como lida
    async markAsRead(notificationId, userId) {
        try {
            const notification = await Notification.findOne({
                where: { id: notificationId, userId }
            });

            if (!notification) {
                return { success: false, reason: 'notification_not_found' };
            }

            await notification.markAsRead();
            return { success: true, notification };
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
            return { success: false, error: error.message };
        }
    }

    // Obter notificações do usuário
    async getUserNotifications(userId, options = {}) {
        try {
            const {
                limit = 20,
                offset = 0,
                unread = false,
                archived = false,
                type = null,
                priority = null
            } = options;

            const where = { userId };

            if (unread) where.isRead = false;
            if (archived) where.isArchived = true;
            else where.isArchived = false;
            if (type) where.type = type;
            if (priority) where.priority = priority;

            const notifications = await Notification.findAndCountAll({
                where,
                limit,
                offset,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: NotificationPreference,
                        as: 'preference'
                    }
                ]
            });

            return {
                success: true,
                notifications: notifications.rows,
                total: notifications.count,
                hasMore: (offset + limit) < notifications.count
            };
        } catch (error) {
            console.error('Erro ao obter notificações do usuário:', error);
            return { success: false, error: error.message };
        }
    }

    // Arquivar notificação
    async archiveNotification(notificationId, userId) {
        try {
            const notification = await Notification.findOne({
                where: { id: notificationId, userId }
            });

            if (!notification) {
                return { success: false, reason: 'notification_not_found' };
            }

            await notification.archive();
            return { success: true, notification };
        } catch (error) {
            console.error('Erro ao arquivar notificação:', error);
            return { success: false, error: error.message };
        }
    }

    // Atualizar preferências do usuário
    async updatePreferences(userId, preferences) {
        try {
            const results = [];

            for (const pref of preferences) {
                const [preference, created] = await NotificationPreference.findOrCreate({
                    where: { userId, type: pref.type },
                    defaults: pref
                });

                if (!created) {
                    await preference.update(pref);
                }

                results.push(preference);
            }

            return { success: true, preferences: results };
        } catch (error) {
            console.error('Erro ao atualizar preferências:', error);
            return { success: false, error: error.message };
        }
    }

    // Obter estatísticas de notificações
    async getNotificationStats(userId = null) {
        try {
            const where = userId ? { userId } : {};

            const stats = {
                total: await Notification.count({ where }),
                sent: await Notification.count({ where: { ...where, status: 'sent' } }),
                delivered: await Notification.count({ where: { ...where, status: 'delivered' } }),
                read: await Notification.count({ where: { ...where, status: 'read' } }),
                failed: await Notification.count({ where: { ...where, status: 'failed' } }),
                unread: await Notification.count({ where: { ...where, isRead: false } }),
                archived: await Notification.count({ where: { ...where, isArchived: true } })
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return { success: false, error: error.message };
        }
    }

    // Limpar notificações expiradas
    async cleanupExpiredNotifications() {
        try {
            const expired = await Notification.destroy({
                where: {
                    expiresAt: {
                        [sequelize.Sequelize.Op.lt]: new Date()
                    }
                }
            });

            console.log(`Limpeza de notificações expiradas: ${expired} removidas`);
            return { success: true, deleted: expired };
        } catch (error) {
            console.error('Erro na limpeza de notificações expiradas:', error);
            return { success: false, error: error.message };
        }
    }

    // Processar fila de notificações pendentes
    async processPendingNotifications() {
        if (this.processingQueue) return;

        this.processingQueue = true;

        try {
            const pending = await Notification.scope('pending').findAll({
                where: {
                    scheduledAt: {
                        [sequelize.Sequelize.Op.lte]: new Date()
                    },
                    retryCount: {
                        [sequelize.Sequelize.Op.lt]: this.maxRetries
                    }
                },
                limit: 50
            });

            for (const notification of pending) {
                try {
                    await this.processScheduledNotification(notification);
                } catch (error) {
                    console.error(`Erro ao processar notificação ${notification.id}:`, error);
                    
                    // Incrementar retry count
                    await notification.update({
                        retryCount: notification.retryCount + 1,
                        status: notification.retryCount + 1 >= this.maxRetries ? 'failed' : 'pending'
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao processar fila de notificações:', error);
        } finally {
            this.processingQueue = false;
        }
    }

    // Inicializar processamento automático
    startAutoProcessing() {
        // Processar notificações pendentes a cada minuto
        setInterval(() => {
            this.processPendingNotifications();
        }, 60000);

        // Limpar notificações expiradas a cada hora
        setInterval(() => {
            this.cleanupExpiredNotifications();
        }, 3600000);
    }
}

module.exports = NotificationService;
