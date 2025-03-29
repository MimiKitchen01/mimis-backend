import Notification from '../models/notification.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

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
