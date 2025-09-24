import express from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [order, payment, system]
 */
router.get('/', auth, notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 */
router.get('/unread-count', auth, notificationController.getUnreadCount);

/**
 * @swagger
 * /api/notifications/latest:
 *   get:
 *     summary: Get latest notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 */
router.get('/latest', auth, notificationController.getLatestNotifications);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 */
router.patch('/mark-all-read', auth, notificationController.markAllNotificationsAsRead);

/**
 * @swagger
 * /api/notifications/clear-all:
 *   delete:
 *     summary: Delete all read notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 */
router.delete('/clear-all', auth, notificationController.clearAllReadNotifications);

/**
 * @swagger
 * /api/notifications/type/{type}:
 *   get:
 *     summary: Get notifications by type
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [order, payment, system]
 */
router.get('/type/:type', auth, notificationController.getNotificationsByType);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 */
router.patch('/:id/read', auth, notificationController.markNotificationAsRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 */
router.delete('/:id', auth, notificationController.deleteNotification);

export default router;
