import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import * as notificationService from '../src/services/notification.service.js';
import chalk from 'chalk';

async function testPush() {
    const emailOrId = process.argv[2];

    if (!emailOrId) {
        console.log(chalk.red('Please provide an email or User ID as an argument.'));
        console.log(chalk.gray('Usage: node scripts/test-user-push.js admin@mimiskitchen.com'));
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(chalk.blue('Connected to MongoDB'));

        let user;
        if (mongoose.Types.ObjectId.isValid(emailOrId)) {
            user = await User.findById(emailOrId);
        } else {
            user = await User.findOne({ email: emailOrId });
        }

        if (!user) {
            console.log(chalk.red(`User not found: ${emailOrId}`));
            process.exit(1);
        }

        console.log(chalk.blue(`Testing push for user: ${user.email} (${user._id})`));
        console.log(chalk.blue(`Tokens found: ${user.fcmTokens?.length || 0}`));

        if (!user.fcmTokens || user.fcmTokens.length === 0) {
            console.log(chalk.yellow('No tokens registered for this user.'));
            process.exit(1);
        }

        const result = await notificationService.sendPushNotification(user._id, {
            title: 'Backend Test Push 🚀',
            body: 'If you see this, the new payload structure is working!',
            data: {
                type: 'test_push',
                timestamp: new Date().toISOString()
            }
        });

        console.log(chalk.green('\n--- RESULT ---'));
        console.log(chalk.white(JSON.stringify(result, null, 2)));
        console.log(chalk.green('--------------\n'));

        if (result && result.successCount > 0) {
            console.log(chalk.green.bold('✅ Successfully sent at least one push! Check your device.'));
        } else {
            console.log(chalk.red.bold('❌ Failed to send push. Check the server logs (pm2 logs) for failure details.'));
        }

    } catch (error) {
        console.error(chalk.red('Test failed:'), error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testPush();
