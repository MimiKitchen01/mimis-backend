import express from 'express';
import * as chatController from '../controllers/chat.controller.js';
import auth from '../middleware/auth.js';

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
 *         description: Chat initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 channelId:
 *                   type: string
 *                 apiKey:
 *                   type: string
 */
router.post('/initialize', auth, chatController.initializeChat);

/**
 * @swagger
 * /api/chat/history:
 *   get:
 *     summary: Get customer support chat history
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 */
router.get('/history', auth, chatController.getChatHistory);

export default router;
