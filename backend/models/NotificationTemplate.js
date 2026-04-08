const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const NotificationTemplate = sequelize.define('NotificationTemplate', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        type: {
            type: DataTypes.ENUM(
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
            ),
            allowNull: false
        },
        channel: {
            type: DataTypes.ENUM('web', 'email', 'sms', 'push', 'discord'),
            allowNull: false
        },
        subject: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'Assunto (principalmente para email)'
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: 'Título da notificação'
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'Mensagem da notificação (pode conter variáveis)'
        },
        htmlTemplate: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Template HTML para email'
        },
        smsTemplate: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Template para SMS (limitado a 160 caracteres)'
        },
        pushTemplate: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Template para push notification'
        },
        discordTemplate: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Template para Discord (embed)'
        },
        variables: {
            type: DataTypes.JSON,
            defaultValue: [],
            comment: 'Lista de variáveis usadas no template'
        },
        defaultPriority: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
            defaultValue: 'medium'
        },
        defaultChannels: {
            type: DataTypes.JSON,
            defaultValue: ['web'],
            comment: 'Canais padrão para este tipo'
        },
        icon: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Ícone padrão'
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'Cor padrão (hex)'
        },
        actionUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'URL de ação padrão'
        },
        actionText: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Texto do botão de ação padrão'
        },
        imageUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'URL da imagem padrão'
        },
        tags: {
            type: DataTypes.JSON,
            defaultValue: [],
            comment: 'Tags para categorização'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        version: {
            type: DataTypes.STRING(20),
            defaultValue: '1.0.0'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Descrição do template'
        }
    }, {
        tableName: 'notification_templates',
        timestamps: true,
        paranoid: true,
        indexes: [
            { fields: ['type'] },
            { fields: ['channel'] },
            { fields: ['isActive'] },
            { fields: ['type', 'channel'] },
            { fields: ['name'] }
        ]
    });

    // Métodos de instância
    NotificationTemplate.prototype.render = function(variables = {}) {
        const renderText = (text, vars) => {
            if (!text) return '';
            
            return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return vars[key] || match;
            });
        };

        return {
            subject: renderText(this.subject, variables),
            title: renderText(this.title, variables),
            message: renderText(this.message, variables),
            htmlTemplate: renderText(this.htmlTemplate, variables),
            smsTemplate: renderText(this.smsTemplate, variables),
            pushTemplate: renderText(this.pushTemplate, variables),
            discordTemplate: renderText(this.discordTemplate, variables),
            actionUrl: renderText(this.actionUrl, variables),
            actionText: renderText(this.actionText, variables),
            imageUrl: renderText(this.imageUrl, variables)
        };
    };

    NotificationTemplate.prototype.validateVariables = function(variables = {}) {
        const missingVariables = [];
        
        for (const variable of this.variables) {
            if (!variables.hasOwnProperty(variable)) {
                missingVariables.push(variable);
            }
        }
        
        return missingVariables;
    };

    // Scopes
    NotificationTemplate.addScope('active', {
        where: {
            isActive: true
        }
    });

    NotificationTemplate.addScope('byType', (type) => ({
        where: {
            type: type
        }
    }));

    NotificationTemplate.addScope('byChannel', (channel) => ({
        where: {
            channel: channel
        }
    }));

    NotificationTemplate.addScope('byTypeAndChannel', (type, channel) => ({
        where: {
            type: type,
            channel: channel
        }
    }));

module.exports = NotificationTemplate;
