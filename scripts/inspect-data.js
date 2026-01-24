import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../src/models/product.model.js';

dotenv.config();

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({}).limit(10).lean();
        console.log('Sample Products Category Field:');
        products.forEach(p => {
            console.log(`Product: ${p.name}, Category: ${p.category} (${typeof p.category})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Inspection failed:', error.message);
        process.exit(1);
    }
}

inspect();
