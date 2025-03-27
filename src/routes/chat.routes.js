import express from 'express';
import * as chatController from '../controllers/chat.controller.js';
import auth from '../middleware/auth.js';
import { adminAuth } from '../middleware/admin.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/chat/initialize:
 *   post:
 *     summary: Initialize customer support chat (Customer only)
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 */
router.post('/initialize',
    auth,
    (req, res, next) => {
        // Middleware to prevent admin access
        if (req.user.role === 'admin') {
            return res.status(403).json({
                message: 'Admins cannot initiate customer support chats'
            });
        }
        next();
    },
    chatController.initializeChat
);

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

/**
 * @swagger
 * /api/chat/admin/customers:
 *   get:
 *     summary: Get all customers with active chats (Admin only)
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 */
router.get('/admin/customers',
    auth,
    adminAuth,
    chatController.getActiveCustomers
);

/**
 * @swagger
 * /api/chat/admin/customers/{customerId}/history:
 *   get:
 *     summary: Get chat history for a specific customer (Admin only)
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/admin/customers/:customerId/history',
    auth,
    adminAuth,
    chatController.getCustomerChatHistory
);

// Add route for admin to join customer chat
router.post('/admin/join/:channelId',
    auth,
    adminAuth,
    chatController.joinCustomerChat
);

router.post('/admin/message',
    auth,
    adminAuth,
    chatController.sendMessage
);

export default router;
