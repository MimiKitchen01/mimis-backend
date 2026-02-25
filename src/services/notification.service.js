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


const migrateOldTokenFormat = (tokens) => {
  // Convert old string format tokens to new object format
  if (!tokens || !Array.isArray(tokens)) return [];

  return tokens.map(t => {
    if (typeof t === 'string') {
      // Old format: string token
      logger.info(`🔄 Migrating old token format: ${t.substring(0, 10)}...`);
      return {
        token: t,
        platform: 'android', // Assume android for legacy tokens
        createdAt: new Date(),
        lastUsed: new Date()
      };
    }
    // Already in new format, but ensure it's valid
    if (t && typeof t === 'object' && t.token) {
      return t;
    }
    // Filter out invalid items later
    return null;
  }).filter(t => t !== null);
};

export const updateFCMToken = async (userId, token, action = 'add', platform = 'android') => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`Attempted to update FCM token for non-existent user: ${userId}`);
      throw new ApiError(404, 'User not found');
    }

    // Migrate old token format if needed
    if (user.fcmTokens && user.fcmTokens.length > 0) {
      const migratedTokens = migrateOldTokenFormat(user.fcmTokens);
      // Check if migration happened
      if (JSON.stringify(user.fcmTokens) !== JSON.stringify(migratedTokens)) {
        user.fcmTokens = migratedTokens;
        await user.save();
        logger.info(`✅ Migrated ${user.fcmTokens.length} tokens for user ${userId} to new format`);
      }
    }

    // Ensure fcmTokens is initialized and clean
    if (!user.fcmTokens || !Array.isArray(user.fcmTokens)) {
      user.fcmTokens = [];
    } else {
      // Filter out any corrupted entries (missing token) to prevent validation errors
      const originalCount = user.fcmTokens.length;
      user.fcmTokens = user.fcmTokens.filter(t => t && (typeof t === 'string' || t.token));
      if (user.fcmTokens.length !== originalCount) {
        logger.warn(`🧹 Cleaned up ${originalCount - user.fcmTokens.length} corrupted FCM token entries for user ${userId}`);
      }
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
          tokenEntry.platform = platform; // Update platform if changed
          await user.save();
          logger.info(`🔄 FCM token already exists for user ${userId}, updated lastUsed and platform`);
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

    // Return simplified token list for response - handle both old and new formats safely
    return (user.fcmTokens || []).map(t => {
      if (!t) return null;
      const tokenStr = typeof t === 'string' ? t : t.token;
      if (!tokenStr) return null;

      return {
        token: tokenStr.substring(0, 10) + '...',
        platform: typeof t === 'string' ? 'unknown' : (t.platform || 'unknown'),
        lastUsed: typeof t === 'string' ? null : (t.lastUsed || null)
      };
    }).filter(t => t !== null);
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

    // Migrate old token format if needed
    if (user.fcmTokens && user.fcmTokens.length > 0) {
      const firstToken = user.fcmTokens[0];
      if (typeof firstToken === 'string') {
        const migratedTokens = migrateOldTokenFormat(user.fcmTokens);
        user.fcmTokens = migratedTokens;
        await user.save();
        logger.info(`✅ Migrated ${user.fcmTokens.length} tokens for user ${userId} to new format before sending`);
      }
    }

    // Collect all tokens regardless of platform
    const allTokens = user.fcmTokens
      .map(t => (typeof t === 'string' ? t : t.token))
      .filter(Boolean);

    if (allTokens.length === 0) {
      logger.info(`No valid FCM tokens found for user ${user.email} (${userId})`);
      return null;
    }

    logger.debug(`Sending unified push to ${allTokens.length} tokens for user ${user.email}`);

    const baseData = Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {});

    // Construct a single message with all platform-specific overrides
    // FCM will apply the correct block based on the individual device type
    const message = {
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
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert'
        },
        payload: {
          aps: {
            alert: { title, body }, // Correct structure for alert
            badge: 1,
            sound: 'default',
            'content-available': 0,
            'mutable-content': 1,
            'custom-data': baseData
          }
        }
      },
      webpush: {
        headers: { TTL: '86400' },
        data: baseData,
        notification: {
          title,
          body,
          icon: 'https://www.example.com/icon-192x192.png'
        }
      },
      tokens: allTokens
    };

    let totalSuccess = 0;
    let totalFailure = 0;
    const failedTokens = [];

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info(`✅ Push summary: ${response.successCount} sent, ${response.failureCount} failed`);

      totalSuccess = response.successCount;
      totalFailure = response.failureCount;

      // Identify invalid tokens
      response.responses.forEach((res, idx) => {
        if (!res.success && res.error) {
          const errorCode = res.error?.code;
          if (['messaging/invalid-registration-token', 'messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(errorCode)) {
            failedTokens.push(allTokens[idx]);
            logger.warn(`⚠️ Removing invalid token: ${errorCode}`);
          }
        }
      });

      // Remove failed tokens using correct syntax
      if (failedTokens.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { token: { $in: failedTokens } } }
        });
        logger.info(`🧹 Cleaned up ${failedTokens.length} invalid tokens for user ${userId}`);
      }

      return {
        successCount: totalSuccess,
        failureCount: totalFailure,
        totalSent: totalSuccess + totalFailure,
        responses: response.responses
      };
    } catch (error) {
      logger.error('Multicast push failed:', error);
      return { successCount: 0, failureCount: allTokens.length, error: error.message };
    }
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
