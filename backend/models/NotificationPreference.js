const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const NotificationPreference = sequelize.define('NotificationPreference', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
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
        enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        channels: {
            type: DataTypes.JSON,
            defaultValue: ['web'],
            comment: 'Canais habilitados: web, email, sms, push, discord'
        },
        priority: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
            defaultValue: 'medium'
        },
        quietHours: {
            type: DataTypes.JSON,
            defaultValue: {
                enabled: false,
                start: '22:00',
                end: '08:00',
                timezone: 'America/Sao_Paulo'
            }
        },
        frequency: {
            type: DataTypes.ENUM('immediate', 'hourly', 'daily', 'weekly', 'never'),
            defaultValue: 'immediate'
        },
        maxDaily: {
            type: DataTypes.INTEGER,
            defaultValue: 50,
            comment: 'Máximo de notificações diárias'
        },
        grouping: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Agrupar notificações similares'
        },
        sound: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Reproduzir som'
        },
        vibration: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Vibrar (mobile)'
        },
        badge: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Mostrar contador badge'
        },
        desktop: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Notificação desktop'
        },
        email: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Enviar por email'
        },
        sms: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Enviar por SMS'
        },
        push: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Enviar push notification'
        },
        discord: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Enviar para Discord'
        },
        customSettings: {
            type: DataTypes.JSON,
            defaultValue: {},
            comment: 'Configurações personalizadas'
        }
    }, {
        tableName: 'notification_preferences',
        timestamps: true,
        indexes: [
            { fields: ['userId'] },
            { fields: ['type'] },
            { fields: ['enabled'] },
            { fields: ['userId', 'type'] },
            { fields: ['userId', 'enabled'] }
        ]
    });

    // Métodos de instância
    NotificationPreference.prototype.isEnabled = function(channel = null) {
        if (!this.enabled) return false;
        
        if (channel) {
            return this.channels.includes(channel);
        }
        
        return true;
    };

    NotificationPreference.prototype.isInQuietHours = function() {
        if (!this.quietHours.enabled) return false;
        
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM
        
        return currentTime >= this.quietHours.start && currentTime <= this.quietHours.end;
    };

    NotificationPreference.prototype.shouldSend = function(channel = null) {
        if (!this.isEnabled(channel)) return false;
        
        if (this.isInQuietHours() && channel !== 'email') {
            return false; // Apenas email durante horário de silêncio
        }
        
        return true;
    };

    NotificationPreference.prototype.updateChannel = function(channel, enabled) {
        if (enabled && !this.channels.includes(channel)) {
            this.channels.push(channel);
        } else if (!enabled && this.channels.includes(channel)) {
            this.channels = this.channels.filter(c => c !== channel);
        }
        
        // Atualizar propriedades booleanas correspondentes
        this[channel] = enabled;
    };

module.exports = NotificationPreference;
