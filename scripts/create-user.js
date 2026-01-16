import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import bcrypt from 'bcryptjs';

const email = 'starukido@gmail.com';
const password = 'Temple7447@';
const fullName = 'Star Ukido';

async function createAndVerifyUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists, updating verification status...');
            existingUser.isVerified = true;
            existingUser.isActive = true;
            existingUser.password = password; // Pre-save hook will hash it
            await existingUser.save();
            console.log('User updated and verified successfully.');
        } else {
            console.log('Creating new user...');
            const user = new User({
                email,
                password,
                fullName,
                isVerified: true,
                isActive: true
            });
            await user.save();
            console.log('User created and verified successfully.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

createAndVerifyUser();
