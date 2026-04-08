const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { requireAuth, requireAdmin } = require('../middleware/security');

const notificationController = new NotificationController();

// Rotas do usuário autenticado
router.get('/user/notifications', requireAuth, notificationController.getUserNotifications.bind(notificationController));

router.patch('/user/notifications/:notificationId/read', requireAuth, notificationController.markAsRead.bind(notificationController));

router.patch('/user/notifications/mark-read', requireAuth, notificationController.markMultipleAsRead.bind(notificationController));

router.patch('/user/notifications/:notificationId/archive', requireAuth, notificationController.archiveNotification.bind(notificationController));

router.patch('/user/notifications/archive', requireAuth, notificationController.archiveMultipleNotifications.bind(notificationController));

router.get('/user/preferences', requireAuth, notificationController.getPreferences.bind(notificationController));

router.put('/user/preferences', requireAuth, notificationController.updatePreferences.bind(notificationController));

router.get('/user/stats', requireAuth, notificationController.getStats.bind(notificationController));

// Rotas administrativas
router.post('/admin/send', requireAdmin, notificationController.sendNotification.bind(notificationController));

router.post('/admin/send-bulk', requireAdmin, notificationController.sendBulkNotification.bind(notificationController));

router.get('/admin/templates', requireAdmin, notificationController.getTemplates.bind(notificationController));

router.post('/admin/templates', requireAdmin, notificationController.createTemplate.bind(notificationController));

router.put('/admin/templates/:templateId', requireAdmin, notificationController.updateTemplate.bind(notificationController));

router.post('/admin/templates/:templateId/test', requireAdmin, notificationController.testTemplate.bind(notificationController));

router.post('/admin/cleanup', requireAdmin, notificationController.cleanupExpired.bind(notificationController));

router.get('/admin/stats', requireAdmin, notificationController.getGeneralStats.bind(notificationController));

module.exports = router;
