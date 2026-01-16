import 'dotenv/config';
import mongoose from 'mongoose';
import Category from '../src/models/category.model.js';

async function listCategories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const categories = await Category.find({});
        console.log(JSON.stringify(categories, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

listCategories();
