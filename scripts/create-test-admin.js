import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';

async function createTestAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@mimiskitchen.com';
        let admin = await User.findOne({ email });

        if (admin) {
            console.log('Admin already exists. Updating password...');
            admin.password = 'Admin123@';
            admin.role = 'admin';
            admin.isVerified = true;
            await admin.save();
        } else {
            admin = await User.createAdmin({
                email: email,
                password: 'Admin123@',
                fullName: 'System Admin'
            });
        }

        console.log('✅ Admin user ready:', admin.email);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

createTestAdmin();
