import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../src/models/product.model.js';
import Category from '../src/models/category.model.js';

async function seedProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const drinkCat = await Category.findOne({ name: 'Drink Menu' });
        const riceCat = await Category.findOne({ name: 'Rice Menu' });
        const soupsCat = await Category.findOne({ name: 'Soups Menu' });

        const products = [
            {
                name: 'Classic Jollof Rice with Grilled Chicken',
                price: 15.00,
                category: riceCat._id,
                imageUrl: '/Users/temple/.gemini/antigravity/brain/69915dae-557a-4b10-9148-9754881ff1f7/jollof_rice_chicken_1768599661302.png',
                description: 'Smoky West African Jollof rice served with perfectly grilled quarter chicken, sweet fried plantains, and a side of fresh coleslaw.',
                preparationTime: 25,
                spicyLevel: 'Medium',
                isPopular: true,
                nutritionInfo: { calories: 850, protein: 45, carbohydrates: 110, fats: 22 },
                ingredients: ['Long grain parboiled rice', 'Tomatoes', 'Red bell peppers', 'Chicken', 'Plantain', 'Onions', 'Secret spices']
            },
            {
                name: 'Pounded Yam with Rich Egusi Soup',
                price: 18.50,
                category: soupsCat._id,
                imageUrl: '/Users/temple/.gemini/antigravity/brain/69915dae-557a-4b10-9148-9754881ff1f7/egusi_soup_pounded_yam_1768599684266.png',
                description: 'Authentic pounded yam served with rich Egusi (melon seed) soup, thickened with spinach and slow-cooked assorted meats.',
                preparationTime: 30,
                spicyLevel: 'Medium',
                isSpecial: true,
                nutritionInfo: { calories: 950, protein: 55, carbohydrates: 120, fats: 28 },
                ingredients: ['Yam', 'Melon seeds', 'Spinach', 'Beef', 'Tripe', 'Stock fish', 'Palm oil']
            },
            {
                name: 'Signature Chapman Cocktail',
                price: 7.50,
                category: drinkCat._id,
                imageUrl: '/Users/temple/.gemini/antigravity/brain/69915dae-557a-4b10-9148-9754881ff1f7/chapman_drink_1768599704166.png',
                description: 'The ultimate Nigerian mocktail. A refreshing blend of Fanta, Sprite, Angostura bitters, and pomegranate, garnished with cucumber and lemon.',
                preparationTime: 5,
                spicyLevel: 'Not Spicy',
                nutritionInfo: { calories: 150, protein: 0, carbohydrates: 38, fats: 0 },
                ingredients: ['Fanta', 'Sprite', 'Grenadine', 'Angostura bitters', 'Cucumber', 'Lemon', 'Lime', 'Mint']
            },
            {
                name: 'Spicy Beef Suya Platter',
                price: 12.00,
                category: appetizersCat._id,
                imageUrl: '/Users/temple/.gemini/antigravity/brain/69915dae-557a-4b10-9148-9754881ff1f7/beef_suya_skewers_1768599867216.png',
                description: 'Thinly sliced beef grilled over charcoal and coated in a spicy peanut rub (Yaji). Served with fresh onions, tomatoes, and cabbage.',
                preparationTime: 20,
                spicyLevel: 'Hot',
                nutritionInfo: { calories: 450, protein: 38, carbohydrates: 10, fats: 28 },
                ingredients: ['Beef', 'Groundnut cake (Kuli-kuli)', 'Ginger', 'Garlic', 'Cayenne pepper', 'Onions']
            }
        ];

        for (const p of products) {
            const existing = await Product.findOne({ name: p.name });
            if (!existing) {
                await Product.create(p);
                console.log(`Created product: ${p.name}`);
            } else {
                console.log(`Product already exists: ${p.name}`);
            }
        }
        console.log('Products seeded successfully.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seedProducts();
