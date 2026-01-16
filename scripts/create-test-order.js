import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
import { Address } from '../src/models/address.model.js';
import Cart from '../src/models/cart.model.js';
import * as orderService from '../src/services/order.service.js';

async function createOrderForUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'starukido@gmail.com';
        const user = await User.findOne({ email });
        if (!user) {
            console.error('User not found');
            return;
        }

        // 1. Create Address
        let address = await Address.findOne({ user: user._id });
        if (!address) {
            address = await Address.create({
                user: user._id,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber || '08012345678',
                street: '22 Baker Street',
                city: 'London',
                zipCode: 'NW1 6XE',
                country: 'UK',
                isDefault: true
            });
            console.log('Address created');
        }

        // 2. Get Products
        const products = await Product.find({}).limit(2);
        if (products.length < 1) {
            console.error('No products found');
            return;
        }

        // 3. Populate Cart
        let cart = await Cart.findOne({ user: user._id });
        if (!cart) {
            cart = new Cart({ user: user._id, items: [], total: 0 });
        }

        // Clear cart first for clean state
        cart.items = [];
        cart.total = 0;

        for (const product of products) {
            cart.items.push({
                product: product._id,
                quantity: 1,
                price: product.price
            });
            cart.total += product.price;
        }
        await cart.save();
        console.log('Cart populated');

        // 4. Create Order (this will trigger notifications)
        console.log('Creating order...');
        const order = await orderService.createOrder(user._id, address._id);
        console.log('✅ Order created successfully:', order.orderNumber);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

createOrderForUser();
