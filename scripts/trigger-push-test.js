import 'dotenv/config';
import mongoose from 'mongoose';
import * as notificationService from '../src/services/notification.service.js';

async function triggerTestPush() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const userId = '696aaed02887bf1523a6a642'; // starukido's ID from logs
        console.log(`Triggering test push for user ${userId}...`);

        const result = await notificationService.sendPushNotification(userId, {
            title: 'Mimi\'s Kitchen - Connection Test',
            body: 'If you see this, your push notification integration is 100% working!',
            data: { source: 'backend_test_script' }
        });

        if (result) {
            console.log('✅ Push trigger function finished.');
            console.log('Success Count:', result.successCount);
            console.log('Failure Count:', result.failureCount);
            if (result.failureCount > 0) {
                console.log('Errors:', result.responses.map(r => r.error?.message).filter(Boolean));
            }
        } else {
            console.log('❌ No result from push service. Check logs.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

triggerTestPush();
