import 'dotenv/config';
import mongoose from 'mongoose';
import Category from '../src/models/category.model.js';
import { PRODUCT_CATEGORIES } from '../src/constants/index.js';

async function seedCategories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (let i = 0; i < PRODUCT_CATEGORIES.length; i++) {
            const name = PRODUCT_CATEGORIES[i];
            const existing = await Category.findOne({ name });
            if (!existing) {
                await Category.create({ name, sortOrder: i });
                console.log(`Created category: ${name}`);
            }
        }
        console.log('Categories seeded successfully.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seedCategories();
