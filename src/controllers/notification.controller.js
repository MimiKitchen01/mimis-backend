import * as notificationService from '../services/notification.service.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const getNotifications = async (req, res) => {
  try {
    const result = await notificationService.getUserNotifications(
      req.user.userId,
      req.query
    );

    res.json({
      status: 'success',
      ...result
    });
  } catch (error) {
    logger.error(chalk.red('Failed to fetch notifications:'), error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(
      req.user.userId,
      req.params.id
    );

    res.json({
      status: 'success',
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    logger.error(chalk.red('Failed to mark notification as read:'), error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.userId);
    res.json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error(chalk.red('Failed to mark all notifications as read:'), error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    await notificationService.deleteNotification(
      req.user.userId,
      req.params.id
    );
    res.json({
      status: 'success',
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger.error(chalk.red('Failed to delete notification:'), error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.userId);
    res.json({
      status: 'success',
      count
    });
  } catch (error) {
    logger.error(chalk.red('Failed to get unread count:'), error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getLatestNotifications = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const notifications = await notificationService.getLatestNotifications(
      req.user.userId,
      parseInt(limit)
    );
    res.json({
      status: 'success',
      notifications
    });
  } catch (error) {
    logger.error(chalk.red('Failed to get latest notifications:'), error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getNotificationsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const notifications = await notificationService.getNotificationsByType(
      req.user.userId,
      type
    );
    res.json({
      status: 'success',
      notifications
    });
  } catch (error) {
    logger.error(chalk.red('Failed to get notifications by type:'), error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const clearAllReadNotifications = async (req, res) => {
  try {
    await notificationService.clearAllReadNotifications(req.user.userId);
    res.json({
      status: 'success',
      message: 'All read notifications cleared'
    });
  } catch (error) {
    logger.error(chalk.red('Failed to clear notifications:'), error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const updateFCMToken = async (req, res) => {
  try {
    const { token, action = 'add', platform = 'android' } = req.body;
    if (!token) {
      res.status(400).json({ status: 'error', message: 'FCM token is required' });
      return;
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      res.status(400).json({ status: 'error', message: 'Platform must be one of: ios, android, web' });
      return;
    }

    const tokens = await notificationService.updateFCMToken(
      req.user.userId,
      token,
      action,
      platform
    );

    res.json({
      status: 'success',
      message: `Token ${action === 'remove' ? 'removed' : 'added'} successfully for ${platform}`,
      tokensRegistered: tokens.length,
      tokens
    });
  } catch (error) {
    logger.error(chalk.red('Failed to update FCM token:'), error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const testPushToUser = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    const response = await notificationService.sendPushNotification(userId || req.user.userId, {
      title: title || 'Mimi\'s Kitchen Test',
      body: body || 'This is a test notification to verify your connection',
      data: data || { test: 'true' }
    });

    res.json({
      status: 'success',
      message: 'Push test triggered',
      tokenCount: response?.responses?.length || 0,
      successCount: response?.successCount || 0,
      failureCount: response?.failureCount || 0,
      details: response?.responses?.map(r => r.success ? 'success' : r.error?.message)
    });
  } catch (error) {
    logger.error('Push test failed:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
