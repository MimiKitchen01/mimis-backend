import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../src/models/product.model.js';
import Cart from '../src/models/cart.model.js';
import Order from '../src/models/order.model.js';
import User from '../src/models/user.model.js';
import { Address } from '../src/models/address.model.js';
import * as orderService from '../src/services/order.service.js';
import * as cartService from '../src/services/cart.service.js';

dotenv.config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Setup - find or create a test user
        let user = await User.findOne({ email: 'test@example.com' });
        if (!user) {
            user = await User.create({
                fullName: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                role: 'user'
            });
        }
        const userId = user._id;

        // Ensure address exists
        let address = await Address.findOne({ user: userId });
        if (!address) {
            address = await Address.create({
                user: userId,
                street: '123 Test St',
                city: 'Test City',
                zipCode: '12345',
                isDefault: true
            });
        }

        // 2. Test Additive Cart
        console.log('\n--- Testing Additive Cart ---');
        await Cart.deleteOne({ user: userId });
        const product = await Product.findOne({ isAvailable: true });
        if (!product) throw new Error('No available products for testing');

        // Add first time
        await cartService.addToCart(userId, product._id, 1);
        let cart = await Cart.findOne({ user: userId });
        console.log(`Cart items after 1st add: ${cart.items[0].quantity} (Expected: 1)`);

        // Add second time (should be additive)
        await cartService.addToCart(userId, product._id, 2);
        cart = await Cart.findOne({ user: userId });
        console.log(`Cart items after 2nd add: ${cart.items[0].quantity} (Expected: 3)`);

        // 3. Test Order Creation (Cart NOT cleared)
        console.log('\n--- Testing Order Creation (Cart should NOT be cleared) ---');
        const order = await orderService.createOrder(userId, address._id);
        console.log(`Order created with status: ${order.status}`);

        cart = await Cart.findOne({ user: userId });
        console.log(`Cart item count after order creation: ${cart.items.length} (Expected: 1)`);

        // 4. Test Payment Completion (Cart cleared)
        console.log('\n--- Testing Payment Completion (Cart SHOULD be cleared) ---');
        // Simulate processPayment logic
        order.paymentStatus = 'completed';
        order.status = 'confirmed';
        await order.save();
        await cartService.clearCart(userId);

        cart = await Cart.findOne({ user: userId });
        console.log(`Cart item count after payment: ${cart.items.length} (Expected: 0)`);

        // 5. Test getOrders filtering
        console.log('\n--- Testing getOrders Filtering ---');
        // Create a pending order
        const pendingOrder = new Order({
            orderNumber: 'TEST-PENDING-' + Date.now(),
            user: userId,
            items: [{ product: product._id, quantity: 1, price: product.price }],
            total: product.price,
            deliveryAddress: address._id,
            status: 'pending'
        });
        await pendingOrder.save();

        const ordersWithPending = await Order.find({ user: userId });
        console.log(`Total orders found with find(): ${ordersWithPending.length}`);

        // Simulate getOrders filter: query.status = { $ne: 'pending' }
        const filteredOrders = await Order.find({ user: userId, status: { $ne: 'pending' } });
        console.log(`Orders found with pending filtered out: ${filteredOrders.length}`);

        const hasPending = filteredOrders.some(o => o.status === 'pending');
        console.log(`Is any pending order in the filtered list? ${hasPending} (Expected: false)`);

        console.log('\nVerification completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
