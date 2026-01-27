import 'dotenv/config';
import Stripe from 'stripe';
import { createPaymentIntent } from '../src/services/payment.service.js';
import mongoose from 'mongoose';

async function testStripe() {
    console.log('--- Starting Stripe Integration Test ---');

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
        console.error('❌ STRIPE_SECRET_KEY not found in .env');
        process.exit(1);
    }

    console.log('Stripe Key found (Type: ' + (stripeKey.startsWith('sk_live') ? 'Live' : 'Test') + ')');

    // Mock order object
    const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        total: 15.00,
        orderNumber: 'TEST-STRIPE-' + Date.now().toString(36).toUpperCase()
    };

    console.log(`Attempting to create Payment Intent for Order: ${mockOrder.orderNumber}, Amount: ${mockOrder.total} GBP`);

    try {
        // Calling the service directly
        const paymentIntent = await createPaymentIntent(mockOrder);

        console.log('✅ Stripe Payment Intent created successfully!');
        console.log('Payment Intent ID:', paymentIntent.id);
        console.log('Client Secret:', paymentIntent.client_secret ? 'Found' : 'Missing');
        console.log('Automatic Payment Methods:', paymentIntent.automatic_payment_methods?.enabled ? 'Enabled' : 'Disabled');

        process.exit(0);
    } catch (error) {
        console.error('❌ Stripe Test Failed!');
        console.error('Error Message:', error.message);
        if (error.stack) {
            console.error('Stack Trace:', error.stack);
        }
        process.exit(1);
    }
}

testStripe();
