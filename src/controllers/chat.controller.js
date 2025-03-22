import * as chatService from '../services/chat.service.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const initializeChat = async (req, res) => {
  try {
    const { userId, fullName } = req.user;

    logger.info(chalk.blue('📱 Chat initialization request:'), {
      userId: chalk.cyan(userId),
      userName: chalk.yellow(fullName)
    });

    const chatData = await chatService.initializeCustomerChat(userId, fullName);

    res.json({
      message: 'Chat initialized successfully',
      ...chatData
    });
  } catch (error) {
    logger.error(chalk.red('❌ Chat initialization failed:'), error);
    res.status(500).json({
      message: 'Failed to initialize chat',
      error: error.message
    });
  }
};

export const initializeAdminChat = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can access support chat');
    }

    const chatData = await chatService.initializeAdminChat(
      req.user.userId,
      req.user.fullName
    );

    res.json({
      message: 'Admin chat initialized successfully',
      ...chatData
    });
  } catch (error) {
    logger.error(chalk.red('❌ Admin chat initialization failed:'), error);
    res.status(error.statusCode || 500).json({
      message: 'Failed to initialize admin chat',
      error: error.message
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { channelId, message } = req.body;

    const result = await chatService.sendAdminMessage(
      req.user.userId,
      channelId,
      message
    );

    res.json({
      message: 'Message sent successfully',
      ...result
    });
  } catch (error) {
    logger.error(chalk.red('❌ Failed to send message:'), error);
    res.status(500).json({ message: error.message });
  }
};

export const getSupportHistory = async (req, res) => {
  try {
    const channels = await chatService.getSupportChannels(req.user.userId);
    res.json({ channels });
  } catch (error) {
    logger.error(chalk.red('❌ Failed to get support history:'), error);
    res.status(500).json({ message: error.message });
  }
};
