const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Notification = sequelize.define('Notification', {
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
        title: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        priority: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
            defaultValue: 'medium'
        },
        channels: {
            type: DataTypes.JSON,
            defaultValue: ['web'],
            comment: 'Canais de entrega: web, email, sms, push, discord'
        },
        status: {
            type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
            defaultValue: 'pending'
        },
        data: {
            type: DataTypes.JSON,
            defaultValue: {},
            comment: 'Dados adicionais da notificação'
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {},
            comment: 'Metadados como template, variables, etc.'
        },
        scheduledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Data agendada para envio'
        },
        sentAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Data de expiração da notificação'
        },
        retryCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Número de tentativas de envio'
        },
        maxRetries: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
            comment: 'Número máximo de tentativas'
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isArchived: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        actionUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'URL para ação da notificação'
        },
        actionText: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Texto do botão de ação'
        },
        icon: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Ícone da notificação'
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'Cor da notificação (hex)'
        },
        imageUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'URL da imagem da notificação'
        },
        tags: {
            type: DataTypes.JSON,
            defaultValue: [],
            comment: 'Tags para categorização'
        }
    }, {
        tableName: 'notifications',
        timestamps: true,
        paranoid: true, // Soft delete
        indexes: [
            { fields: ['userId'] },
            { fields: ['type'] },
            { fields: ['status'] },
            { fields: ['priority'] },
            { fields: ['scheduledAt'] },
            { fields: ['createdAt'] },
            { fields: ['expiresAt'] },
            { fields: ['isRead'] },
            { fields: ['isArchived'] },
            { fields: ['userId', 'status'] },
            { fields: ['userId', 'isRead'] },
            { fields: ['type', 'status'] }
        ],
        hooks: {
            beforeCreate: (notification) => {
                // Definir expiração padrão se não especificada
                if (!notification.expiresAt) {
                    const expirationTime = new Date();
                    expirationTime.setDate(expirationTime.getDate() + 30); // 30 dias
                    notification.expiresAt = expirationTime;
                }
            },
            beforeUpdate: (notification) => {
                // Atualizar timestamps de status
                if (notification.changed('status')) {
                    const now = new Date();
                    
                    switch (notification.status) {
                        case 'sent':
                            notification.sentAt = now;
                            break;
                        case 'delivered':
                            notification.deliveredAt = now;
                            break;
                        case 'read':
                            notification.readAt = now;
                            notification.isRead = true;
                            break;
                    }
                }
                
                if (notification.changed('isRead') && notification.isRead) {
                    notification.readAt = new Date();
                    notification.status = 'read';
                }
            }
        }
    });

    // Métodos de instância
    Notification.prototype.markAsRead = async function() {
        this.isRead = true;
        this.status = 'read';
        this.readAt = new Date();
        return await this.save();
    };

    Notification.prototype.markAsDelivered = async function() {
        this.status = 'delivered';
        this.deliveredAt = new Date();
        return await this.save();
    };

    Notification.prototype.archive = async function() {
        this.isArchived = true;
        return await this.save();
    };

    Notification.prototype.canRetry = function() {
        return this.retryCount < this.maxRetries && this.status === 'failed';
    };

    Notification.prototype.isExpired = function() {
        return this.expiresAt && new Date() > this.expiresAt;
    };

    Notification.prototype.getPriorityValue = function() {
        const priorityValues = {
            low: 1,
            medium: 2,
            high: 3,
            urgent: 4
        };
        return priorityValues[this.priority] || 2;
    };

    // Scopes
    Notification.addScope('unread', {
        where: {
            isRead: false,
            isArchived: false
        }
    });

    Notification.addScope('archived', {
        where: {
            isArchived: true
        }
    });

    Notification.addScope('active', {
        where: {
            isArchived: false
        }
    });

    Notification.addScope('byPriority', (priority) => ({
        where: {
            priority: priority
        }
    }));

    Notification.addScope('byType', (type) => ({
        where: {
            type: type
        }
    }));

    Notification.addScope('byStatus', (status) => ({
        where: {
            status: status
        }
    }));

    Notification.addScope('pending', {
        where: {
            status: 'pending'
        }
    });

    Notification.addScope('failed', {
        where: {
            status: 'failed'
        }
    });

    Notification.addScope('recent', {
        where: {
            createdAt: {
                [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 dias
            }
        }
    });

    Notification.addScope('scheduled', {
        where: {
            scheduledAt: {
                [sequelize.Sequelize.Op.gte]: new Date()
            },
            status: 'pending'
        }
    });

    return Notification;
};
