import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
import { Address } from '../src/models/address.model.js';
import Cart from '../src/models/cart.model.js';
import * as orderService from '../src/services/order.service.js';

async function createTwoOrders() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'starukido@gmail.com';
        const user = await User.findOne({ email });
        if (!user) {
            console.error('User not found');
            return;
        }

        let address = await Address.findOne({ user: user._id });
        const product = await Product.findOne({});

        if (!product) {
            console.error('No products found');
            return;
        }

        for (let i = 1; i <= 2; i++) {
            console.log(`\n--- Creating Order #${i} ---`);

            // Populate Cart
            let cart = await Cart.findOne({ user: user._id });
            if (!cart) cart = new Cart({ user: user._id, items: [], total: 0 });

            cart.items = [{
                product: product._id,
                quantity: i, // Different quantity for different totals
                price: product.price
            }];
            cart.total = product.price * i;
            await cart.save();

            // Create Order
            const order = await orderService.createOrder(user._id, address?._id);
            console.log(`✅ Order #${i} created: ${order.orderNumber}`);

            // Wait 2 seconds between orders
            if (i < 2) await new Promise(resolve => setTimeout(resolve, 2000));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

createTwoOrders();
