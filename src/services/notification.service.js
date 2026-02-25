import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import admin from '../config/firebase.config.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Existing Notification Logic (Database-driven)
 */

export const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    // Here you would integrate with WebSocket/Socket.io for real-time notifications
    return notification;
  } catch (error) {
    logger.error(chalk.red('Error creating notification:'), error);
    throw error;
  }
};

export const getUserNotifications = async (userId, query = {}) => {
  try {
    const { page = 1, limit = 10, isRead } = query;
    const filter = { user: userId };

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('orderId');

    const total = await Notification.countDocuments(filter);

    return {
      notifications,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    logger.error(chalk.red('Error fetching notifications:'), error);
    throw error;
  }
};

export const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return notification;
};

export const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true }
  );
};

export const deleteNotification = async (userId, notificationId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    user: userId
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return notification;
};

export const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({
    user: userId,
    isRead: false
  });
};

export const getLatestNotifications = async (userId, limit = 5) => {
  return await Notification.find({ user: userId })
    .sort('-createdAt')
    .limit(limit)
    .populate('orderId');
};

export const getNotificationsByType = async (userId, type) => {
  return await Notification.find({
    user: userId,
    type
  })
    .sort('-createdAt')
    .populate('orderId');
};

export const clearAllReadNotifications = async (userId) => {
  const result = await Notification.deleteMany({
    user: userId,
    isRead: true
  });
  return result.deletedCount;
};

/**
 * FCM Push Notification Logic
 */

const isValidFCMToken = (token) => {
  // Real FCM tokens are usually long and contains specific characters (like : or -)
  // We want to block the 64-char hex strings that were causing issues
  if (!token || typeof token !== 'string') return false;

  // Reject simple hex strings (common mistake with device IDs or legacy push tokens)
  if (/^[a-f0-9]{64}$/i.test(token)) return false;

  // Basic length check (FCM tokens are generally > 100 chars)
  if (token.length < 30) return false;

  return true;
};

const isValidPlatform = (platform) => {
  return ['ios', 'android', 'web'].includes(platform);
};


export const updateFCMToken = async (userId, token, action = 'add', platform = 'android') => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`Attempted to update FCM token for non-existent user: ${userId}`);
      throw new ApiError(404, 'User not found');
    }

    // Ensure fcmTokens is initialized
    if (!user.fcmTokens) {
      user.fcmTokens = [];
    }

    if (!isValidPlatform(platform)) {
      throw new ApiError(400, `Invalid platform: ${platform}. Must be 'ios', 'android', or 'web'`);
    }

    if (action === 'add') {
      if (!isValidFCMToken(token)) {
        logger.warn(`Rejected malformed FCM token for user ${userId}: ${token.substring(0, 10)}...`);
        throw new ApiError(400, 'Invalid FCM token format');
      }

      // Check if token already exists
      const tokenExists = user.fcmTokens.some(t => t.token === token);
      
      if (!tokenExists) {
        user.fcmTokens.push({
          token,
          platform,
          createdAt: new Date(),
          lastUsed: new Date()
        });
        await user.save();
        logger.info(`✅ Added FCM token for user ${userId} (${platform}). Total tokens: ${user.fcmTokens.length}`);
      } else {
        // Update lastUsed for existing token
        const tokenEntry = user.fcmTokens.find(t => t.token === token);
        if (tokenEntry) {
          tokenEntry.lastUsed = new Date();
          await user.save();
          logger.info(`🔄 FCM token already exists for user ${userId}, updated lastUsed`);
        }
      }
    } else if (action === 'remove') {
      const initialCount = user.fcmTokens.length;
      user.fcmTokens = user.fcmTokens.filter(t => t.token !== token);
      if (user.fcmTokens.length !== initialCount) {
        await user.save();
        logger.info(`🗑️ Removed FCM token for user ${userId}. Total tokens remaining: ${user.fcmTokens.length}`);
      }
    }

    // Return simplified token list for response
    return user.fcmTokens.map(t => ({ token: t.token.substring(0, 10) + '...', platform: t.platform, lastUsed: t.lastUsed }));
  } catch (error) {
    logger.error('Error updating FCM token:', error);
    throw error;
  }
};

export const sendPushNotification = async (userId, { title, body, data = {} }) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`Could not send push: User ${userId} not found`);
      return null;
    }

    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      logger.info(`No FCM tokens found for user ${user.email} (${userId})`);
      return null;
    }

    // Separate tokens by platform
    const iosTokens = user.fcmTokens.filter(t => t.platform === 'ios').map(t => t.token);
    const androidTokens = user.fcmTokens.filter(t => t.platform === 'android').map(t => t.token);
    const webTokens = user.fcmTokens.filter(t => t.platform === 'web').map(t => t.token);

    const allTokens = [...iosTokens, ...androidTokens, ...webTokens];
    logger.debug(`Sending push to ${allTokens.length} tokens: iOS=${iosTokens.length}, Android=${androidTokens.length}, Web=${webTokens.length} for user ${user.email}`);

    const baseData = Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {});

    // Message for iOS (APNs)
    const iosMessage = {
      notification: { title, body },
      data: { ...baseData, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      apns: {
        headers: {
          'apns-priority': '10', // High priority for immediate delivery
          'apns-push-type': 'alert' // Alert type for user-visible notifications
        },
        payload: {
          aps: {
            alert: {
              title,
              body,
              sound: 'default'
            },
            badge: 1,
            sound: 'default',
            'content-available': 0, // Not a silent notification
            'mutable-content': 1, // Allow notification modification
            'custom-data': baseData
          }
        }
      },
      tokens: iosTokens
    };

    // Message for Android
    const androidMessage = {
      notification: { title, body },
      data: { ...baseData, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          defaultVibrateTimings: true,
          defaultLightSettings: true
        }
      },
      tokens: androidTokens
    };

    // Message for Web
    const webMessage = {
      notification: { title, body },
      data: { ...baseData, click_action: 'FCM_PLUGIN_ACTIVITY' },
      webpush: {
        headers: {
          TTL: '86400'
        },
        data: baseData,
        notification: {
          title,
          body,
          icon: 'https://www.example.com/icon-192x192.png'
        }
      },
      tokens: webTokens
    };

    let totalSuccess = 0;
    let totalFailure = 0;
    const failedTokens = [];
    const responses = [];

    // Send to iOS devices
    if (iosTokens.length > 0) {
      try {
        logger.info(`📱 Sending iOS APNs push to ${iosTokens.length} devices...`);
        const iosResponse = await admin.messaging().sendEachForMulticast(iosMessage);
        logger.info(`✅ iOS: ${iosResponse.successCount} sent, ${iosResponse.failureCount} failed`);
        
        totalSuccess += iosResponse.successCount;
        totalFailure += iosResponse.failureCount;
        responses.push({ platform: 'ios', ...iosResponse });

        // Handle iOS failures
        iosResponse.responses.forEach((res, idx) => {
          if (!res.success && res.error) {
            const errorCode = res.error?.code;
            if (['messaging/invalid-registration-token', 'messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(errorCode)) {
              failedTokens.push(iosTokens[idx]);
              logger.warn(`⚠️ iOS token removed due to: ${errorCode}`);
            }
          }
        });
      } catch (error) {
        logger.error('iOS push failed:', error);
        totalFailure += iosTokens.length;
      }
    }

    // Send to Android devices
    if (androidTokens.length > 0) {
      try {
        logger.info(`🤖 Sending Android push to ${androidTokens.length} devices...`);
        const androidResponse = await admin.messaging().sendEachForMulticast(androidMessage);
        logger.info(`✅ Android: ${androidResponse.successCount} sent, ${androidResponse.failureCount} failed`);
        
        totalSuccess += androidResponse.successCount;
        totalFailure += androidResponse.failureCount;
        responses.push({ platform: 'android', ...androidResponse });

        // Handle Android failures
        androidResponse.responses.forEach((res, idx) => {
          if (!res.success && res.error) {
            const errorCode = res.error?.code;
            if (['messaging/invalid-registration-token', 'messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(errorCode)) {
              failedTokens.push(androidTokens[idx]);
              logger.warn(`⚠️ Android token removed due to: ${errorCode}`);
            }
          }
        });
      } catch (error) {
        logger.error('Android push failed:', error);
        totalFailure += androidTokens.length;
      }
    }

    // Send to Web devices
    if (webTokens.length > 0) {
      try {
        logger.info(`🌐 Sending Web push to ${webTokens.length} devices...`);
        const webResponse = await admin.messaging().sendEachForMulticast(webMessage);
        logger.info(`✅ Web: ${webResponse.successCount} sent, ${webResponse.failureCount} failed`);
        
        totalSuccess += webResponse.successCount;
        totalFailure += webResponse.failureCount;
        responses.push({ platform: 'web', ...webResponse });

        // Handle Web failures
        webResponse.responses.forEach((res, idx) => {
          if (!res.success && res.error) {
            const errorCode = res.error?.code;
            if (['messaging/invalid-registration-token', 'messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(errorCode)) {
              failedTokens.push(webTokens[idx]);
              logger.warn(`⚠️ Web token removed due to: ${errorCode}`);
            }
          }
        });
      } catch (error) {
        logger.error('Web push failed:', error);
        totalFailure += webTokens.length;
      }
    }

    // Remove failed tokens
    if (failedTokens.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { 'fcmTokens.token': { $in: failedTokens } }
      });
      logger.info(`🧹 Removed ${failedTokens.length} expired/invalid tokens for user ${userId}`);
    }

    logger.info(`📊 Push notification summary for user ${userId}: ✅ ${totalSuccess} | ❌ ${totalFailure}`);

    return {
      successCount: totalSuccess,
      failureCount: totalFailure,
      totalSent: totalSuccess + totalFailure,
      responses
    };
  } catch (error) {
    logger.error('Error sending push notification:', error);
    return null;
  }
};

export const sendPushToTopic = async (topic, { title, body, data = {} }) => {
  try {
    const message = {
      notification: { title, body },
      data: Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {}),
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default',
          },
        },
      },
      topic,
    };


    const response = await admin.messaging().send(message);
    logger.info(`Successfully sent push message to topic ${topic}: ${response}`);
    return response;
  } catch (error) {
    logger.error(`Error sending push notification to topic ${topic}:`, error);
    return null;
  }
};
export const notifyAdmins = async ({ title, body, data = {} }) => {
  try {
    const admins = await User.find({ role: 'admin' });
    if (!admins || admins.length === 0) {
      logger.info('No admins found to notify');
      return [];
    }

    const responses = await Promise.all(
      admins.map(adminUser =>
        sendPushNotification(adminUser._id, { title, body, data })
      )
    );

    logger.info(`Notified ${admins.length} admins of: ${title}`);
    return responses;
  } catch (error) {
    logger.error('Error notifying admins:', error);
    return [];
  }
};
