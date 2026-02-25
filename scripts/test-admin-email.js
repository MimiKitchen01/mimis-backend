import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../src/models/order.model.js';
import User from '../src/models/user.model.js';
import { Address } from '../src/models/address.model.js';
import * as emailService from '../src/services/email.service.js';
import logger from '../src/utils/logger.js';

async function testAdminEmail() {
    try {
        console.log('🚀 Starting Admin Email Notification Test...');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is not set in .env');
        }
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Create a dummy user
        const user = new User({
            fullName: 'Test Customer',
            email: 'customer@example.com',
            phoneNumber: '+44 123 456 7890',
            password: 'password123'
        });
        // We don't necessarily need to save to DB for this test if we populate manually,
        // but the service calls .populate() which might fail if IDs don't exist.
        // Let's use an existing user if possible or just mock the object and bypass populate if needed.
        // Actually, let's create real records to be safe.
        await user.save();
        console.log('👤 Created test user');

        // Create a dummy address
        const address = new Address({
            user: user._id,
            street: '123 Mimi Street',
            city: 'London',
            zipCode: 'SW1A 1AA',
            state: 'Greater London',
            country: 'United Kingdom',
            isDefault: true
        });
        await address.save();
        console.log('📍 Created test address');

        // Create a dummy order
        const order = new Order({
            orderNumber: 'TEST-' + Date.now().toString(36).toUpperCase(),
            user: user._id,
            items: [
                {
                    product: new mongoose.Types.ObjectId(), // Mock product ID
                    quantity: 2,
                    price: 15.50
                }
            ],
            total: 31.00,
            deliveryAddress: address._id,
            status: 'confirmed',
            paymentStatus: 'completed'
        });
        await order.save();
        console.log(`📦 Created test order #${order.orderNumber}`);

        // Populate order correctly as expected by the service
        await order.populate(['user', 'deliveryAddress']);
        // Note: items.product won't populate correctly with a mock ID, but our template handles 'Unknown Product'

        console.log('📧 Sending admin notifications...');
        await emailService.sendAdminOrderNotification(order);

        console.log('✅ Admin Notification process completed. Check logs and Mailtrap.');

        // Cleanup
        await Order.deleteOne({ _id: order._id });
        await Address.deleteOne({ _id: address._id });
        await User.deleteOne({ _id: user._id });
        console.log('🧹 Cleanup completed');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 DB connection closed');
    }
}

testAdminEmail();
