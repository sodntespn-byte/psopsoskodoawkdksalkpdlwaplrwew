const NotificationService = require('../services/notificationService');

class NotificationController {
    constructor() {
        this.notificationService = new NotificationService();
        this.notificationService.startAutoProcessing();
    }

    // Obter notificações do usuário
    async getUserNotifications(req, res) {
        try {
            const userId = req.user.id;
            const options = {
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0,
                unread: req.query.unread === 'true',
                archived: req.query.archived === 'true',
                type: req.query.type || null,
                priority: req.query.priority || null
            };

            const result = await this.notificationService.getUserNotifications(userId, options);
            
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Erro ao obter notificações:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter notificações'
            });
        }
    }

    // Marcar notificação como lida
    async markAsRead(req, res) {
        try {
            const userId = req.user.id;
            const { notificationId } = req.params;

            const result = await this.notificationService.markAsRead(notificationId, userId);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao marcar notificação como lida'
            });
        }
    }

    // Marcar múltiplas notificações como lidas
    async markMultipleAsRead(req, res) {
        try {
            const userId = req.user.id;
            const { notificationIds } = req.body;

            if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'IDs de notificações inválidos'
                });
            }

            const results = [];
            for (const notificationId of notificationIds) {
                const result = await this.notificationService.markAsRead(notificationId, userId);
                results.push(result);
            }

            const successCount = results.filter(r => r.success).length;
            
            res.json({
                success: true,
                processed: results.length,
                successCount,
                failedCount: results.length - successCount,
                results
            });
        } catch (error) {
            console.error('Erro ao marcar múltiplas notificações como lidas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao marcar notificações como lidas'
            });
        }
    }

    // Arquivar notificação
    async archiveNotification(req, res) {
        try {
            const userId = req.user.id;
            const { notificationId } = req.params;

            const result = await this.notificationService.archiveNotification(notificationId, userId);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao arquivar notificação:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao arquivar notificação'
            });
        }
    }

    // Arquivar múltiplas notificações
    async archiveMultipleNotifications(req, res) {
        try {
            const userId = req.user.id;
            const { notificationIds } = req.body;

            if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'IDs de notificações inválidos'
                });
            }

            const results = [];
            for (const notificationId of notificationIds) {
                const result = await this.notificationService.archiveNotification(notificationId, userId);
                results.push(result);
            }

            const successCount = results.filter(r => r.success).length;
            
            res.json({
                success: true,
                processed: results.length,
                successCount,
                failedCount: results.length - successCount,
                results
            });
        } catch (error) {
            console.error('Erro ao arquivar múltiplas notificações:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao arquivar notificações'
            });
        }
    }

    // Obter preferências do usuário
    async getPreferences(req, res) {
        try {
            const userId = req.user.id;
            const { NotificationPreference } = require('../models');

            const preferences = await NotificationPreference.findAll({
                where: { userId }
            });

            res.json({
                success: true,
                preferences
            });
        } catch (error) {
            console.error('Erro ao obter preferências:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter preferências'
            });
        }
    }

    // Atualizar preferências do usuário
    async updatePreferences(req, res) {
        try {
            const userId = req.user.id;
            const { preferences } = req.body;

            if (!Array.isArray(preferences)) {
                return res.status(400).json({
                    success: false,
                    error: 'Preferências devem ser um array'
                });
            }

            const result = await this.notificationService.updatePreferences(userId, preferences);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao atualizar preferências:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar preferências'
            });
        }
    }

    // Obter estatísticas de notificações
    async getStats(req, res) {
        try {
            const userId = req.user.id;
            const result = await this.notificationService.getNotificationStats(userId);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter estatísticas'
            });
        }
    }

    // Enviar notificação (admin)
    async sendNotification(req, res) {
        try {
            const { userId, type, data, options } = req.body;

            if (!userId || !type) {
                return res.status(400).json({
                    success: false,
                    error: 'userId e type são obrigatórios'
                });
            }

            const result = await this.notificationService.sendNotification(userId, type, data, options);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao enviar notificação'
            });
        }
    }

    // Enviar notificação em massa (admin)
    async sendBulkNotification(req, res) {
        try {
            const { userIds, type, data, options } = req.body;

            if (!Array.isArray(userIds) || !type) {
                return res.status(400).json({
                    success: false,
                    error: 'userIds (array) e type são obrigatórios'
                });
            }

            const results = [];
            for (const userId of userIds) {
                const result = await this.notificationService.sendNotification(userId, type, data, options);
                results.push({ userId, ...result });
            }

            const successCount = results.filter(r => r.success).length;
            
            res.json({
                success: true,
                processed: results.length,
                successCount,
                failedCount: results.length - successCount,
                results
            });
        } catch (error) {
            console.error('Erro ao enviar notificações em massa:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao enviar notificações em massa'
            });
        }
    }

    // Obter templates de notificação (admin)
    async getTemplates(req, res) {
        try {
            const { NotificationTemplate } = require('../models');
            const { type, channel } = req.query;

            const where = {};
            if (type) where.type = type;
            if (channel) where.channel = channel;

            const templates = await NotificationTemplate.scope('active').findAll({
                where,
                order: [['type', 'ASC'], ['channel', 'ASC']]
            });

            res.json({
                success: true,
                templates
            });
        } catch (error) {
            console.error('Erro ao obter templates:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter templates'
            });
        }
    }

    // Criar template de notificação (admin)
    async createTemplate(req, res) {
        try {
            const { NotificationTemplate } = require('../models');
            const templateData = req.body;

            const template = await NotificationTemplate.create(templateData);
            
            res.status(201).json({
                success: true,
                template
            });
        } catch (error) {
            console.error('Erro ao criar template:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao criar template'
            });
        }
    }

    // Atualizar template de notificação (admin)
    async updateTemplate(req, res) {
        try {
            const { NotificationTemplate } = require('../models');
            const { templateId } = req.params;
            const updateData = req.body;

            const template = await NotificationTemplate.findByPk(templateId);
            
            if (!template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template não encontrado'
                });
            }

            await template.update(updateData);
            
            res.json({
                success: true,
                template
            });
        } catch (error) {
            console.error('Erro ao atualizar template:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar template'
            });
        }
    }

    // Testar template (admin)
    async testTemplate(req, res) {
        try {
            const { NotificationTemplate } = require('../models');
            const { templateId, variables } = req.body;

            const template = await NotificationTemplate.findByPk(templateId);
            
            if (!template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template não encontrado'
                });
            }

            const rendered = template.render(variables || {});
            const missingVariables = template.validateVariables(variables || {});
            
            res.json({
                success: true,
                template,
                rendered,
                missingVariables
            });
        } catch (error) {
            console.error('Erro ao testar template:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao testar template'
            });
        }
    }

    // Limpar notificações expiradas (admin)
    async cleanupExpired(req, res) {
        try {
            const result = await this.notificationService.cleanupExpiredNotifications();
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro na limpeza de notificações expiradas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro na limpeza de notificações expiradas'
            });
        }
    }

    // Obter estatísticas gerais (admin)
    async getGeneralStats(req, res) {
        try {
            const result = await this.notificationService.getNotificationStats();
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Erro ao obter estatísticas gerais:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter estatísticas gerais'
            });
        }
    }
}

module.exports = NotificationController;
