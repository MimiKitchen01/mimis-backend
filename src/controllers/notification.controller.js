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
