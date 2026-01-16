import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';

async function checkTokens() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const usersWithTokens = await User.find({
            fcmTokens: { $exists: true, $not: { $size: 0 } }
        });

        if (usersWithTokens.length === 0) {
            console.log('❌ No users found with FCM tokens in the database.');
        } else {
            console.log(`✅ Found ${usersWithTokens.length} users with tokens:`);
            usersWithTokens.forEach(u => {
                console.log(`- Email: ${u.email}, ID: ${u._id}, Tokens: ${u.fcmTokens.length}`);
            });
        }

        const starukido = await User.findOne({ email: 'starukido@gmail.com' });
        if (starukido) {
            console.log(`\nStarukido Status:`);
            console.log(`- ID: ${starukido._id}`);
            console.log(`- Tokens: ${JSON.stringify(starukido.fcmTokens)}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkTokens();
