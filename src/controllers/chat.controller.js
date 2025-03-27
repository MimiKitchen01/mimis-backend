import * as chatService from '../services/chat.service.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const initializeChat = async (req, res) => {
  try {
    const { userId, fullName, role } = req.user;

    // Prevent admins from initiating chats
    if (role === 'admin') {
      throw new ApiError(403, 'Admins cannot initiate customer support chats');
    }

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
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};

export const joinCustomerChat = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can join customer chats');
    }

    const { channelId } = req.params;
    const chatState = await chatService.joinCustomerChat(req.user.userId, channelId);

    res.json({
      message: 'Joined customer chat successfully',
      chatState
    });
  } catch (error) {
    logger.error(chalk.red('❌ Failed to join chat:'), error);
    res.status(error.statusCode || 500).json({
      message: error.message
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

export const getActiveCustomers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can access customer list');
    }

    const customers = await chatService.getActiveCustomers();

    res.json({
      message: 'Active customers retrieved successfully',
      customers,
      total: customers.length
    });
  } catch (error) {
    logger.error(chalk.red('❌ Failed to get active customers:'), error);
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};

export const getCustomerChatHistory = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can access chat history');
    }

    const { customerId } = req.params;
    const history = await chatService.getCustomerChatHistory(customerId);

    res.json({
      message: 'Chat history retrieved successfully',
      history
    });
  } catch (error) {
    logger.error(chalk.red('❌ Failed to get chat history:'), error);
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};
