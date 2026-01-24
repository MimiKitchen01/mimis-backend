import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../src/models/product.model.js';
import Category from '../src/models/category.model.js';
import Review from '../src/models/review.model.js';
import Order from '../src/models/order.model.js';

dotenv.config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Test a specific product ID if possible, or grab one from DB
        const product = await Product.findOne();
        if (!product) {
            console.log('No products found in DB to test.');
            process.exit(0);
        }

        const productId = product._id;
        console.log(`Testing with Product ID: ${productId}`);

        // 1. Test getProduct (populated category)
        const p1 = await Product.findById(productId).populate('category', 'name');
        console.log('--- getProduct Population ---');
        console.log('Category:', p1.category);

        // 2. Test getAllProducts (populated category)
        const p2 = await Product.find({}).populate('category', 'name').limit(1).lean();
        console.log('--- getAllProducts Population (lean) ---');
        console.log('Category:', p2[0]?.category);

        // 3. Test getRandomProducts (lookup + unwind)
        const p3 = await Product.aggregate([
            { $match: { isAvailable: true } },
            { $sample: { size: 1 } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' }
        ]);
        console.log('--- getRandomProducts Aggregation ---');
        console.log('Category:', p3[0]?.category);

        // 4. Test getMostOrderedProducts (lookup + unwind)
        const p4 = await Product.aggregate([
            { $match: { isAvailable: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            { $limit: 1 }
        ]);
        console.log('--- getMostOrderedProducts Aggregation ---');
        console.log('Category:', p4[0]?.category);

        console.log('\nVerification completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
