import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../src/models/product.model.js';
import Category from '../src/models/category.model.js';
import { PRODUCT_CATEGORIES } from '../src/constants/index.js';

dotenv.config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Ensure all categories from constants exist in DB
        console.log('Ensuring categories exist...');
        const categoryMap = {};
        for (const catName of PRODUCT_CATEGORIES) {
            let category = await Category.findOne({ name: catName });
            if (!category) {
                category = await Category.create({
                    name: catName,
                    description: catName,
                    isActive: true
                });
                console.log(`Created category: ${catName}`);
            }
            categoryMap[catName] = category._id;
        }

        // 2. Fetch all products that have a string category
        const products = await Product.find({}).lean();
        console.log(`Checking ${products.length} products...`);

        let updatedCount = 0;
        for (const p of products) {
            if (typeof p.category === 'string') {
                const catId = categoryMap[p.category];
                if (catId) {
                    await Product.findByIdAndUpdate(p._id, { category: catId });
                    updatedCount++;
                } else {
                    console.warn(`Category "${p.category}" for product "${p.name}" not found in map.`);
                }
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} products.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
