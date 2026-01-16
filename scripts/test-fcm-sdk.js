import admin from '../src/config/firebase.config.js';
import * as notificationService from '../src/services/notification.service.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * This script tests if the Firebase Admin SDK is correctly initialized
 * and can communicate with Firebase by sending a message to a dummy topic.
 */
async function testFCM() {
    console.log('🚀 Starting FCM Test...');

    // Check environment variables first
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.error('❌ Error: Missing Firebase environment variables in .env');
        process.exit(1);
    }

    try {
        console.log('📡 Sending test notification to topic "test-topic"...');

        // We use sendPushToTopic because it doesn't require a valid device token or database user
        const response = await notificationService.sendPushToTopic('test-topic', {
            title: 'Hello from Mimi\'s Kitchen!',
            body: 'FCM integration is working correctly if you see a success message.'
        });

        if (response) {
            console.log('✅ FCM Test Successful!');
            console.log('Response ID:', response);
        } else {
            console.log('❌ FCM Test Failed: No response received. Check your credentials.');
        }

    } catch (error) {
        console.error('❌ FCM Test Failed with error:');
        console.error(error);
    } finally {
        // Force exit if there are hanging connections (like Mongoose if it was used)
        process.exit(0);
    }
}

testFCM();
