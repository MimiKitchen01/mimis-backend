import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/create-payment-intent', 
  auth, 
  paymentController.createPaymentSession
);

router.post('/webhook', 
  express.raw({type: 'application/json'}),
  paymentController.handlePaymentWebhook
);

export default router; 
