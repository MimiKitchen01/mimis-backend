import express from 'express';
import * as chatController from '../controllers/chat.controller.js';
import auth from '../middleware/auth.js';
import { adminAuth } from '../middleware/admin.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/chat/initialize:
 *   post:
 *     summary: Initialize customer support chat
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Chat session initialized
 */
router.post('/initialize', auth, chatController.initializeChat);

/**
 * @swagger
 * /api/chat/history:
 *   get:
 *     summary: Get support chat history
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Chat history retrieved
 */
router.get('/history', auth, chatController.getSupportHistory);

router.post('/admin/initialize',
    auth,
    adminAuth,
    chatController.initializeAdminChat
);

router.post('/admin/message',
    auth,
    adminAuth,
    chatController.sendMessage
);

export default router;
