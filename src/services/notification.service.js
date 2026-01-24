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


export const updateFCMToken = async (userId, token, action = 'add') => {
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

    if (action === 'add') {
      if (!isValidFCMToken(token)) {
        logger.warn(`Rejected malformed FCM token for user ${userId}: ${token.substring(0, 10)}...`);
        throw new ApiError(400, 'Invalid FCM token format');
      }

      if (!user.fcmTokens.includes(token)) {

        user.fcmTokens.push(token);
        await user.save();
        logger.info(`Added FCM token for user ${userId}. Total tokens: ${user.fcmTokens.length}`);
      } else {
        logger.info(`FCM token already exists for user ${userId}`);
      }
    } else if (action === 'remove') {
      const initialCount = user.fcmTokens.length;
      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
      if (user.fcmTokens.length !== initialCount) {
        await user.save();
        logger.info(`Removed FCM token for user ${userId}. Total tokens remaining: ${user.fcmTokens.length}`);
      }
    }


    return user.fcmTokens;
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

    logger.debug(`Sending push to ${user.fcmTokens.length} tokens for user ${user.email}`);


    const message = {
      notification: { title, body },
      data: Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = String(value); // FCM values must be strings
        return acc;
      }, {
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Maintain legacy support
      }),
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
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
      tokens: user.fcmTokens,
    };

    logger.info(`📡 Sending FCM message to user ${userId}:`, JSON.stringify(message, null, 2));
    const response = await admin.messaging().sendEachForMulticast(message);


    logger.info(`Successfully sent ${response.successCount} push messages to user ${userId}`);

    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const token = user.fcmTokens[idx];
          const error = res.error?.message || 'Unknown error';
          const errorCode = res.error?.code || 'unknown';
          logger.warn(`Push failed for token ${token.substring(0, 10)}... : [${errorCode}] ${error}`);


          // Only remove if it's a permanent failure
          if (res.error?.code === 'messaging/invalid-registration-token' ||
            res.error?.code === 'messaging/registration-token-not-registered' ||
            res.error?.code === 'messaging/invalid-argument' ||
            res.error?.code === 'messaging/third-party-auth-error') {
            failedTokens.push(token);
          }


        }
      });

      if (failedTokens.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { $in: failedTokens } }
        });
        logger.info(`Removed ${failedTokens.length} expired/invalid tokens for user ${userId}`);
      }
    }


    return response;
  } catch (error) {
    logger.error('Error sending push notification:', error);
    // Don't throw here to avoid failing the main process (e.g., order creation)
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
