import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/payments/create-payment-intent:
 *   post:
 *     summary: Create a payment intent for an order
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 */
router.post('/create-payment-intent',
  auth,
  paymentController.createPaymentSession
);

router.post('/confirm',
  auth,
  paymentController.confirmPayment
);

router.post('/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handlePaymentWebhook
);

export default router;
